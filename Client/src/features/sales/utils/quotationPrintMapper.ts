import type { ThermalPrintProps } from "@/features/sales/components/invoice/ThermalPrint";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatDateDisplay(value: unknown): string {
  if (value == null || value === "") return "—";
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type QuotationLine = Record<string, unknown>;

/** Shape expected by pdfGenerator filename + A4 template. */
export function toQuotationPdfRecord(raw: unknown): Record<string, unknown> {
  const q = isRecord(raw) ? raw : {};
  const code = String(q.quotationCode ?? q.invoiceCode ?? "").trim();
  return {
    ...q,
    invoiceCode: code || String(q.invoiceCode ?? "quotation"),
    invoiceDate: q.quotationDate ?? q.invoiceDate,
  };
}

/** Map a saved quotation → A4 thermal print props (quotation-only). */
export function mapQuotationToThermalPrintProps(
  raw: unknown,
  documentType = "QUOTATION",
): ThermalPrintProps {
  const q = (isRecord(raw) ? raw : {}) as Record<string, unknown>;
  const items = Array.isArray(q.items) ? (q.items as QuotationLine[]) : [];

  const mappedItems = items.map((item) => {
    const qty = Math.max(0, num(item.qty)) || 1;
    const unitPrice = num(item.unitPrice ?? item.price);
    const discount = Math.max(0, num(item.discount));
    const membershipLine = Math.max(0, num(item.membershipDiscountAmount));
    const productLine = Math.max(0, num(item.productDiscountAmount));
    return {
      name: String(item.productName || item.name || item.description || "Item"),
      qty,
      price: unitPrice,
      discount,
      itemCode: String(item.productCode || item.sku || "").trim() || undefined,
      hsn: String(item.hsnCode || item.hsn || "").trim() || undefined,
      productDiscount:
        productLine > 0
          ? productLine
          : membershipLine > 0
            ? Math.max(0, discount - membershipLine)
            : 0,
      membershipDiscount: membershipLine,
      cashback: Math.max(0, num(item.cashback)),
    };
  });

  const totalMRP = mappedItems.reduce(
    (sum, it) => sum + Number(it.qty) * Number(it.price),
    0,
  );
  const lineProductDiscount = mappedItems.reduce(
    (sum, it) => sum + Number(it.productDiscount || 0),
    0,
  );
  const membershipDiscountTotal = Math.max(
    0,
    num(q.membershipDiscount) ||
      mappedItems.reduce((sum, it) => sum + Number(it.membershipDiscount || 0), 0),
  );
  const couponDiscount = Math.max(0, num((q.coupon as { discountAmount?: number } | undefined)?.discountAmount));
  const couponCode = String(
    (q.coupon as { code?: string } | undefined)?.code ?? "",
  ).trim();
  const lineDiscount = mappedItems.reduce(
    (sum, it) => sum + Number(it.discount || 0),
    0,
  );
  const headerLineDiscount = Math.max(0, num(q.discountTotal) || lineDiscount);
  const productDiscountTotal =
    lineProductDiscount > 0
      ? lineProductDiscount
      : membershipDiscountTotal > 0
        ? Math.max(0, headerLineDiscount - membershipDiscountTotal)
        : 0;
  const discountTotal = Math.max(0, headerLineDiscount + couponDiscount);
  const cashbackAmount = Math.max(
    0,
    num(q.cashbackTotal) ||
      mappedItems.reduce((sum, it) => sum + Number(it.cashback || 0), 0),
  );
  const extraCharges = Array.isArray(q.extraCharges)
    ? (q.extraCharges as Array<{ label?: string; amount?: number }>).map((c) => ({
        label: String(c?.label || "Extra Charge"),
        amount: num(c?.amount),
      }))
    : [];
  const extraTotal = extraCharges.reduce((s, c) => s + c.amount, 0);
  const computedNet = Math.max(0, totalMRP - discountTotal + extraTotal);
  const finalAmount = Math.max(0, num(q.grandTotal) || computedNet);
  const totalQty = mappedItems.reduce((sum, it) => sum + Number(it.qty || 0), 0);

  const billedBy = String(
    (q.invoiceBy as { staffName?: string; name?: string } | undefined)?.staffName ??
      (q.invoiceBy as { name?: string } | undefined)?.name ??
      q.billBy ??
      q.salesPersonName ??
      (q.createdBy as { m_staff_name?: string } | undefined)?.m_staff_name ??
      "",
  ).trim();

  return {
    documentType,
    invoiceNo: String(q.quotationCode ?? q.invoiceCode ?? "—") || "—",
    date: formatDateDisplay(q.quotationDate ?? q.invoiceDate),
    dueDate: formatDateDisplay(q.dueDate),
    salesPerson: billedBy || "—",
    customerName: String(q.customerName || "Walk-in Customer"),
    customerPhone: String(q.customerPhone || "—"),
    membershipType: String(q.membershipType || "").trim() || undefined,
    items: mappedItems,
    totalMRP,
    discountTotal,
    productDiscountTotal,
    membershipDiscountTotal,
    couponDiscount,
    couponCode: couponCode || undefined,
    cashbackAmount,
    finalAmount,
    totalDue: finalAmount,
    totalQty,
    extraCharges,
  };
}
