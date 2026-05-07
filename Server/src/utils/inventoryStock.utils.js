import mongoose from "mongoose";
import Purchase from "../models/purchase.model.js";
import Invoice from "../models/invoice.model.js";
import ReturnSale from "../models/returnSale.model.js";
import PurchaseReturn from "../models/purchaseReturn.model.js";

const normalizeName = (value) => String(value ?? "").trim();

const safeQty = (value) => {
  const qty = Number(value);
  return Number.isFinite(qty) ? qty : 0;
};

const addQty = (stockMap, name, delta) => {
  if (!name) return;
  const current = stockMap.get(name) ?? 0;
  stockMap.set(name, current + delta);
};

const movementDocsQuery = (names) =>
  Array.isArray(names) && names.length
    ? {
        status: { $ne: "cancelled" },
        "items.productName": { $in: names },
      }
    : { status: { $ne: "cancelled" } };

export const computeStockByProductNames = async ({
  names = [],
  excludeInvoiceId = null,
} = {}) => {
  const normalizedNames = [...new Set(names.map(normalizeName).filter(Boolean))];
  const query = movementDocsQuery(normalizedNames);

  const invoiceQuery = { ...query };
  if (excludeInvoiceId && mongoose.Types.ObjectId.isValid(excludeInvoiceId)) {
    invoiceQuery._id = { $ne: new mongoose.Types.ObjectId(excludeInvoiceId) };
  }

  const [purchases, invoices, returnSales, purchaseReturns] = await Promise.all([
    Purchase.find(query, { items: 1 }).lean(),
    Invoice.find(invoiceQuery, { items: 1 }).lean(),
    ReturnSale.find(query, { items: 1 }).lean(),
    PurchaseReturn.find(query, { items: 1 }).lean(),
  ]);

  const stockMap = new Map();

  for (const doc of purchases) {
    for (const item of doc?.items ?? []) {
      const name = normalizeName(item?.productName);
      if (normalizedNames.length && !normalizedNames.includes(name)) continue;
      addQty(stockMap, name, safeQty(item?.qty));
    }
  }

  for (const doc of invoices) {
    for (const item of doc?.items ?? []) {
      const name = normalizeName(item?.productName);
      if (normalizedNames.length && !normalizedNames.includes(name)) continue;
      addQty(stockMap, name, -safeQty(item?.qty));
    }
  }

  for (const doc of returnSales) {
    for (const item of doc?.items ?? []) {
      const name = normalizeName(item?.productName);
      if (normalizedNames.length && !normalizedNames.includes(name)) continue;
      addQty(stockMap, name, safeQty(item?.qty));
    }
  }

  for (const doc of purchaseReturns) {
    for (const item of doc?.items ?? []) {
      const name = normalizeName(item?.productName);
      if (normalizedNames.length && !normalizedNames.includes(name)) continue;
      addQty(stockMap, name, -safeQty(item?.qty));
    }
  }

  return stockMap;
};

