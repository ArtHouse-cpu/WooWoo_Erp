import mongoose from "mongoose";
import PurchaseOrder from "../models/purchaseOrder.model.js";  
import { v2 as cloudinary } from "cloudinary"; 

export const createPurchaseOrder = async (req, res) => {
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
    } = req.body;
    // console.log("purchase order controller",req.body);
  

    if (!invoiceNumber || !invoiceDate || !supplierName || !vendorDate) {
      return res.status(400).json({
        success: false,
        message: "Invoice number, invoice date, supplier, and vendor date are required.",
      });
    }

    const normalizedItems = Array.isArray(items)
      ? items.map((item) => {
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
        const purchaseOrderPRefix="PURCHASE ODR:"; 
    const purchaseOrder = await PurchaseOrder.create({
  invoiceNumber: purchaseOrderPRefix + String(invoiceNumber).trim(),

  invoiceDate: invoiceDate ? new Date(invoiceDate) : null,

  supplierName: String(supplierName).trim(),

  vendorDate: vendorDate ? new Date(vendorDate) : null,

  amount: Number(amount ?? 0),

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
console.log("purchase order insert",purchaseOrder);

    return res.status(201).json({ success: true, purchaseOrder });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getPurchasesOrder = async (req, res) => {
  try {
    const purchaseOrders = await PurchaseOrder.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, purchaseOrders });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid purchase order id." });
    }
    const purchaseOrder = await PurchaseOrder.findById(id);
    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: "Purchase order not found." });
    }
    return res.status(200).json({ success: true, purchaseOrder });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid purchase order id." });
    }

    const updateData = { ...req.body };
    if (updateData.invoiceDate) updateData.invoiceDate = new Date(updateData.invoiceDate);
    if (updateData.vendorDate) updateData.vendorDate = new Date(updateData.vendorDate);

    if (Array.isArray(updateData.items)) {
      updateData.items = updateData.items.map((item) => {
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

    const purchaseOrder = await PurchaseOrder.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    );
    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: "Purchase order not found." });
    }
    return res.status(200).json({ success: true, purchaseOrder });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid purchase order id." });
    }
    const purchaseOrder = await PurchaseOrder.findByIdAndDelete(id);
    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: "Purchase order not found." });
    }
    return res.status(200).json({ success: true, purchaseOrder });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
