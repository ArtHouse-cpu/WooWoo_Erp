import type { ThermalPrintProps } from "@/features/sales/components/invoice/ThermalPrint";
import type { InvoicePdfInput } from "@/features/sales/components/invoice/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
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

function resolveSalesPerson(invoice: InvoicePdfInput): string {
  const billedBy = String(
    invoice.invoiceBy?.staffName ??
      invoice.invoiceBy?.name ??
      invoice.invoiceBy?.m_staff_name ??
      invoice.billBy ??
      invoice.billedBy ??
      "",
  ).trim();
  const createdBy = String(invoice.createdBy?.m_staff_name ?? "").trim();
  const sales = String(invoice.salesPersonName ?? "").trim();
  return billedBy || createdBy || sales || "—";
}

/** Map saved invoice / POS payload → new A4 ThermalPrint props (single design). */
export function mapInvoiceToThermalPrintProps(
  raw: unknown,
  documentType = "INVOICE",
): ThermalPrintProps {
  const invoice = (isRecord(raw) ? raw : {}) as InvoicePdfInput;
  const items = Array.isArray(invoice.items) ? invoice.items : [];

  const mappedItems = items.map((item) => {
    const qty = Math.max(0, Number(item.qty ?? 0) || 0);
    const unitPrice = Number(item.unitPrice ?? item.price ?? 0) || 0;
    const discount = Math.max(0, Number(item.discount ?? 0) || 0);
    return {
      name: String(item.productName || item.name || item.description || "Item"),
      qty: qty || 1,
      price: unitPrice,
      discount,
      itemCode: String(item.productCode || item.sku || "").trim() || undefined,
      hsn: String(item.hsnCode || item.hsn || "").trim() || undefined,
    };
  });

  const totalMRP = mappedItems.reduce(
    (sum, it) => sum + Number(it.qty) * Number(it.price),
    0,
  );
  const lineDiscount = mappedItems.reduce(
    (sum, it) => sum + Number(it.discount || 0),
    0,
  );
  const discountTotal = Math.max(
    0,
    Number(invoice.discountTotal ?? lineDiscount) || 0,
  );
  const extraCharges = Array.isArray(invoice.extraCharges)
    ? invoice.extraCharges.map((c) => ({
        label: String(c?.label || "Extra Charge"),
        amount: Number(c?.amount || 0) || 0,
      }))
    : [];
  const cashbackAmount = Math.max(
    0,
    Number(invoice.cashbackTotal ?? 0) || 0,
  );

  const computedNet = Math.max(
    0,
    totalMRP -
      discountTotal +
      extraCharges.reduce((s, c) => s + c.amount, 0),
  );
  const finalAmount = Math.max(
    0,
    Number(invoice.grandTotal ?? computedNet) || 0,
  );
  const totalDue = Math.max(
    0,
    Number(
      invoice.paymentBreakdown?.dueAmount ??
        (String(invoice.status || "").toLowerCase() === "draft"
          ? finalAmount
          : 0),
    ) || 0,
  );
  const totalQty = mappedItems.reduce((sum, it) => sum + Number(it.qty || 0), 0);

  const invoiceNo = String(
    invoice.invoiceCode ??
      invoice.returnCode ??
      invoice.subscriptionCode ??
      (invoice as { invoiceNo?: string }).invoiceNo ??
      (invoice.invoiceNumber != null ? String(invoice.invoiceNumber) : "") ??
      "—",
  );

  return {
    documentType,
    invoiceNo: invoiceNo || "—",
    date: formatDateDisplay(invoice.invoiceDate),
    dueDate: formatDateDisplay(invoice.dueDate),
    salesPerson: resolveSalesPerson(invoice),
    customerName: String(invoice.customerName || "Walk-in Customer"),
    customerPhone: String(invoice.customerPhone || "—"),
    membershipType: String(invoice.membershipType || "").trim() || undefined,
    items: mappedItems,
    totalMRP,
    discountTotal,
    cashbackAmount,
    finalAmount,
    totalDue,
    totalQty,
    extraCharges,
  };
}
