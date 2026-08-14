import mongoose from 'mongoose';
import Invoice from '../../../models/invoice.model.js';
import {normalizeMobile} from '../utils/normalize.js';

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Build phone variants so invoice.customerPhone matches customer.mobile */
function phoneLookupVariants(mobile) {
  const raw = String(mobile ?? '').trim();
  const normalized = normalizeMobile(raw);
  const digits = normalized || raw.replace(/\D/g, '');
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  if (!last10) return {variants: [], last10: ''};

  const variants = new Set(
    [
      raw,
      normalized,
      digits,
      last10,
      `+91${last10}`,
      `91${last10}`,
      `0${last10}`,
      `${last10.slice(0, 5)} ${last10.slice(5)}`,
      `${last10.slice(0, 5)}-${last10.slice(5)}`,
    ].filter(Boolean),
  );

  return {variants: [...variants], last10};
}

function buildCustomerInvoiceQuery(customerId, customerMobile) {
  const or = [];

  const id = String(customerId ?? '').trim();
  if (id && mongoose.Types.ObjectId.isValid(id)) {
    const oid = new mongoose.Types.ObjectId(id);
    or.push({customerId: oid});
    or.push({customerId: id});
  }

  const {variants, last10} = phoneLookupVariants(customerMobile);
  if (variants.length) {
    or.push({customerPhone: {$in: variants}});
  }
  if (last10.length === 10) {
    or.push({customerPhone: {$regex: `${last10}$`}});
  }

  if (!or.length) {
    return null;
  }

  return {
    $or: or,
    status: {$ne: 'draft'},
  };
}

const mapPaymentStatus = (inv) => {
  const doc = String(inv.status || '').toLowerCase();
  if (doc === 'cancelled') return 'Cancelled';
  if (doc === 'draft') return 'Draft';

  const due = toNum(inv.pendingAmount ?? inv.paymentBreakdown?.dueAmount);
  const ps = String(inv.paymentStatus || '').toLowerCase();
  if (due > 0.001 || ps === 'partial' || ps === 'due') return 'Pending';
  return 'Paid';
};

function resolvePaidAmount(inv) {
  return toNum(
    inv.paymentBreakdown?.paidAmount ??
      toNum(inv.paymentBreakdown?.cash) +
        toNum(inv.paymentBreakdown?.upi) +
        toNum(inv.paymentBreakdown?.card) +
        toNum(inv.paymentBreakdown?.wallet),
  );
}

function resolveBenefitBreakdown(inv) {
  const discountAmount = toNum(inv.discountTotal);
  const cashbackAmount = toNum(inv.cashbackTotal);
  const totalBenefit =
    Math.round((discountAmount + cashbackAmount) * 100) / 100;

  return {discountAmount, cashbackAmount, totalBenefit};
}

function resolveCategory(items) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return 'GENERAL';

  const counts = new Map();
  for (const item of list) {
    const label = String(item.category || 'General').trim() || 'General';
    counts.set(label, (counts.get(label) || 0) + toNum(item.qty || 0));
  }

  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return String(top || 'General').toUpperCase();
}

function resolveItemCount(items) {
  return (Array.isArray(items) ? items : []).reduce(
    (sum, item) => sum + toNum(item.qty || 0),
    0,
  );
}

/** PIN-verified staff who billed the invoice (fallback: sales person). */
function resolveBilledBy(inv) {
  const invoiceBy = inv?.invoiceBy && typeof inv.invoiceBy === 'object'
    ? inv.invoiceBy
    : {};
  const name = String(
    invoiceBy.staffName ||
      invoiceBy.name ||
      inv.salesPersonName ||
      '',
  ).trim();
  if (!name) return null;
  return {
    staffId: invoiceBy.staffId ? String(invoiceBy.staffId) : null,
    staffName: name,
    employeeId: String(invoiceBy.employeeId || '').trim() || null,
    email: String(invoiceBy.email || '').trim() || null,
  };
}

/** Transaction History list row — matches customer portal table UI */
const mapActivityListItem = (inv) => {
  const items = Array.isArray(inv.items) ? inv.items : [];
  const itemCount = resolveItemCount(items);
  const subTotal = toNum(inv.subTotal);
  const totalPaid = toNum(inv.grandTotal) || resolvePaidAmount(inv);
  const {discountAmount, cashbackAmount, totalBenefit} =
    resolveBenefitBreakdown(inv);
  const category = resolveCategory(items);

  return {
    invoiceId: String(inv._id),
    invoiceNumber: inv.invoiceCode || '',
    createdAt: inv.createdAt,
    billedBy: resolveBilledBy(inv),
    /** Bill value before benefits (shown as PAID column in design) */
    subTotal,
    /** Actual amount customer paid at checkout */
    totalPaid,
    category,
    paidAmount: subTotal,
    itemCount,
    totalBenefit,
    benefited: totalBenefit,
    discountAmount,
    cashbackAmount,
    status: mapPaymentStatus(inv),
  };
};

const activitySelectFields =
  'invoiceCode subTotal discountTotal membershipDiscount cashbackTotal grandTotal status paymentStatus pendingAmount paymentBreakdown coupon referral items mode createdAt customerId customerPhone invoiceBy salesPersonName';

/** Invoice Receipt modal — full breakdown for one transaction */
const mapActivityDetail = (inv) => {
  const items = Array.isArray(inv.items) ? inv.items : [];
  const itemCount = resolveItemCount(items);
  const subTotal = toNum(inv.subTotal);
  const totalPaid = toNum(inv.grandTotal) || resolvePaidAmount(inv);
  const {discountAmount, cashbackAmount, totalBenefit} =
    resolveBenefitBreakdown(inv);

  return {
    invoiceId: String(inv._id),
    invoiceNumber: inv.invoiceCode || '',
    itemCount,
    category: resolveCategory(items),
    dateTime: inv.createdAt,
    createdAt: inv.createdAt,
    status: mapPaymentStatus(inv),
    subTotal,
    subtotal: subTotal,
    discount: discountAmount,
    discountAmount,
    cashback: cashbackAmount,
    cashbackAmount,
    totalPaid,
    paidAmount: totalPaid,
    totalBenefit,
    benefited: totalBenefit,
    paymentMode: inv.mode || '',
    pendingAmount: toNum(inv.pendingAmount ?? inv.paymentBreakdown?.dueAmount),
    billedBy: resolveBilledBy(inv),
    items: items.map((item) => ({
      productName: item.productName || '',
      qty: toNum(item.qty),
      unitPrice: toNum(item.unitPrice),
      discount: toNum(item.discount),
      lineTotal: toNum(item.lineTotal),
      category: String(item.category || 'General').toUpperCase(),
    })),
  };
};

/**
 * Customer portal activity = invoices for this customer.
 */
export async function getCustomerActivity(
  customerId,
  {page = 1, limit = 20, status, customerMobile} = {},
) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const query = buildCustomerInvoiceQuery(customerId, customerMobile);
  if (!query) {
    return {
      activities: [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: 0,
        totalPages: 1,
      },
    };
  }

  const [rows, total] = await Promise.all([
    Invoice.find(query)
      .sort({createdAt: -1})
      .skip(skip)
      .limit(limitNum)
      .select(activitySelectFields)
      .lean(),
    Invoice.countDocuments(query),
  ]);

  let activities = rows.map(mapActivityListItem);
  if (status) {
    const s = String(status).toLowerCase();
    activities = activities.filter((a) => a.status.toLowerCase() === s);
  }

  return {
    activities,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * Single invoice receipt for customer portal (tap row → detail modal).
 */
export async function getCustomerActivityDetail(
  customerId,
  invoiceId,
  {customerMobile} = {},
) {
  const customerQuery = buildCustomerInvoiceQuery(customerId, customerMobile);
  if (!customerQuery || !mongoose.Types.ObjectId.isValid(String(invoiceId))) {
    return null;
  }

  const inv = await Invoice.findOne({
    _id: invoiceId,
    ...customerQuery,
  })
    .select(activitySelectFields)
    .lean();

  if (!inv) return null;
  return mapActivityDetail(inv);
}
