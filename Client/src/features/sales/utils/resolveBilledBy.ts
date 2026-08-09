/** Resolve PIN-verified billed-by staff from a saved sales document. */

type StaffLike = {
  staffName?: unknown;
  name?: unknown;
  m_staff_name?: unknown;
};

export function resolveBilledBy(doc: {
  invoiceBy?: StaffLike | string | null;
  billBy?: unknown;
  billedBy?: unknown;
  salesPersonName?: unknown;
} | null | undefined): string {
  if (!doc) return "";

  if (typeof doc.invoiceBy === "string" && doc.invoiceBy.trim()) {
    return doc.invoiceBy.trim();
  }

  const fromInvoiceBy = String(
    (doc.invoiceBy as StaffLike | undefined)?.staffName ??
      (doc.invoiceBy as StaffLike | undefined)?.name ??
      (doc.invoiceBy as StaffLike | undefined)?.m_staff_name ??
      "",
  ).trim();
  if (fromInvoiceBy) return fromInvoiceBy;

  const fromBillBy = String(doc.billBy ?? doc.billedBy ?? "").trim();
  if (fromBillBy) return fromBillBy;

  return "";
}

/** Session / document creator (Created By), not the PIN billed-by person. */
export function resolveCreatedByName(
  doc: {
    createdBy?: { m_staff_name?: unknown } | null;
    createdByName?: unknown;
    purchaser?: unknown;
  } | null | undefined,
  fallback = "Not Assigned",
): string {
  const fromCreated = String(
    doc?.createdBy?.m_staff_name ??
      doc?.createdByName ??
      doc?.purchaser ??
      "",
  ).trim();
  return fromCreated || fallback;
}
