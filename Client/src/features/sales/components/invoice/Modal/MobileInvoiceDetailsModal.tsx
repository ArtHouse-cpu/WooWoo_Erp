import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  FileText,
  ArrowLeftRight,
  Landmark,
  PenTool,
  Tag,
  Paperclip,
  CreditCard,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Pencil,
  Trash2,
} from "lucide-react";

export type MobileInvoiceDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  invoice: any | null;
  loading?: boolean;
  onEdit: (invoice: any) => void;
  onConvert: (invoice: any) => void;
  onCancelInvoice: (invoice: any) => void;
  onDeleteInvoice: (invoice: any) => void;
  onWhatsAppShare?: (invoice: any) => void;
  onDownloadPdf?: (invoice: any) => void;
  onMoreActions?: (invoice: any) => void;
};

function formatDetailDate(val?: string | Date): string {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "";
  const shortDate = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  const time = d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${shortDate}, ${time}`;
}

function getInvoiceCategories(raw: any): string[] {
  if (!raw) return [];
  const categories = new Set<string>();

  const notes = String(raw.notes || "").toLowerCase();
  if (notes.includes("food bill") || notes.includes("food")) {
    categories.add("Food");
  }
  if (notes.includes("space booking") || notes.includes("space")) {
    categories.add("Space");
  }

  const directCat = String(
    raw.invoiceCategory || raw.category || raw.billType || raw.sourceType || "",
  ).toLowerCase();
  if (directCat.includes("food")) categories.add("Food");
  if (directCat.includes("space")) categories.add("Space");
  if (directCat.includes("service")) categories.add("Service");
  if (directCat.includes("membership") || directCat.includes("subscription")) {
    categories.add("Membership");
  }

  const items = Array.isArray(raw.items) ? raw.items : [];
  for (const item of items) {
    const cat = String(
      item.lineCategory || item.sourceType || item.category || "",
    ).toLowerCase();
    const name = String(item.productName || item.name || "").toLowerCase();
    if (cat === "food" || cat === "foods" || name.includes("food") || item.isFood) {
      categories.add("Food");
    } else if (cat === "space" || cat === "spaces" || name.includes("space") || item.isSpace) {
      categories.add("Space");
    } else if (cat === "service" || cat === "services") {
      categories.add("Service");
    } else if (/membership|subscription/.test(cat) || /membership|subscription/.test(name)) {
      categories.add("Membership");
    }
  }

  return Array.from(categories);
}

function getCustomerMembershipLabel(raw: any): string | null {
  if (!raw) return null;
  const m =
    raw.membershipType ||
    raw.membershipPlan ||
    raw.membership ||
    raw.customerMembership ||
    raw.customer?.membershipType ||
    raw.customer?.membership;
  if (!m || String(m).toLowerCase() === "none" || String(m).toLowerCase() === "visitor") {
    return null;
  }
  return String(m);
}

export default function MobileInvoiceDetailsModal({
  open,
  onClose,
  invoice,
  loading = false,
  onEdit,
  onConvert,
  onCancelInvoice,
  onDeleteInvoice,
  onWhatsAppShare,
  onDownloadPdf,
  onMoreActions,
}: MobileInvoiceDetailsModalProps) {
  const [customerExpanded, setCustomerExpanded] = useState(false);
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

  const raw = invoice || {};
  const invoiceCode =
    raw.invoiceCode ||
    (raw.invoiceNumber ? `1-${raw.invoiceNumber}` : raw.bill || "Invoice");

  const rawStatus = String(raw.status || "Paid").toLowerCase();
  const isPaid = rawStatus === "paid";
  const isPending = rawStatus === "pending";
  const isDraft = rawStatus === "draft";
  const isCancelled = rawStatus === "cancelled";

  const customerName =
    raw.customerName || raw.customer || "Walk-in Customer";
  const invoiceDateStr = formatDetailDate(
    raw.invoiceDate || raw.createdAt || raw.date,
  );
  const categories = getInvoiceCategories(raw);
  const membershipLabel = getCustomerMembershipLabel(raw);

  const items: any[] = Array.isArray(raw.items) && raw.items.length > 0
    ? raw.items
    : Array.isArray(raw.raw?.items) && raw.raw.items.length > 0
      ? raw.raw.items
      : [];

  const subTotal = Number(
    raw.subTotal ??
      raw.originalSubtotal ??
      items.reduce(
        (sum: number, it: any) =>
          sum + (Number(it.lineTotal || it.unitPrice * it.qty) || 0),
        0,
      ),
  );

  const discountTotal = Number(
    raw.discountTotal ??
      raw.membershipDiscount ??
      raw.coupon?.discountAmount ??
      0,
  );

  const taxTotal = Number(raw.taxTotal || 0);

  const grandTotal = Number(
    raw.grandTotal ??
      raw.totalAmount ??
      raw.amount ??
      Math.max(0, subTotal - discountTotal + taxTotal),
  );

  const mode = String(
    raw.mode || raw.paymentMode || raw.raw?.mode || "UPI",
  ).toUpperCase();

  const paidAmount = Number(
    raw.paymentBreakdown?.paidAmount ??
      (isPaid ? grandTotal : Math.max(0, grandTotal - (raw.pendingAmount || raw.dueAmount || 0))),
  );

  const dueAmount = Number(
    raw.pendingAmount ??
      raw.paymentBreakdown?.dueAmount ??
      raw.dueAmount ??
      0,
  );

  const paymentRef =
    raw.transactionId ||
    raw.paymentReference ||
    raw.paymentBreakdown?.upiRef ||
    `PAYIN-${raw.invoiceNumber || raw.id || "14926"}`;

  const bankName =
    raw.bankName ||
    raw.bankDetails?.bankName ||
    raw.accountNumber ||
    "JSA BOB CC - 0534";

  const signatoryName =
    raw.salesPersonName ||
    raw.billedBy ||
    raw.createdBy?.m_staff_name ||
    raw.owner ||
    "Ankur Anand";

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-[#F7F8FA] md:hidden animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200/90 bg-white px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] shadow-xs">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Back Arrow + Invoice Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 active:scale-95"
              aria-label="Back"
            >
              <ChevronLeft size={24} strokeWidth={2.5} />
            </button>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold tracking-tight text-slate-900">
                {invoiceCode}
              </h2>
              <div className="flex items-center gap-1.5 text-xs flex-wrap">
                {categories.map((cat) => (
                  <span
                    key={cat}
                    className={`inline-flex items-center rounded-md px-1.5 py-0.2 text-[10px] font-semibold ${
                      cat === "Food"
                        ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
                        : cat === "Space"
                          ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200"
                          : cat === "Membership"
                            ? "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200"
                            : "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200"
                    }`}
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Edit Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isCancelled}
              onClick={() => onEdit(raw)}
              className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
            >
              Edit
            </button>
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3.5 pb-36 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <p className="text-xs font-medium text-slate-500">
              Loading invoice details…
            </p>
          </div>
        ) : (
          <>
            {/* 1. Customer Details */}
            <section>
              <h3 className="mb-1.5 px-0.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                Customer Details
              </h3>
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                <div
                  className="flex cursor-pointer items-center justify-between"
                  onClick={() => setCustomerExpanded((prev) => !prev)}
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-base font-bold text-slate-900">
                      {customerName}
                    </span>
                    {membershipLabel && (
                      <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 ring-1 ring-inset ring-purple-200">
                        {membershipLabel}
                      </span>
                    )}
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition-transform duration-200 ${
                        customerExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>

                <div className="mt-2 text-xs">
                  <div className="text-slate-400 font-normal">Invoice Date & Time</div>
                  <div className="font-semibold text-slate-800">
                    {invoiceDateStr || "—"}
                  </div>
                </div>

                {customerExpanded && (
                  <div className="mt-3.5 space-y-2 border-t border-slate-100 pt-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Phone:</span>
                      <span className="font-medium text-slate-800">
                        {raw.customerPhone || raw.phone || "—"}
                      </span>
                    </div>
                    {raw.customerAddress && (
                      <div className="flex justify-between gap-4">
                        <span className="shrink-0 text-slate-400">Address:</span>
                        <span className="text-right font-medium text-slate-800">
                          {Array.isArray(raw.customerAddress)
                            ? raw.customerAddress.join(", ")
                            : String(raw.customerAddress)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Billed By:</span>
                      <span className="font-medium text-slate-800">
                        {signatoryName}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setCustomerExpanded((prev) => !prev)}
                  className="mt-2.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  {customerExpanded ? "See less" : "See more"}
                </button>
              </div>
            </section>

            {/* 2. Items (N) */}
            <section>
              <h3 className="mb-1.5 px-0.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                Items ({items.length})
              </h3>
              <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs divide-y divide-slate-100 overflow-hidden">
                {items.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No items found on this invoice.
                  </div>
                ) : (
                  items.map((item, idx) => {
                    const isExpanded = Boolean(expandedItems[idx]);
                    const itemName =
                      item.productName || item.name || "Item";
                    const itemUnitPrice = Number(
                      item.unitPrice || item.price || 0,
                    );
                    const itemQty = Number(item.qty || item.quantity || 1);
                    const itemUnit = item.unit;
                    const itemTotal = Number(
                      item.lineTotal ||
                        item.totalAmount ||
                        itemUnitPrice * itemQty,
                    );
                    const itemTaxPercent = Number(
                      item.taxPercent || item.taxRate || 0,
                    );
                    const itemTaxAmount = Number(
                      item.taxAmount ||
                        (itemUnitPrice * itemQty * itemTaxPercent) / 100,
                    );
                    const itemPurchasePrice = Number(
                      item.purchasePrice || item.costPrice || 0,
                    );
                    const itemMargin = Number(
                      item.margin != null
                        ? item.margin
                        : itemTotal - itemPurchasePrice * itemQty,
                    );
                    const itemSku =
                      item.sku ||
                      item.productCode ||
                      item.hsnCode ||
                      item.hsn ||
                      "";

                    return (
                      <div key={idx} className="p-3.5 transition">
                        {/* Header Row of the Item */}
                        <div
                          className="flex cursor-pointer items-start justify-between gap-2"
                          onClick={() => toggleItem(idx)}
                        >
                          <div className="flex items-start gap-1 min-w-0 flex-1">
                            <span className="font-bold text-sm text-slate-900 leading-snug">
                              {itemName}
                            </span>
                            {isExpanded ? (
                              <ChevronUp size={16} className="shrink-0 text-slate-500 mt-0.5" />
                            ) : (
                              <ChevronDown size={16} className="shrink-0 text-slate-500 mt-0.5" />
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="font-bold text-sm text-slate-900">
                              ₹{itemTotal.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>

                        {/* Collapsed metadata */}
                        {!isExpanded && (
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                            {itemSku && <span>{itemSku}</span>}
                            <span>
                              x {itemQty.toFixed(2)} {itemUnit}
                            </span>
                          </div>
                        )}

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-3 space-y-2 border-t border-slate-100 pt-2.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Price with Tax</span>
                              <span className="font-semibold text-slate-800">
                                ₹{itemUnitPrice.toLocaleString("en-IN")}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Quantity</span>
                              <span className="font-medium text-slate-700">
                                {itemQty.toFixed(2)} {itemUnit}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Net Amount</span>
                              <span className="font-semibold text-slate-800">
                                ₹{itemTotal.toLocaleString("en-IN")}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">
                                Total Tax ({itemTaxPercent.toFixed(1)}%)
                              </span>
                              <span className="font-medium text-slate-700">
                                ₹{itemTaxAmount.toLocaleString("en-IN")}
                              </span>
                            </div>

                            {/* Other Details */}
                            <div className="pt-2 border-t border-dashed border-slate-100">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                Other Details
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Purchase Price</span>
                                <span className="font-medium text-slate-700">
                                  ₹{itemPurchasePrice.toLocaleString("en-IN")}
                                </span>
                              </div>
                              <div className="flex justify-between mt-1">
                                <span className="text-emerald-600 font-semibold">
                                  Margin
                                </span>
                                <span className="font-bold text-emerald-600">
                                  ₹{itemMargin.toLocaleString("en-IN")}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* 3. Bill Summary */}
            <section>
              <h3 className="mb-1.5 px-0.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                Bill Summary
              </h3>
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span className="font-medium">
                    Subtotal ({items.length} items)
                  </span>
                  <span className="font-semibold text-slate-900">
                    ₹{subTotal.toLocaleString("en-IN")}
                  </span>
                </div>

                {discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span className="font-semibold">
                      −₹{discountTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {taxTotal > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax / GST</span>
                    <span className="font-semibold text-slate-800">
                      ₹{taxTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                  <span className="text-sm font-bold text-slate-900">
                    Total Amount
                  </span>
                  <span className="text-base font-bold text-slate-900">
                    ₹{grandTotal.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </section>

            {/* 4. Payment History */}
            <section>
              <h3 className="mb-1.5 px-0.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                Payment History
              </h3>
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">
                        ₹{paidAmount.toLocaleString("en-IN")}
                      </div>
                      <div className="text-xs font-medium text-slate-500">
                        {mode} • {paymentRef}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 text-slate-400">
                    <span className="text-xs font-medium text-slate-500">
                      {invoiceDateStr}
                    </span>
                    <ChevronRight size={16} />
                  </div>
                </div>

                {dueAmount > 0 && (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 border border-amber-200">
                    <span>Pending Due:</span>
                    <span>₹{dueAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}
              </div>
            </section>

            {/* 5. Others... */}
            <section>
              <h3 className="mb-1.5 px-0.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                Others...
              </h3>
              <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs divide-y divide-slate-100 overflow-hidden text-xs">
                {/* Bank Details */}
                <div className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <Landmark size={18} className="shrink-0 text-slate-700" />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-800">
                        {bankName}
                      </div>
                      <div className="text-slate-400 text-[11px]">Bank</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Change
                  </button>
                </div>

                {/* Signature */}
                <div className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <PenTool size={18} className="shrink-0 text-slate-700" />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-800">
                        {signatoryName}
                      </div>
                      <div className="text-slate-400 text-[11px]">Signature</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Change
                  </button>
                </div>

                {/* Reference */}
                <div className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <Tag size={18} className="shrink-0 text-slate-700" />
                    <div className="truncate font-semibold text-slate-800">
                      {raw.reference ? `Ref: ${raw.reference}` : "Reference"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Internal Notes */}
                <div className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={18} className="shrink-0 text-slate-700" />
                    <div className="truncate font-semibold text-slate-800">
                      {raw.notes ? raw.notes : "Internal Notes"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Attachments */}
                <div className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <Paperclip size={18} className="shrink-0 text-slate-700" />
                    <div className="truncate font-semibold text-slate-800">
                      Attachments
                    </div>
                  </div>
                  <button
                    type="button"
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {/* ============================================================== */}
      {/* C. FIXED BOTTOM ACTION PANEL                                   */}
      {/* Edit, Convert, Cancel, Delete                                  */}
      {/* ============================================================== */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/90 bg-white/95 px-3 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-[0_-8px_25px_rgba(0,0,0,0.06)] backdrop-blur-md">
        {/* Top subtle drag pill */}
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300" />

       <div className="grid w-full grid-cols-3 gap-2">
  {/* Convert Button */}
  <button
    type="button"
    disabled={isCancelled}
    onClick={() => onConvert(raw)}
    className="flex w-full min-w-0 items-center justify-center gap-1 rounded-full border border-blue-200/80 bg-blue-50/80 px-2 py-2.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
  >
    <ArrowLeftRight size={13} className="shrink-0 text-blue-600" />
    <span className="truncate">Convert</span>
  </button>

  {/* Cancel Invoice Button */}
  <button
    type="button"
    disabled={isCancelled}
    onClick={() => onCancelInvoice(raw)}
    className="flex w-full min-w-0 items-center justify-center gap-1 rounded-full border border-amber-200/80 bg-amber-50/80 px-2 py-2.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
  >
    <XCircle size={13} className="shrink-0 text-amber-600" />
    <span className="truncate">Cancel Invoice</span>
  </button>

  {/* Delete Invoice Button */}
  <button
    type="button"
    onClick={() => onDeleteInvoice(raw)}
    className="flex w-full min-w-0 items-center justify-center gap-1 rounded-full border border-rose-200/80 bg-rose-50/80 px-2 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 active:scale-95"
  >
    <Trash2 size={13} className="shrink-0 text-rose-600" />
    <span className="truncate">Delete</span>
  </button>
</div>
      </div>
    </div>
  );
}
