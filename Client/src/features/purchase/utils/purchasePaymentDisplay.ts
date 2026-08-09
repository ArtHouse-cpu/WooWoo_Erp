/** Shared display helpers for cash vs credit purchases in list tables. */

export function isCreditPurchase(raw: {
  purchaseType?: unknown;
  paymentMode?: unknown;
  status?: unknown;
  mode?: unknown;
}): boolean {
  const type = String(raw.purchaseType ?? "").toLowerCase();
  const mode = String(raw.paymentMode ?? raw.mode ?? "").toLowerCase();
  const status = String(raw.status ?? "").toLowerCase();
  return type === "credit" || mode === "credit" || status === "due";
}

/** Payment Mode column: DUE for credit, Paid when fully paid, else raw mode. */
export function displayPaymentMode(raw: {
  purchaseType?: unknown;
  paymentMode?: unknown;
  status?: unknown;
  mode?: unknown;
}): string {
  if (isCreditPurchase(raw)) return "DUE";
  const status = String(raw.status ?? "").toLowerCase();
  if (status === "paid" || status === "completed") return "Paid";
  const mode = String(raw.paymentMode ?? raw.mode ?? "").trim();
  return mode || "—";
}

/** Status column: DUE for credit purchases, else humanized status. */
export function displayPaymentStatus(raw: {
  purchaseType?: unknown;
  paymentMode?: unknown;
  status?: unknown;
  mode?: unknown;
}): string {
  if (isCreditPurchase(raw)) return "DUE";
  const status = String(raw.status ?? "").toLowerCase();
  if (status === "paid" || status === "completed") return "Paid";
  if (status === "partial") return "Partial";
  if (status === "draft") return "Draft";
  if (status === "cancelled" || status === "canceled") return "Cancelled";
  if (status === "pending") return "Pending";
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "—";
}

export function resolvePaidDueAmounts(raw: {
  amount?: unknown;
  paidAmount?: unknown;
  dueAmount?: unknown;
  purchaseType?: unknown;
  paymentMode?: unknown;
  status?: unknown;
}): { paidAmount: number; dueAmount: number } {
  const total = Math.max(0, Number(raw.amount) || 0);
  if (isCreditPurchase(raw)) {
    return {
      paidAmount: 0,
      dueAmount:
        Number(raw.dueAmount) > 0 ? Number(raw.dueAmount) : total,
    };
  }
  const paid = Number(raw.paidAmount);
  const due = Number(raw.dueAmount);
  if (Number.isFinite(paid) || Number.isFinite(due)) {
    return {
      paidAmount: Number.isFinite(paid) ? Math.max(0, paid) : Math.max(0, total - (Number.isFinite(due) ? due : 0)),
      dueAmount: Number.isFinite(due) ? Math.max(0, due) : Math.max(0, total - (Number.isFinite(paid) ? paid : 0)),
    };
  }
  const status = String(raw.status ?? "").toLowerCase();
  if (status === "paid" || status === "completed") {
    return { paidAmount: total, dueAmount: 0 };
  }
  return { paidAmount: 0, dueAmount: total };
}

export function displayPurchaseType(raw: {
  purchaseType?: unknown;
  paymentMode?: unknown;
  status?: unknown;
  mode?: unknown;
}): string {
  return isCreditPurchase(raw) ? "Credit" : "Cash";
}
