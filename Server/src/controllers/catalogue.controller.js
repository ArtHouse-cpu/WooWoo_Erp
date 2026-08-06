import Product from '../models/product.model.js';
import Space from '../models/space.model.js';
import Food from '../models/food.model.js';
import {computeStockByProductNames} from '../utils/inventoryStock.utils.js';

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
 * - Parent row when parent fields match (or no search / no variants).
 * - Variant rows as "Parent - Variant" so billing can search/select by variant name.
 */
const expandProductCatalogueRows = (product, searchRegex, stockQty) => {
  const parentName = String(product.productName ?? '').trim();
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const isCsp = Boolean(product.isCsp);
  const parentHit = parentMatchesSearch(product, searchRegex);
  const rows = [];

  const base = {
    sourceId: product._id,
    sourceType: 'product',
    parentProductName: parentName,
    stockQty,
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
      sellingPrice: Number(variant.sellingPrice ?? product.sellingPrice ?? 0),
      purchasePrice: Number(variant.purchasePrice ?? product.purchasePrice ?? 0),
      barcode: String(variant.barcode ?? ''),
    });
  };

  // Empty search / browse: keep parent-only rows (avoid exploding the grid).
  if (!searchRegex) {
    pushParent();
    return rows;
  }

  // Parent matched → parent + all variants (so billing can pick B or C from A).
  if (parentHit) {
    pushParent();
    variants.forEach(pushVariant);
    return rows;
  }

  // Only variant name/barcode matched → show those variant rows.
  variants.filter((v) => variantMatchesSearch(v, searchRegex)).forEach(pushVariant);
  return rows;
};

/**
 * Unified catalogue lookup across products, services, spaces, and foods.
 * GET /catalogue/lookup?search=
 */
export const lookupCatalogueItems = async (req, res) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const limitPerType = Math.min(Number(req.query.limit ?? 25) || 25, 50);
    const searchRegex = search ? new RegExp(escapeRegex(search), 'i') : null;

    const productSearch = searchRegex
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
      : {};

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

    const [productDocsRaw, spaceDocs, foodDocs] = await Promise.all([
      Product.find(productSearch).sort({createdAt: -1}).limit(limitPerType * 2).lean(),
      Space.find(spaceFilter).sort({createdAt: -1}).limit(limitPerType).lean(),
      Food.find(foodFilter).sort({createdAt: -1}).limit(limitPerType).lean(),
    ]);

    const productDocs = [];
    const serviceDocs = [];
    for (const doc of productDocsRaw) {
      const isService = doc.itemType === 'service' || doc.type === 'service';
      if (isService) {
        if (serviceDocs.length < limitPerType) serviceDocs.push(doc);
      } else if (productDocs.length < limitPerType) {
        productDocs.push(doc);
      }
    }

    const productNames = productDocs
      .map((p) => String(p.productName ?? '').trim())
      .filter(Boolean);
    const stockMap = await computeStockByProductNames({names: productNames});

    const products = productDocs.flatMap((product) => {
      const name = String(product.productName ?? '').trim();
      const stockQty = Number(stockMap.get(name) ?? product.stockQty ?? 0);
      return expandProductCatalogueRows(product, searchRegex, stockQty);
    });

    const services = serviceDocs.map((service) => {
      const name = String(
        service.serviceName || service.productName || '',
      ).trim();
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
    });

    const spaces = spaceDocs.map((space) => ({
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
    }));

    // Restaurant foods are made to order — availability is status, not stock qty
    const foods = foodDocs.map((food) => ({
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
    }));

    const items = [...products, ...services, ...spaces, ...foods].sort((a, b) =>
      String(a.name).localeCompare(String(b.name)),
    );

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
    });
  } catch (error) {
    console.error('lookupCatalogueItems error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to lookup catalogue items.',
    });
  }
};
