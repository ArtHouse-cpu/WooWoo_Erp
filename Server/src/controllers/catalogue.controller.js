import Product from '../models/product.model.js';
import Space from '../models/space.model.js';
import Food from '../models/food.model.js';
import {computeStockByProductNames, getProductStockNames} from '../utils/inventoryStock.utils.js';

const escapeRegex = (value) =>
  String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const variantMatchesSearch = (variant, searchRegex) => {
  if (!searchRegex) return true;
  const name = String(variant?.name ?? '');
  const barcode = String(variant?.barcode ?? '');
  return searchRegex.test(name) || searchRegex.test(barcode);
};

const parentMatchesSearch = (product, searchRegex) => {
  if (!searchRegex) return true;
  return (
    searchRegex.test(String(product.productName ?? '')) ||
    searchRegex.test(String(product.serviceName ?? '')) ||
    searchRegex.test(String(product.itemCode ?? '')) ||
    searchRegex.test(String(product.barCode ?? ''))
  );
};

/**
 * Expand a product into catalogue rows.
 * Products WITH variants → only variant rows as "Parent - Variant".
 * Products WITHOUT variants → single parent row.
 * stockByName: Map of line name → live stock (parent and each "Parent - Variant").
 */
const expandProductCatalogueRows = (product, searchRegex, stockByName) => {
  const parentName = String(product.productName ?? '').trim();
  const variants = Array.isArray(product.variants)
    ? product.variants.filter((v) => String(v?.name ?? '').trim())
    : [];
  const isCsp = Boolean(product.isCsp);
  const parentHit = parentMatchesSearch(product, searchRegex);
  const rows = [];

  const stockFor = (lineName) => {
    if (!stockByName) return 0;
    const exact = stockByName.get(lineName);
    if (exact != null) return Number(exact) || 0;
    const lower = stockByName.get(String(lineName).toLowerCase());
    return Number(lower) || 0;
  };

  const base = {
    sourceId: product._id,
    sourceType: 'product',
    parentProductName: parentName,
    trackStock: true,
    category: product.category || 'General',
    lineCategory: 'product',
    imageUrl: product.imageUrl || product.images?.[0] || null,
    unit: product.primaryUnit || '',
    discountType: product.discountType || 'flat',
    discountValue: Number(product.discountValue ?? 0),
    isCsp,
    cspLabel: isCsp ? 'CSP' : null,
  };

  const pushParent = () => {
    rows.push({
      ...base,
      _id: String(product._id),
      name: parentName,
      productName: parentName,
      variantName: null,
      stockQty: stockFor(parentName),
      sellingPrice: Number(product.sellingPrice ?? 0),
      purchasePrice: Number(product.purchasePrice ?? 0),
    });
  };

  const pushVariant = (variant) => {
    const variantName = String(variant?.name ?? '').trim();
    if (!variantName) return;
    const displayName = `${parentName} - ${variantName}`;
    rows.push({
      ...base,
      _id: `${String(product._id)}::${variantName}`,
      name: displayName,
      productName: displayName,
      variantName,
      stockQty: stockFor(displayName),
      sellingPrice: Number(variant.sellingPrice ?? product.sellingPrice ?? 0),
      purchasePrice: Number(variant.purchasePrice ?? product.purchasePrice ?? 0),
      barcode: String(variant.barcode ?? ''),
    });
  };

  if (variants.length === 0) {
    if (!searchRegex || parentHit) pushParent();
    return rows;
  }

  if (!searchRegex || parentHit) {
    variants.forEach(pushVariant);
    return rows;
  }

  variants.filter((v) => variantMatchesSearch(v, searchRegex)).forEach(pushVariant);
  return rows;
};

const mapService = (service) => {
  const name = String(service.serviceName || service.productName || '').trim();
  return {
    _id: service._id,
    sourceId: service._id,
    sourceType: 'service',
    name,
    productName: name,
    sellingPrice: Number(service.sellingPrice ?? 0),
    purchasePrice: Number(service.purchasePrice ?? service.sellingPrice ?? 0),
    stockQty: null,
    trackStock: false,
    category: service.category || 'Services',
    lineCategory: 'service',
    imageUrl: service.imageUrl || service.images?.[0] || null,
    unit: service.primaryUnit || '',
    discountType: service.discountType || 'flat',
    discountValue: Number(service.discountValue ?? 0),
  };
};

const mapSpace = (space) => ({
  _id: space._id,
  sourceId: space._id,
  sourceType: 'space',
  name: String(space.name ?? '').trim(),
  productName: String(space.name ?? '').trim(),
  sellingPrice: Number(space.price ?? 0),
  stockQty: null,
  trackStock: false,
  category: space.category || 'Space',
  lineCategory: 'space',
  imageUrl: space.imageUrl || null,
  unit: 'Hour',
  status: space.status,
  capacity: space.capacity,
  discountType: 'flat',
  discountValue: 0,
});

const mapFood = (food) => ({
  _id: food._id,
  sourceId: food._id,
  sourceType: 'food',
  name: String(food.name ?? '').trim(),
  productName: String(food.name ?? '').trim(),
  sellingPrice: Number(food.price ?? 0),
  stockQty: null,
  trackStock: false,
  category: food.category || 'Food',
  lineCategory: 'food',
  imageUrl: food.imageUrl || null,
  unit: food.unit || 'Plate',
  isVeg: food.isVeg !== false,
  status: food.status || 'Active',
  discountType: 'flat',
  discountValue: 0,
});

/**
 * Unified catalogue lookup across products, services, spaces, and foods.
 * GET /catalogue/lookup?search=&limit=&page=&sourceType=
 *
 * Paginate parent products (variants expand after). Default page size 48.
 */
export const lookupCatalogueItems = async (req, res) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 48, 1), 100);
    const skip = (page - 1) * limit;
    const sourceType = String(req.query.sourceType || 'all')
      .trim()
      .toLowerCase();
    const searchRegex = search ? new RegExp(escapeRegex(search), 'i') : null;

    const textSearch = searchRegex
      ? {
          $or: [
            {productName: searchRegex},
            {serviceName: searchRegex},
            {itemCode: searchRegex},
            {barCode: searchRegex},
            {'variants.name': searchRegex},
            {'variants.barcode': searchRegex},
          ],
        }
      : null;

    const productFilter = {
      type: {$ne: 'service'},
      itemType: {$ne: 'service'},
      ...(textSearch || {}),
    };

    const serviceFilter = {
      $or: [{type: 'service'}, {itemType: 'service'}],
      ...(textSearch || {}),
    };

    const spaceFilter = searchRegex
      ? {
          $or: [
            {name: searchRegex},
            {category: searchRegex},
            {description: searchRegex},
          ],
        }
      : {};

    const foodFilter = {
      status: {$ne: 'Inactive'},
      ...(searchRegex
        ? {
            $or: [
              {name: searchRegex},
              {category: searchRegex},
              {description: searchRegex},
            ],
          }
        : {}),
    };

    const wantProducts = sourceType === 'all' || sourceType === 'product';
    const wantServices = sourceType === 'all' || sourceType === 'service';
    const wantSpaces = sourceType === 'all' || sourceType === 'space';
    const wantFoods = sourceType === 'all' || sourceType === 'food';

    // For "all", only page products; include other types on page 1 only.
    const includeAuxOnThisPage = sourceType !== 'all' || page === 1;
    const auxLimit = sourceType === 'all' ? Math.min(limit, 24) : limit;
    const auxSkip = sourceType === 'all' ? 0 : skip;

    const tasks = [];

    if (wantProducts) {
      tasks.push(
        Product.countDocuments(productFilter),
        Product.find(productFilter)
          .sort({createdAt: -1})
          .skip(skip)
          .limit(limit)
          .lean(),
      );
    } else {
      tasks.push(Promise.resolve(0), Promise.resolve([]));
    }

    if (wantServices && includeAuxOnThisPage) {
      tasks.push(
        Product.countDocuments(serviceFilter),
        Product.find(serviceFilter)
          .sort({createdAt: -1})
          .skip(auxSkip)
          .limit(auxLimit)
          .lean(),
      );
    } else {
      tasks.push(Promise.resolve(0), Promise.resolve([]));
    }

    if (wantSpaces && includeAuxOnThisPage) {
      tasks.push(
        Space.countDocuments(spaceFilter),
        Space.find(spaceFilter)
          .sort({createdAt: -1})
          .skip(auxSkip)
          .limit(auxLimit)
          .lean(),
      );
    } else {
      tasks.push(Promise.resolve(0), Promise.resolve([]));
    }

    if (wantFoods && includeAuxOnThisPage) {
      tasks.push(
        Food.countDocuments(foodFilter),
        Food.find(foodFilter)
          .sort({createdAt: -1})
          .skip(auxSkip)
          .limit(auxLimit)
          .lean(),
      );
    } else {
      tasks.push(Promise.resolve(0), Promise.resolve([]));
    }

    const [
      productTotal,
      productDocs,
      serviceTotal,
      serviceDocs,
      spaceTotal,
      spaceDocs,
      foodTotal,
      foodDocs,
    ] = await Promise.all(tasks);

    const productNames = [
      ...new Set(productDocs.flatMap((p) => getProductStockNames(p))),
    ];
    const stockMap =
      productNames.length > 0
        ? await computeStockByProductNames({names: productNames})
        : new Map();

    const products = productDocs.flatMap((product) =>
      expandProductCatalogueRows(product, searchRegex, stockMap),
    );

    const services = serviceDocs.map(mapService);
    const spaces = spaceDocs.map(mapSpace);
    const foods = foodDocs.map(mapFood);

    const items = [...products, ...services, ...spaces, ...foods].sort((a, b) =>
      String(a.name).localeCompare(String(b.name)),
    );

    // hasMore tracks the primary paginated collection for the active tab.
    let primaryTotal = productTotal;
    if (sourceType === 'service') primaryTotal = serviceTotal;
    else if (sourceType === 'space') primaryTotal = spaceTotal;
    else if (sourceType === 'food') primaryTotal = foodTotal;
    else if (sourceType === 'all') primaryTotal = productTotal;

    const hasMore = skip + limit < primaryTotal;

    return res.status(200).json({
      success: true,
      message: 'Catalogue lookup successful.',
      items,
      counts: {
        product: products.length,
        service: services.length,
        space: spaces.length,
        food: foods.length,
        total: items.length,
      },
      pagination: {
        page,
        limit,
        skip,
        hasMore,
        total: primaryTotal,
        sourceType,
      },
    });
  } catch (error) {
    console.error('lookupCatalogueItems error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to lookup catalogue items.',
    });
  }
};
