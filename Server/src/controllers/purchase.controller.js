import mongoose from "mongoose";
import Purchase from "../models/purchase.model.js";
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localUploadsDir = path.resolve(__dirname, '../../uploads/purchase');
const tmpUploadsDir = path.join('/tmp', 'uploads', 'purchase');

let uploadsDir = localUploadsDir;
try {
  fs.mkdirSync(localUploadsDir, {recursive: true});
} catch (error) {
  fs.mkdirSync(tmpUploadsDir, {recursive: true});
  uploadsDir = tmpUploadsDir;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '');
    cb(null, uniqueName);
  },
});

export const uploadPurchaseAttachments = multer({
  storage,
  limits: {fileSize: 5 * 1024 * 1024}, // 5MB
});

export const createPurchase = async (req, res) => {
  try {
    const {
      invoiceNumber,
      invoiceDate,
      supplierName,
      vendorDate,
      amount,
      paymentMode,
      status,
      items,
      notes,
      purchaser,
      purchaserDate,
      purchaserSignature,
      supplierSignature,
      supplierDate,
      supplierAddress,
      supplierContact,
      manualDiscount,
      manualDiscountType,
    } = req.body;
    console.log("Purchase controller",req.body);

    if (!invoiceNumber || !invoiceDate || !supplierName || !vendorDate) {
      return res.status(400).json({
        success: false,
        message: "Invoice number, invoice date, supplier, and vendor date are required.",
      });
    }

    let itemsList = items;
    if (typeof items === 'string') {
      try {
        itemsList = JSON.parse(items);
      } catch (e) {
        itemsList = [];
      }
    }

    const normalizedItems = Array.isArray(itemsList)
      ? itemsList.map((item) => {
          const qty = Number(item.qty);
          const unitPrice = Number(item.unitPrice);
          const discount = Number(item.discount ?? 0);
          return {
            productName: String(item.productName ?? "").trim(),
            qty,
            unitPrice,
            discount,
            lineTotal: qty * unitPrice - discount,
          };
        })
      : [];
    const purchasePrefix="PURCHASE: ";
   const purchase = await Purchase.create({
  invoiceNumber: purchasePrefix + String(invoiceNumber).trim(),

  invoiceDate: invoiceDate ? new Date(invoiceDate) : null,

  supplierName: String(supplierName).trim(),

  vendorDate: vendorDate ? new Date(vendorDate) : null,

  amount: Number(amount ?? 0),

  manualDiscount: Math.max(0, Number(manualDiscount ?? 0) || 0),

  manualDiscountType:
    String(manualDiscountType ?? "flat") === "percentage"
      ? "percentage"
      : "flat",

  paymentMode: String(paymentMode ?? "Cash"),

  status: String(status ?? "pending"),

  items: normalizedItems,

  notes: String(notes ?? "").trim(),

  purchaser: String(purchaser ?? "").trim(),

  purchaserDate: purchaserDate
    ? new Date(purchaserDate)
    : undefined,

  purchaserSignature: String(purchaserSignature ?? "").trim(),

  supplierSignature: String(supplierSignature ?? "").trim(),

  supplierDate: supplierDate
    ? new Date(supplierDate)
    : undefined,

  supplierAddress: String(supplierAddress ?? "").trim(),

  supplierContact: String(supplierContact ?? "").trim(),
});

    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => uploadOnCloudinary(file.path));
      const cloudinaryUrls = await Promise.all(uploadPromises);
      purchase.attachments = cloudinaryUrls.filter(url => url !== null);
      await purchase.save();
    }

    console.log("purchase created",purchase);

    return res.status(201).json({ success: true, purchase });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, purchases });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid purchase id." });
    }
    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: "Purchase not found." });
    }
    return res.status(200).json({ success: true, purchase });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid purchase id." });
    }

    const body = req.body || {};
    const $set = {};

    if (body.invoiceNumber !== undefined) {
      $set.invoiceNumber = String(body.invoiceNumber).trim();
    }
    if (body.invoiceDate) {
      const d = new Date(body.invoiceDate);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid invoice date." });
      }
      $set.invoiceDate = d;
    }
    if (body.vendorDate) {
      const d = new Date(body.vendorDate);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid vendor date." });
      }
      $set.vendorDate = d;
    }
    if (body.supplierName !== undefined) {
      $set.supplierName = String(body.supplierName).trim();
    }
    if (body.supplierAddress !== undefined) {
      $set.supplierAddress = String(body.supplierAddress).trim();
    }
    if (body.supplierContact !== undefined) {
      $set.supplierContact = String(body.supplierContact).trim();
    }
    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({ success: false, message: "Invalid amount." });
      }
      $set.amount = amount;
    }
    if (body.manualDiscount !== undefined) {
      $set.manualDiscount = Math.max(0, Number(body.manualDiscount ?? 0) || 0);
    }
    if (body.manualDiscountType !== undefined) {
      $set.manualDiscountType =
        String(body.manualDiscountType ?? "flat") === "percentage"
          ? "percentage"
          : "flat";
    }
    if (body.status !== undefined && String(body.status).trim()) {
      $set.status = String(body.status).trim().toLowerCase();
    }
    if (body.paymentMode !== undefined && String(body.paymentMode).trim()) {
      const raw = String(body.paymentMode).trim();
      const allowed = ["Cash", "UPI", "Card", "Bank", "Credit", "Other"];
      if (raw.toUpperCase() === "UPI") {
        $set.paymentMode = "UPI";
      } else {
        const hit = allowed.find(
          (m) => m.toLowerCase() === raw.toLowerCase(),
        );
        if (!hit) {
          return res.status(400).json({
            success: false,
            message: `Invalid payment mode: ${raw}`,
          });
        }
        $set.paymentMode = hit;
      }
    }
    if (body.notes !== undefined) $set.notes = String(body.notes ?? "").trim();
    if (body.purchaser !== undefined) {
      $set.purchaser = String(body.purchaser ?? "").trim();
    }
    if (body.purchaserSignature !== undefined) {
      $set.purchaserSignature = String(body.purchaserSignature ?? "").trim();
    }
    if (body.supplierSignature !== undefined) {
      $set.supplierSignature = String(body.supplierSignature ?? "").trim();
    }
    if (body.purchaserDate) {
      const d = new Date(body.purchaserDate);
      if (!Number.isNaN(d.getTime())) $set.purchaserDate = d;
    }
    if (body.supplierDate) {
      const d = new Date(body.supplierDate);
      if (!Number.isNaN(d.getTime())) $set.supplierDate = d;
    }

    let itemsList = body.items;
    if (typeof itemsList === "string") {
      try {
        itemsList = JSON.parse(itemsList);
      } catch {
        itemsList = undefined;
      }
    }
    if (Array.isArray(itemsList)) {
      $set.items = itemsList.map((item) => {
        const qty = Number(item.qty);
        const unitPrice = Number(item.unitPrice);
        const discount = Number(item.discount ?? 0);
        return {
          productName: String(item.productName ?? "").trim(),
          qty,
          unitPrice,
          discount,
          lineTotal: qty * unitPrice - discount,
        };
      });
    }

    const updateOps = {};
    if (Object.keys($set).length) updateOps.$set = $set;

    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) =>
        uploadOnCloudinary(file.path),
      );
      const cloudinaryUrls = await Promise.all(uploadPromises);
      const validUrls = cloudinaryUrls.filter((url) => url !== null);
      if (validUrls.length) {
        updateOps.$push = { attachments: { $each: validUrls } };
      }
    }

    if (!Object.keys(updateOps).length) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update.",
      });
    }

    const purchase = await Purchase.findByIdAndUpdate(id, updateOps, {
      new: true,
      runValidators: true,
    });
    if (!purchase) {
      return res
        .status(404)
        .json({ success: false, message: "Purchase not found." });
    }
    return res.status(200).json({ success: true, purchase });
  } catch (error) {
    console.error("updatePurchase error:", error);
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A purchase with this invoice number already exists.",
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid purchase id." });
    }
    const purchase = await Purchase.findByIdAndDelete(id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: "Purchase not found." });
    }
    return res.status(200).json({ success: true, purchase });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
