import Product from '../models/product.model.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { computeStockByProductNames } from '../utils/inventoryStock.utils.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

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

export const createProduct = async (req, res) => {
  try {
    const {
      type,
      productName,
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
    });

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    console.error('createProduct error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create product',
    });
  }
};

export const getProducts = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query = {
        $or: [
          { productName: searchRegex },
          { itemCode: searchRegex },
          { barCode: searchRegex }
        ]
      };
    }

    const products = await Product.find(query).sort({ createdAt: -1 }).limit(50);
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

    return res.status(200).json({
      success: true,
      products: productsWithLiveStock,
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
    } = req.body;

    // find existing product
    const existingProduct = await Product.findById(id);

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
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
    existingProduct.category = category ?? existingProduct.category;
    existingProduct.subCategory = category ?? existingProduct.subCategory;
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

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: existingProduct,
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