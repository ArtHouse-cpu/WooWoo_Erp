export type FinanceSummary = {
  total: number;
  paid: number;
  pending: number;
};

const money = (value: unknown) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100) / 100;
};

const statusOf = (value: unknown) => String(value ?? "").trim().toLowerCase();

const cancelled = (status: string) => status === "cancelled" || status === "canceled";

/** Issued invoices. Drafts and cancelled bills are not payment obligations. */
export function invoiceFinance(rows: Array<{ status: string; amount: number; dueAmount: number }>): FinanceSummary {
  let total = 0;
  let paid = 0;
  let pending = 0;
  for (const row of rows) {
    const status = statusOf(row.status);
    if (cancelled(status) || status === "draft") continue;
    const amount = money(row.amount);
    const pendingPart = Math.min(amount, money(row.dueAmount));
    total += amount;
    pending += pendingPart;
    paid += money(amount - pendingPart);
  }
  return { total, paid, pending };
}

/** Credit notes are refunds. A final note is a recorded refund; a draft is not yet issued. */
export function creditNoteFinance(
  rows: Array<{ status: string; amount: number; refundedAmount?: number }>,
): FinanceSummary {
  let total = 0;
  let paid = 0;
  let pending = 0;
  for (const row of rows) {
    const status = statusOf(row.status);
    if (cancelled(status)) continue;
    const amount = money(row.amount);
    total += amount;
    if (status === "final") {
      const recorded = money(row.refundedAmount);
      const settled = recorded > 0 ? Math.min(amount, recorded) : amount;
      paid += settled;
      pending += money(amount - settled);
    } else {
      pending += amount;
    }
  }
  return { total, paid, pending };
}

/** Quotations are estimates. Only an accepted quotation is treated as committed, and none record a payment. */
export function quotationFinance(rows: Array<{ status: string; amount: number }>): FinanceSummary {
  let total = 0;
  let pending = 0;
  for (const row of rows) {
    const status = statusOf(row.status);
    if (status === "rejected" || cancelled(status)) continue;
    const amount = money(row.amount);
    total += amount;
    if (status === "accepted") pending += amount;
  }
  return { total, paid: 0, pending };
}

/**
 * Purchases, purchase orders, and debit notes.
 * Cancelled documents are omitted. Drafts stay in the total, but their unpaid balance is not outstanding.
 */
export function settledDocumentFinance(
  rows: Array<{ status: string; amount: number; paidAmount: number; dueAmount: number }>,
): FinanceSummary {
  let total = 0;
  let paid = 0;
  let pending = 0;
  for (const row of rows) {
    const status = statusOf(row.status);
    if (cancelled(status)) continue;
    const amount = money(row.amount);
    const paidPart = Math.min(amount, money(row.paidAmount));
    total += amount;
    paid += paidPart;
    if (status === "draft") continue;
    pending += Math.min(money(row.dueAmount), money(amount - paidPart));
  }
  return { total, paid, pending };
}
