import Product from '../models/product.model.js';
import Category from '../models/category.model.js';
import CustomersailorProgram from '../models/customerSellerProgram.model.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { computeStockByProductNames } from '../utils/inventoryStock.utils.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import mongoose from 'mongoose';

/**
 * Case-insensitive name lookup without giant $regex patterns
 * (MongoDB rejects regex patterns that are too long).
 */
const findByLowerNames = async (Model, field, names, selectFields) => {
  const lowers = [
    ...new Set(
      names
        .map((n) => String(n || '').trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (!lowers.length) return [];

  const CHUNK = 400;
  const results = [];
  for (let i = 0; i < lowers.length; i += CHUNK) {
    const chunk = lowers.slice(i, i + CHUNK);
    const docs = await Model.find({
      $expr: {
        $in: [{ $toLower: `$${field}` }, chunk],
      },
    })
      .select(selectFields)
      .lean();
    results.push(...docs);
  }
  return results;
};

/**
 * Ensure category names exist in Category collection (same as POST /api/categories).
 * Returns Map<lowerName, canonicalName>.
 */
const ensureCategoriesExist = async (names = []) => {
  const unique = [
    ...new Set(
      names
        .map((n) => String(n || '').trim())
        .filter(Boolean),
    ),
  ];
  const nameByLower = new Map();
  if (!unique.length) return nameByLower;

  const existing = await findByLowerNames(Category, 'name', unique, 'name');

  for (const cat of existing) {
    nameByLower.set(String(cat.name).trim().toLowerCase(), cat.name);
  }

  const missing = unique.filter(
    (name) => !nameByLower.has(name.toLowerCase()),
  );

  if (missing.length) {
    try {
      const created = await Category.insertMany(
        missing.map((name) => ({ name })),
        { ordered: false },
      );
      for (const cat of created) {
        nameByLower.set(String(cat.name).trim().toLowerCase(), cat.name);
      }
    } catch (error) {
      // Parallel uploads / unique race — re-read whatever exists now
      const again = await findByLowerNames(Category, 'name', missing, 'name');
      for (const cat of again) {
        nameByLower.set(String(cat.name).trim().toLowerCase(), cat.name);
      }
      // Keep requested casing for any still-missing (shouldn't happen often)
      for (const name of missing) {
        const key = name.toLowerCase();
        if (!nameByLower.has(key)) nameByLower.set(key, name);
      }
      if (error?.code !== 11000 && error?.name !== 'MongoBulkWriteError') {
        console.error('ensureCategoriesExist error:', error);
      }
    }
  }

  return nameByLower;
};

const parseBool = raw => {
  if (typeof raw === 'boolean') return raw;
  const v = String(raw ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'y';
};

const resolveCspFields = async ({ isCspRaw, cspEnrollmentIdRaw }) => {
  const isCsp = parseBool(isCspRaw);
  if (!isCsp) {
    return {
      isCsp: false,
      cspEnrollmentId: null,
      cspCustomerId: null,
      cspVendorId: null,
    };
  }

  const enrollmentId = String(cspEnrollmentIdRaw ?? '').trim();
  if (!enrollmentId || !mongoose.Types.ObjectId.isValid(enrollmentId)) {
    const error = new Error('CSP sailor is required when CSP is Yes.');
    error.status = 400;
    throw error;
  }

  const enrollment = await CustomersailorProgram.findOne({
    _id: enrollmentId,
    status: 'active',
  }).lean();

  if (!enrollment) {
    const error = new Error('Active CSP enrollment not found.');
    error.status = 400;
    throw error;
  }

  return {
    isCsp: true,
    cspEnrollmentId: enrollment._id,
    cspCustomerId: enrollment.customerId || null,
    cspVendorId: enrollment.vendorId || null,
  };
};

const withCspLabel = async products => {
  const list = Array.isArray(products) ? products : [];
  const enrollmentIds = [
    ...new Set(
      list
        .filter(p => p?.isCsp && p?.cspEnrollmentId)
        .map(p => String(p.cspEnrollmentId)),
    ),
  ];

  let enrollmentMap = new Map();
  if (enrollmentIds.length) {
    const rows = await CustomersailorProgram.find({
      _id: {$in: enrollmentIds},
    })
      .populate('customerId', 'name mobile')
      .populate('vendorId', 'name mobile')
      .lean();
    enrollmentMap = new Map(rows.map(r => [String(r._id), r]));
  }

  return list.map(product => {
    if (!product?.isCsp) {
      return {...product, cspLabel: null, cspSailorName: null};
    }
    const enrollment = enrollmentMap.get(String(product.cspEnrollmentId || ''));
    const sailorName =
      String(enrollment?.displayName || '').trim() ||
      String(enrollment?.customerId?.name || '').trim() ||
      String(enrollment?.vendorId?.name || '').trim() ||
      '';
    return {
      ...product,
      cspSailorName: sailorName || null,
      cspLabel: sailorName ? `CSP · ${sailorName}` : 'CSP',
    };
  });
};
const localUploadDir = path.resolve('uploads/products');
const tmpUploadDir = path.join('/tmp', 'uploads', 'products');

let uploadDir = localUploadDir;
try {
  fs.mkdirSync(localUploadDir, { recursive: true });
} catch (error) {
  // Fallback for read-only runtime filesystems (common in serverless envs).
  fs.mkdirSync(tmpUploadDir, { recursive: true });
  uploadDir = tmpUploadDir;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

export const upload = multer({ storage });

//create product 
export const createProduct = async (req, res) => {
  try {
    const {
      type,
      productName,
      brandName,
      serviceName,
      sellingPrice,
      purchasePrice,
      itemCode,
      barCode,
      category,
      subCategory,
      stockQty,
      stockStatus,
      primaryUnit,
      description,
      discountType,
      discountValue,
      variants,
      isCsp,
      cspEnrollmentId,
    } = req.body;
    console.log("product controller",req.body);

    const itemType = type === "service" ? "service" : "product";
    const resolvedName = itemType === "service" ? serviceName || productName : productName;

    if (!resolvedName || sellingPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name and selling price are required.",
      });
    }

    let cspFields;
    try {
      cspFields = await resolveCspFields({
        isCspRaw: isCsp,
        cspEnrollmentIdRaw: cspEnrollmentId,
      });
    } catch (cspError) {
      return res.status(cspError.status || 400).json({
        success: false,
        message: cspError.message || 'Invalid CSP selection.',
      });
    }

    const parsedSellingPrice = Number(sellingPrice);
    const parsedDiscountValue = Number(discountValue || 0);
    if (discountType === "flat" && parsedDiscountValue > parsedSellingPrice) {
      return res.status(400).json({
        success: false,
        message: "Flat discount cannot exceed selling price.",
      });
    }
    if (discountType === "percentage" && parsedDiscountValue > 100) {
      return res.status(400).json({
        success: false,
        message: "Percentage discount cannot exceed 100.",
      });
    }

    let parsedVariants = [];
    if (variants) {
      try {
        parsedVariants = JSON.parse(variants);
      } catch {
        parsedVariants = [];
      }
    }

    let imageUrls = [];
    if (Array.isArray(req.files)) {
      for (const file of req.files) {
        const cloudinaryUrl = await uploadOnCloudinary(file.path);
        if (cloudinaryUrl) {
          imageUrls.push(cloudinaryUrl);
        } else {
          imageUrls.push(`/uploads/products/${file.filename}`);
        }
      }
    }

    const product = await Product.create({
      type: itemType,
      itemType,
      productName: resolvedName,
      brandName: brandName || "",
      serviceName: itemType === "service" ? resolvedName : "",
      sellingPrice: parsedSellingPrice,
      purchasePrice: purchasePrice ? Number(purchasePrice) : 0,
      itemCode,
      barCode,
      category,
      subCategory,
      stockQty: itemType === "product" ? Number(stockQty || 0) : 0,
      stockStatus: itemType === "product" ? stockStatus || "in_stock" : "in_stock",
      primaryUnit: itemType === "service" ? primaryUnit || "" : "",
      description: description || "",
      discountType: discountType || "flat",
      discountValue: parsedDiscountValue,
      variants: itemType === "product" ? parsedVariants : [],
      images: imageUrls,
      imageUrl: imageUrls[0] || null,
      ...cspFields,
    });

    const [productWithLabel] = await withCspLabel([product.toObject()]);

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: productWithLabel,
    });
  } catch (error) {
    console.error('createProduct error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create product',
    });
  }
};
export const uploadBulkProducts = async (req, res) => {
  try {
    const rawProducts = Array.isArray(req.body)
      ? req.body
      : Array.isArray(req.body?.products)
        ? req.body.products
        : [];

    if (!rawProducts.length) {
      return res.status(400).json({
        success: false,
        message: 'No products found',
      });
    }

    const toNumber = (value, fallback = 0) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    };

    const normalizeKey = (value) =>
      String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

    /** Prefer itemCode → barcode → name+variant for identity. */
    const buildIdentity = ({ productName, variantName, itemCode, barCode }) => {
      const code = normalizeKey(itemCode);
      if (code) return { type: 'itemCode', key: `item:${code}`, label: `Item Code "${itemCode}"` };

      const barcode = normalizeKey(barCode);
      if (barcode) {
        return {
          type: 'barCode',
          key: `barcode:${barcode}`,
          label: `Barcode "${barCode}"`,
        };
      }

      const name = normalizeKey(productName);
      const variant = normalizeKey(variantName);
      return {
        type: 'nameVariant',
        key: `name:${name}|variant:${variant}`,
        label: variant
          ? `Product "${productName}" / Variant "${variantName}"`
          : `Product "${productName}"`,
      };
    };

    const products = [];
    const invalidRows = [];
    const duplicateRows = [];
    const seenInFile = new Map(); // identity key → first row number

    // Auto-create any Excel categories via Category collection (POST /api/categories equivalent)
    const categoryNamesFromFile = rawProducts
      .map((row) =>
        String(row?.category ?? row?.Category ?? row?.categoryName ?? '').trim(),
      )
      .filter(Boolean);
    const categoryMap = await ensureCategoriesExist(categoryNamesFromFile);

    rawProducts.forEach((row, index) => {
      const excelRow = index + 1;
      const productName = String(
        row?.productName ?? row?.Product ?? row?.name ?? '',
      ).trim();
      const sellingPrice = toNumber(
        row?.sellingPrice ?? row?.unitPrice ?? row?.['Unit Price'],
        NaN,
      );
      const purchasePrice = toNumber(
        row?.purchasePrice ?? row?.['Purchase Price'],
        0,
      );
      const stockQty = Math.max(
        0,
        Math.floor(toNumber(row?.stockQty ?? row?.qty ?? row?.Qty, 0)),
      );
      const categoryRaw = String(
        row?.category ?? row?.Category ?? row?.categoryName ?? '',
      ).trim();
      const itemCode = String(row?.itemCode ?? row?.['Item Code'] ?? '').trim();
      const barCode = String(
        row?.barCode ?? row?.barcode ?? row?.Barcode ?? '',
      ).trim();
      const variantName = String(row?.variant ?? row?.Variant ?? '').trim();

      if (!productName || !(sellingPrice > 0) || !categoryRaw) {
        invalidRows.push({
          row: excelRow,
          productName: productName || null,
          reason: !productName
            ? 'Product name is required'
            : !(sellingPrice > 0)
              ? 'Selling / Unit Price must be greater than 0'
              : 'Category is required (will not default to General)',
        });
        return;
      }

      const category =
        categoryMap.get(categoryRaw.toLowerCase()) || categoryRaw;

      const identity = buildIdentity({
        productName,
        variantName,
        itemCode,
        barCode,
      });

      if (seenInFile.has(identity.key)) {
        duplicateRows.push({
          row: excelRow,
          productName,
          reason: `Duplicate in file (${identity.label}). First seen on row ${seenInFile.get(identity.key)}.`,
        });
        return;
      }
      seenInFile.set(identity.key, excelRow);

      let variants = [];
      if (Array.isArray(row?.variants)) {
        variants = row.variants
          .map((v) => ({
            name: String(v?.name ?? '').trim(),
            sellingPrice: toNumber(v?.sellingPrice, sellingPrice),
            purchasePrice: toNumber(v?.purchasePrice, purchasePrice),
            barcode: String(v?.barcode ?? v?.barCode ?? '').trim(),
          }))
          .filter((v) => v.name);
      } else if (variantName) {
        variants = [
          {
            name: variantName,
            sellingPrice,
            purchasePrice,
            barcode: barCode,
          },
        ];
      }

      products.push({
        type: 'product',
        itemType: 'product',
        productName,
        brandName: String(row?.brandName ?? '').trim(),
        serviceName: '',
        sellingPrice,
        purchasePrice,
        itemCode,
        barCode,
        category,
        subCategory: String(row?.subCategory ?? '').trim(),
        description: String(row?.description ?? '').trim(),
        discountType: row?.discountType === 'percentage' ? 'percentage' : 'flat',
        discountValue: Math.max(0, toNumber(row?.discountValue, 0)),
        stockQty,
        stockStatus: stockQty > 0 ? 'in_stock' : 'out_of_stock',
        primaryUnit: '',
        variants,
        images: Array.isArray(row?.images) ? row.images : [],
        imageUrl: null,
        isCsp: false,
        cspEnrollmentId: null,
        _identity: identity,
        _excelRow: excelRow,
      });
    });

    // Check against existing DB products
    const itemCodes = [
      ...new Set(
        products
          .map((p) => String(p.itemCode || '').trim())
          .filter(Boolean),
      ),
    ];
    const barCodes = [
      ...new Set(
        products
          .map((p) => String(p.barCode || '').trim())
          .filter(Boolean),
      ),
    ];
    const productNames = [
      ...new Set(
        products
          .map((p) => String(p.productName || '').trim())
          .filter(Boolean),
      ),
    ];

    const orClauses = [];
    if (itemCodes.length) orClauses.push({ itemCode: { $in: itemCodes } });
    if (barCodes.length) orClauses.push({ barCode: { $in: barCodes } });

    // Prefer exact $in for codes; names use $toLower chunks (no giant regex)
    let existingProducts = [];
    if (orClauses.length) {
      existingProducts = await Product.find({ $or: orClauses })
        .select('productName itemCode barCode variants')
        .lean();
    }
    if (productNames.length) {
      const byName = await findByLowerNames(
        Product,
        'productName',
        productNames,
        'productName itemCode barCode variants',
      );
      const seenIds = new Set(existingProducts.map((p) => String(p._id)));
      for (const doc of byName) {
        const id = String(doc._id);
        if (!seenIds.has(id)) {
          seenIds.add(id);
          existingProducts.push(doc);
        }
      }
    }

    const existingIdentities = new Set();
    for (const existing of existingProducts) {
      const existingVariants = Array.isArray(existing.variants)
        ? existing.variants
        : [];
      if (existingVariants.length > 0) {
        for (const variant of existingVariants) {
          const id = buildIdentity({
            productName: existing.productName,
            variantName: variant?.name,
            itemCode: existing.itemCode,
            barCode: existing.barCode || variant?.barcode,
          });
          existingIdentities.add(id.key);
        }
      } else {
        const id = buildIdentity({
          productName: existing.productName,
          variantName: '',
          itemCode: existing.itemCode,
          barCode: existing.barCode,
        });
        existingIdentities.add(id.key);
      }

      // Also index bare itemCode / barcode so either match blocks insert
      const code = normalizeKey(existing.itemCode);
      if (code) existingIdentities.add(`item:${code}`);
      const barcode = normalizeKey(existing.barCode);
      if (barcode) existingIdentities.add(`barcode:${barcode}`);
      const nameOnly = normalizeKey(existing.productName);
      if (nameOnly) existingIdentities.add(`name:${nameOnly}|variant:`);
    }

    const toInsert = [];
    for (const product of products) {
      const identity = product._identity;
      const excelRow = product._excelRow;
      delete product._identity;
      delete product._excelRow;

      if (existingIdentities.has(identity.key)) {
        duplicateRows.push({
          row: excelRow,
          productName: product.productName,
          reason: `Already exists in catalogue (${identity.label}).`,
        });
        continue;
      }

      // Mark so later rows in same request can't collide with ones we're inserting
      existingIdentities.add(identity.key);
      toInsert.push(product);
    }

    if (!toInsert.length) {
      return res.status(400).json({
        success: false,
        message:
          duplicateRows.length > 0
            ? 'All rows are duplicates or invalid. Nothing imported.'
            : 'No valid products to import',
        invalidRows,
        duplicateRows,
        summary: {
          total: rawProducts.length,
          created: 0,
          failed: invalidRows.length + duplicateRows.length,
          skippedDuplicates: duplicateRows.length,
          invalidRows,
          duplicateRows,
        },
      });
    }

    const insertedProducts = await Product.insertMany(toInsert, {
      ordered: false,
    });

    return res.status(201).json({
      success: true,
      message: `${insertedProducts.length} products imported successfully`,
      products: insertedProducts,
      summary: {
        total: rawProducts.length,
        created: insertedProducts.length,
        failed: invalidRows.length + duplicateRows.length,
        skippedDuplicates: duplicateRows.length,
        invalidRows,
        duplicateRows,
      },
    });
  } catch (error) {
    console.error('uploadBulkProducts error:', error);

    // Partial success when ordered:false hits a validation error mid-batch
    if (error?.name === 'MongoBulkWriteError' && Array.isArray(error?.insertedDocs)) {
      const created = error.insertedDocs.length;
      return res.status(207).json({
        success: created > 0,
        message: `Imported ${created} product(s) with some failures`,
        products: error.insertedDocs,
        summary: {
          created,
          failed: Number(error?.writeErrors?.length || 0),
          errors: (error.writeErrors || []).map((e) => e?.errmsg || e?.message),
        },
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to import products',
    });
  }
};

export const getProducts = async (req, res) => {
  try {
    const { search, type } = req.query;
    const clauses = [];

    // Optional type filter: product | service (omit = all)
    const typeFilter = String(type || '').trim().toLowerCase();
    if (typeFilter === 'product' || typeFilter === 'service') {
      clauses.push({
        $or: [{ type: typeFilter }, { itemType: typeFilter }],
      });
    }

    if (search) {
      const searchRegex = new RegExp(String(search).trim(), 'i');
      clauses.push({
        $or: [
          { productName: searchRegex },
          { serviceName: searchRegex },
          { itemCode: searchRegex },
          { barCode: searchRegex },
          { 'variants.name': searchRegex },
          { 'variants.barcode': searchRegex },
        ],
      });
    }

    const query =
      clauses.length === 0
        ? {}
        : clauses.length === 1
          ? clauses[0]
          : { $and: clauses };

    const products = await Product.find(query).sort({ createdAt: -1 }).limit(6000);
    const productNames = products.map((p) => String(p.productName ?? '').trim()).filter(Boolean);
    const stockMap = await computeStockByProductNames({ names: productNames });

    const productsWithLiveStock = products.map((productDoc) => {
      const product = productDoc.toObject();
      const isService = product.itemType === "service" || product.type === "service";
      const liveStockQty = isService
        ? 0
        : Number(stockMap.get(String(product.productName ?? "").trim()) ?? 0);

      return {
        ...product,
        stockQty: liveStockQty,
        stockStatus: liveStockQty > 0 ? "in_stock" : "out_of_stock",
      };
    });

    const productsWithCsp = await withCspLabel(productsWithLiveStock);

    return res.status(200).json({
      success: true,
      products: productsWithCsp,
    });
  } catch (error) {
    console.error('getProducts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
    });
  }
};

//Edit product detail
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      type,
      productName,
      brandName,
      serviceName,
      sellingPrice,
      purchasePrice,
      itemCode,
      barCode,
      category,
      subCategory,
      stockQty,
      stockStatus,
      primaryUnit,
      description,
      discountType,
      discountValue,
      variants,
      isCsp,
      cspEnrollmentId,
    } = req.body;

    // find existing product
    const existingProduct = await Product.findById(id);

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (isCsp !== undefined || cspEnrollmentId !== undefined) {
      try {
        const cspFields = await resolveCspFields({
          isCspRaw: isCsp !== undefined ? isCsp : existingProduct.isCsp,
          cspEnrollmentIdRaw:
            cspEnrollmentId !== undefined
              ? cspEnrollmentId
              : existingProduct.cspEnrollmentId,
        });
        existingProduct.isCsp = cspFields.isCsp;
        existingProduct.cspEnrollmentId = cspFields.cspEnrollmentId;
        existingProduct.cspCustomerId = cspFields.cspCustomerId;
        existingProduct.cspVendorId = cspFields.cspVendorId;
      } catch (cspError) {
        return res.status(cspError.status || 400).json({
          success: false,
          message: cspError.message || 'Invalid CSP selection.',
        });
      }
    }

    let imageUrls = existingProduct.images || [];
    if (Array.isArray(req.files) && req.files.length > 0) {
      imageUrls = [];
      for (const file of req.files) {
        const cloudinaryUrl = await uploadOnCloudinary(file.path);
        if (cloudinaryUrl) {
          imageUrls.push(cloudinaryUrl);
        } else {
          imageUrls.push(`/uploads/products/${file.filename}`);
        }
      }
    }

    // update fields
    const nextType = type === "service" ? "service" : "product";
    existingProduct.type = nextType;
    existingProduct.itemType = nextType;
    const nextName =
      nextType === "service"
        ? serviceName ?? productName ?? existingProduct.serviceName ?? existingProduct.productName
        : productName ?? serviceName ?? existingProduct.productName;
    existingProduct.productName = nextName;
    existingProduct.serviceName = nextType === "service" ? nextName : "";
    existingProduct.sellingPrice =
      sellingPrice !== undefined ? Number(sellingPrice) : existingProduct.sellingPrice;

    existingProduct.purchasePrice =
      purchasePrice !== undefined ? Number(purchasePrice) : existingProduct.purchasePrice;

    existingProduct.itemCode = itemCode ?? existingProduct.itemCode;
    existingProduct.barCode = barCode ?? existingProduct.barCode;
    existingProduct.brandName = brandName ?? existingProduct.brandName;
    existingProduct.category = category ?? existingProduct.category;
    existingProduct.subCategory = subCategory ?? existingProduct.subCategory;
    existingProduct.stockStatus = stockStatus ?? existingProduct.stockStatus;
    existingProduct.primaryUnit = primaryUnit ?? existingProduct.primaryUnit;
    existingProduct.description = description ?? existingProduct.description;
    existingProduct.discountType = discountType ?? existingProduct.discountType;
    existingProduct.discountValue =
      discountValue !== undefined ? Number(discountValue) : existingProduct.discountValue;

    if (nextType === "service") {
      existingProduct.stockQty = 0;
      existingProduct.variants = [];
    } else {
      existingProduct.stockQty = stockQty !== undefined ? Number(stockQty) : existingProduct.stockQty;
      if (variants) {
        try {
          existingProduct.variants = JSON.parse(variants);
        } catch {
          existingProduct.variants = existingProduct.variants;
        }
      }
    }

    existingProduct.images = imageUrls;
    existingProduct.imageUrl = imageUrls[0] || null;

    await existingProduct.save();

    const [productWithLabel] = await withCspLabel([existingProduct.toObject()]);

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: productWithLabel,
    });
  } catch (error) {
    console.error("updateProduct error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update product",
    });
  }
};

//Delete product 
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("deleteProduct error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete product",
    });
  }
};