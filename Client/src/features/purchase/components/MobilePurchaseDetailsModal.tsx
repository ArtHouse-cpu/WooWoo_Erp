import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  ArrowRightLeft,
  Calendar,
  CreditCard,
  Download,
  Loader2,
  Phone,
  Trash2,
  Pencil,
  User,
  Building,
} from "lucide-react";

export type MobilePurchaseDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  doc: any | null;
  docType: "purchase" | "purchase_order" | "debit_note";
  loading?: boolean;
  onEdit?: (doc: any) => void;
  onConvert?: (doc: any) => void;
  onDelete?: (doc: any) => void;
  onWhatsAppShare?: (doc: any) => void;
  onDownloadPdf?: (doc: any) => void;
};

function formatDetailDate(val?: string | Date): string {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "";
  const shortDate = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return shortDate;
}

export default function MobilePurchaseDetailsModal({
  open,
  onClose,
  doc,
  docType,
  loading = false,
  onEdit,
  onConvert,
  onDelete,
  onWhatsAppShare,
  onDownloadPdf,
}: MobilePurchaseDetailsModalProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({
    0: true,
  });

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const toggleItem = (idx: number) => {
    setExpandedItems((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const raw = doc?.raw ?? doc ?? {};

  const docCode =
    raw.bill ||
    raw.invoiceNumber ||
    raw.invoiceCode ||
    raw.purchaseNumber ||
    raw.orderNumber ||
    raw.returnCode ||
    raw.debitNoteNumber ||
    (docType === "purchase_order"
      ? "Purchase Order"
      : docType === "debit_note"
        ? "Debit Note"
        : "Purchase Bill");

  const vendorName =
    raw.vendor ||
    raw.supplierName ||
    raw.vendorName ||
    raw.customerName ||
    "Vendor";

  const vendorPhone =
    raw.phone ||
    raw.phoneNumber ||
    raw.vendorPhone ||
    raw.mobile ||
    "";

  const statusRaw = String(raw.status || raw.statusRaw || "Pending");
  const statusLower = statusRaw.toLowerCase();
  const isPaid = statusLower === "paid" || statusLower === "completed" || statusLower === "final";
  const isDue = statusLower === "due";
  const isDraft = statusLower === "draft";
  const isCancelled = statusLower === "cancelled" || statusLower === "canceled" || statusLower === "rejected";
  const isPending = !isPaid && !isDue && !isDraft && !isCancelled;

  const items: any[] = Array.isArray(raw.items) && raw.items.length > 0
    ? raw.items
    : Array.isArray(raw.products) && raw.products.length > 0
      ? raw.products
      : Array.isArray(raw.raw?.items) && raw.raw.items.length > 0
        ? raw.raw.items
        : [];

  const grandTotal = Number(
    raw.grandTotal ??
      raw.totalAmount ??
      raw.amount ??
      0,
  );

  const calculatedItemsTotal = items.reduce(
    (sum: number, it: any) =>
      sum + (Number(it.lineTotal || it.total || it.unitPrice * it.qty || it.rate * it.qty) || 0),
    0,
  );

  const subTotal = Number(
    raw.subTotal ??
      raw.subtotal ??
      (calculatedItemsTotal > 0 ? calculatedItemsTotal : grandTotal),
  );

  const discountTotal = Number(raw.discountTotal ?? raw.discount ?? 0);
  const taxTotal = Number(raw.taxTotal ?? raw.tax ?? 0);

  const paidAmount = Number(
    raw.paidAmount ??
      (isPaid ? grandTotal : 0),
  );

  const dueAmount = Number(
    raw.dueAmount ??
      (isPaid ? 0 : Math.max(0, grandTotal - paidAmount)),
  );

  const mode = String(
    raw.mode || raw.paymentMode || raw.raw?.mode || "Cash",
  ).toUpperCase();

  const docDateStr = formatDetailDate(
    raw.date || raw.invoiceDate || raw.orderDate || raw.createdAt,
  );

  const dueDateStr =
    raw.dueDate || raw.deliveryDate || raw.expectedDeliveryDate
      ? formatDetailDate(raw.dueDate || raw.deliveryDate || raw.expectedDeliveryDate)
      : null;

  const docTitle =
    docType === "purchase_order"
      ? "Purchase Order"
      : docType === "debit_note"
        ? "Debit Note"
        : "Purchase Bill";

  const convertLabel =
    docType === "purchase"
      ? "Convert to Return"
      : docType === "purchase_order"
        ? "Convert to Purchase"
        : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 md:hidden">
      {/* ============================================================== */}
      {/* 1. TOP STICKY APP BAR                                          */}
      {/* ============================================================== */}
      <div className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-slate-200/90 bg-white px-3 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 active:scale-95"
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {docTitle}
            </div>
            <h2 className="truncate text-sm font-bold text-slate-900">
              {docCode}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onWhatsAppShare && (
            <button
              type="button"
              onClick={() => onWhatsAppShare(raw)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 active:scale-95"
              title="Share via WhatsApp"
              aria-label="Share via WhatsApp"
            >
              <img
                src="https://cdn-icons-png.flaticon.com/512/733/733585.png"
                alt="whatsapp"
                className="h-4.5 w-4.5"
              />
            </button>
          )}

          {onDownloadPdf && (
            <button
              type="button"
              onClick={() => onDownloadPdf(raw)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition hover:bg-blue-100 active:scale-95"
              title="Download PDF"
              aria-label="Download PDF"
            >
              <Download size={16} />
            </button>
          )}

          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
              isPaid
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : isDue
                  ? "border border-amber-200 bg-amber-50 text-amber-700"
                  : isDraft
                    ? "border border-slate-200 bg-slate-100 text-slate-600"
                    : isCancelled
                      ? "border border-rose-200 bg-rose-50 text-rose-700"
                      : "border border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isPaid
                  ? "bg-emerald-500"
                  : isDue
                    ? "bg-amber-500"
                    : isDraft
                      ? "bg-slate-400"
                      : isCancelled
                        ? "bg-rose-500"
                        : "bg-amber-500"
              }`}
            />
            {statusRaw.toLowerCase()}
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. SCROLLABLE DETAILS CONTENT                                  */}
      {/* ============================================================== */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 pb-28">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <span className="mt-3 text-xs font-semibold text-slate-500">
              Loading details...
            </span>
          </div>
        ) : (
          <>
            {/* Vendor / Supplier Card */}
            <section className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Building size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Vendor / Party
                  </div>
                  <h3 className="truncate text-base font-bold text-slate-900">
                    {vendorName}
                  </h3>
                  {vendorPhone && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <Phone size={11} className="text-slate-400" />
                      <span>{vendorPhone}</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Document Overview & Dates Card */}
            <section className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Date
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 font-semibold text-slate-800">
                    <Calendar size={12} className="text-slate-400" />
                    <span>{docDateStr || "—"}</span>
                  </div>
                </div>

                {dueDateStr && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {docType === "purchase_order" ? "Delivery Date" : "Due Date"}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 font-semibold text-slate-800">
                      <Calendar size={12} className="text-slate-400" />
                      <span>{dueDateStr}</span>
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Payment Mode
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 font-semibold text-slate-800">
                    <CreditCard size={12} className="text-slate-400" />
                    <span>{mode}</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Created By
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 font-semibold text-slate-800">
                    <User size={12} className="text-slate-400" />
                    <span className="truncate">{raw.owner || raw.purchaser || "System"}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Items Breakdown Card */}
            <section className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
                <div className="flex items-center gap-1.5">
                  <FileText size={14} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-700">
                    Items & Products
                  </span>
                </div>
                <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </span>
              </div>

              {items.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No line items recorded
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {items.map((it: any, idx: number) => {
                    const itemName =
                      it.itemName ||
                      it.productName ||
                      it.name ||
                      `Item #${idx + 1}`;
                    const qty = Number(it.qty ?? it.quantity ?? 1);
                    const rate = Number(it.rate ?? it.unitPrice ?? it.price ?? 0);
                    const tax = Number(it.tax ?? it.taxRate ?? 0);
                    const lineTotal = Number(
                      it.lineTotal ?? it.total ?? it.amount ?? (qty * rate),
                    );
                    const expanded = Boolean(expandedItems[idx]);

                    return (
                      <div key={idx} className="p-3">
                        <div
                          onClick={() => toggleItem(idx)}
                          className="flex cursor-pointer items-start justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900">
                              {itemName}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              {qty} × ₹{rate.toLocaleString("en-IN")}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              ₹{lineTotal.toLocaleString("en-IN")}
                            </span>
                            {expanded ? (
                              <ChevronUp size={14} className="text-slate-400" />
                            ) : (
                              <ChevronDown size={14} className="text-slate-400" />
                            )}
                          </div>
                        </div>

                        {expanded && (
                          <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl bg-slate-50/80 p-2 text-[10px] text-slate-600">
                            <div>
                              <span className="text-slate-400">Unit Price:</span>
                              <div className="font-semibold text-slate-700">
                                ₹{rate.toLocaleString("en-IN")}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400">Quantity:</span>
                              <div className="font-semibold text-slate-700">
                                {qty}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400">Tax:</span>
                              <div className="font-semibold text-slate-700">
                                {tax ? `${tax}%` : "—"}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Financial Summary Card */}
            <section className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <div className="text-xs font-bold text-slate-800 mb-2.5">
                Payment & Financial Summary
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">
                    ₹{subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {discountTotal > 0 && (
                  <div className="flex items-center justify-between text-emerald-600">
                    <span>Discount</span>
                    <span className="font-semibold">
                      −₹{discountTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {taxTotal > 0 && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Tax (GST)</span>
                    <span className="font-semibold text-slate-800">
                      ₹{taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-sm font-bold text-slate-900">
                  <span>Grand Total</span>
                  <span className="text-base text-blue-600">
                    ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-slate-600">Paid Amount</span>
                  <span className="font-semibold text-emerald-600">
                    ₹{paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {dueAmount > 0 && (
                  <div className="flex items-center justify-between text-amber-600">
                    <span className="font-medium">Balance Due</span>
                    <span className="font-bold">
                      ₹{dueAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Notes if present */}
            {raw.notes && (
              <section className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Notes
                </div>
                <p className="mt-1 text-xs text-slate-600 whitespace-pre-wrap">
                  {raw.notes}
                </p>
              </section>
            )}
          </>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. FIXED BOTTOM ACTION PANEL                                   */}
      {/* ============================================================== */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/90 bg-white/95 px-3 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-[0_-8px_25px_rgba(0,0,0,0.06)] backdrop-blur-md">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300" />
        <div className="flex w-full items-center gap-2">
          {convertLabel && onConvert && (
            <button
              type="button"
              disabled={isCancelled}
              onClick={() => onConvert(raw)}
              className="flex flex-1 min-w-0 items-center justify-center gap-1 rounded-full border border-blue-200/80 bg-blue-50/80 px-2 py-2.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowRightLeft size={13} className="shrink-0 text-blue-600" />
              <span className="truncate">{convertLabel}</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              disabled={isCancelled}
              onClick={() => onEdit(raw)}
              className="flex flex-1 min-w-0 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Pencil size={13} className="shrink-0 text-slate-600" />
              <span className="truncate">Edit</span>
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(raw)}
              className="flex flex-1 min-w-0 items-center justify-center gap-1 rounded-full border border-rose-200/80 bg-rose-50/80 px-2 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 active:scale-95"
            >
              <Trash2 size={13} className="shrink-0 text-rose-600" />
              <span className="truncate">Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
