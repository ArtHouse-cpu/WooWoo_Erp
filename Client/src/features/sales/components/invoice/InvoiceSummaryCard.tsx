type ExtraCharge = {
  label: string;
  amount: number;
};

type PaymentBreakdown = {
  cash?: number;
  upi?: number;
  card?: number;
  wallet?: number;
  paidAmount?: number;
  dueAmount?: number;
  changeAmount?: number;
};

type Props = {
  subTotal: number;
  discountTotal: number;
  productDiscountTotal?: number;
  membershipDiscountTotal?: number;
  cashbackTotal?: number;
  couponDiscount?: number;
  couponCode?: string;
  referralDiscount?: number;
  referralLabel?: string;
  extraCharges?: ExtraCharge[];
  onExtraChargesChange?: (val: ExtraCharge[]) => void;
  grandTotal: number;
  onSave: () => void;
  isSaving?: boolean;
  /** Hide checkout CTA and extra-charge editors (view modal). */
  readOnly?: boolean;
  /** View-mode payment details (from saved invoice). */
  paymentMode?: string;
  paymentStatus?: string;
  paymentBreakdown?: PaymentBreakdown | null;
  /** Original invoice total before sales returns. */
  returnedTotal?: number;
  /** Override heading (default Invoice Summary). */
  title?: string;
};

function formatPaymentMode(
  mode?: string,
  breakdown?: PaymentBreakdown | null,
): string {
  const raw = String(mode ?? "").trim().toUpperCase();
  const b = breakdown || {};
  const cash = Number(b.cash || 0);
  const upi = Number(b.upi || 0);
  const card = Number(b.card || 0);
  const wallet = Number(b.wallet || 0);

  if (raw === "MULTI") {
    const parts: string[] = [];
    if (cash > 0) parts.push(`Cash ₹${cash.toFixed(0)}`);
    if (upi > 0) parts.push(`UPI ₹${upi.toFixed(0)}`);
    if (card > 0) parts.push(`Card ₹${card.toFixed(0)}`);
    if (wallet > 0) parts.push(`Wallet ₹${wallet.toFixed(0)}`);
    return parts.join(" · ") || "Multi-mode";
  }
  if (!raw) return "—";
  if (raw === "UPI") return "UPI";
  return raw.charAt(0) + raw.slice(1).toLowerCase();
}

function formatPaymentStatus(status?: string, dueAmount = 0): string {
  // Any remaining due amount → Pending
  if (Number(dueAmount) > 0.001) return "Pending";
  const s = String(status ?? "").toLowerCase();
  if (s === "due") return "Pending";
  if (s === "partial") return "Pending";
  if (s === "full" || s === "paid") return "Paid (Full)";
  if (s === "pending") return "Pending";
  if (s) return s.charAt(0).toUpperCase() + s.slice(1);
  return "Paid (Full)";
}

export default function InvoiceSummaryCard({
  subTotal,
  discountTotal,
  productDiscountTotal = 0,
  membershipDiscountTotal = 0,
  cashbackTotal = 0,
  couponDiscount = 0,
  couponCode = "",
  referralDiscount = 0,
  referralLabel = "Referral Discount",
  extraCharges = [],
  onExtraChargesChange,
  grandTotal,
  onSave,
  isSaving = false,
  readOnly = false,
  paymentMode,
  paymentStatus,
  paymentBreakdown = null,
  returnedTotal = 0,
  title = "Invoice Summary",
}: Props) {
  const isQuotationSummary = title.toLowerCase().includes("quotation");
  const billSavings =
    Math.max(0, productDiscountTotal) +
    Math.max(0, membershipDiscountTotal) +
    Math.max(0, couponDiscount) +
    Math.max(0, referralDiscount);
  const addCharge = () => {
    onExtraChargesChange?.([...extraCharges, { label: "Extra Charge", amount: 0 }]);
  };

  const removeCharge = (index: number) => {
    const next = [...extraCharges];
    next.splice(index, 1);
    onExtraChargesChange?.(next);
  };

  const updateCharge = (
    index: number,
    field: keyof ExtraCharge,
    value: string | number,
  ) => {
    const next = [...extraCharges];
    next[index] = {
      ...next[index],
      [field]: field === "amount" ? Number(value) : value,
    };
    onExtraChargesChange?.(next);
  };

  const paidAmount = Number(
    paymentBreakdown?.paidAmount ??
      (Number(paymentBreakdown?.cash || 0) +
        Number(paymentBreakdown?.upi || 0) +
        Number(paymentBreakdown?.card || 0) +
        Number(paymentBreakdown?.wallet || 0)),
  );
  const dueAmount = Number(
    paymentBreakdown?.dueAmount ?? Math.max(0, grandTotal - paidAmount),
  );
  const salesReturnTotal = Math.max(0, Number(returnedTotal) || 0);
  const currentTotal = Math.max(0, grandTotal - salesReturnTotal);
  const showPaymentBlock =
    readOnly &&
    (Boolean(paymentMode) ||
      Boolean(paymentStatus) ||
      paymentBreakdown != null);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">
        {title}
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-gray-600">
          <span>Sub Total</span>
          <span>₹ {subTotal.toFixed(2)}</span>
        </div>
        {productDiscountTotal > 0 || membershipDiscountTotal > 0 ? (
          <>
            {productDiscountTotal > 0 && (
              <div className="flex items-center justify-between text-sky-700">
                <span>Product Discount</span>
                <span>- ₹ {productDiscountTotal.toFixed(2)}</span>
              </div>
            )}
            {membershipDiscountTotal > 0 && (
              <div className="flex items-center justify-between text-indigo-700">
                <span>Membership Discount</span>
                <span>- ₹ {membershipDiscountTotal.toFixed(2)}</span>
              </div>
            )}
          </>
        ) : discountTotal > 0 ? (
          <div className="flex items-center justify-between text-gray-600">
            <span>Discount</span>
            <span>- ₹ {discountTotal.toFixed(2)}</span>
          </div>
        ) : null}
        {couponDiscount > 0 && (
          <div className="flex items-center justify-between text-violet-700">
            <span>
              Coupon{couponCode ? ` (${couponCode})` : ""}
            </span>
            <span>- ₹ {couponDiscount.toFixed(2)}</span>
          </div>
        )}
        {referralDiscount > 0 && (
          <div className="flex items-center justify-between text-green-700">
            <span>{referralLabel || "Referral Discount"}</span>
            <span>- ₹ {referralDiscount.toFixed(2)}</span>
          </div>
        )}
        {cashbackTotal > 0 && (
          <div className="flex items-center justify-between text-emerald-600 font-medium">
            <span>
              {isQuotationSummary
                ? "Cashback to wallet (not deducted)"
                : "Cashback (Credited to Wallet)"}
            </span>
            <span>+ ₹ {cashbackTotal.toFixed(2)}</span>
          </div>
        )}
        {isQuotationSummary && cashbackTotal > 0 && (
          <p className="text-[10px] leading-snug text-gray-500">
            Credited to the customer wallet on purchase. It does not reduce the
            quoted amount.
          </p>
        )}
        {extraCharges.map((charge, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-1 border-t border-slate-50 pt-2 first:border-t-0"
          >
            <div className="flex items-center justify-between">
              {readOnly ? (
                <>
                  <span className="text-xs text-slate-500">{charge.label}</span>
                  <span className="text-xs text-slate-700">
                    ₹ {Number(charge.amount || 0).toFixed(2)}
                  </span>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={charge.label}
                    onChange={(e) => updateCharge(idx, "label", e.target.value)}
                    placeholder="Charge Name"
                    className="w-1/2 rounded border border-slate-100 bg-transparent px-1 py-0.5 text-xs text-slate-500 focus:border-blue-300 outline-none"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">₹</span>
                    <input
                      type="number"
                      value={charge.amount || ""}
                      onChange={(e) =>
                        updateCharge(idx, "amount", e.target.value)
                      }
                      placeholder="0"
                      className="w-16 rounded border border-slate-200 px-1 py-0.5 text-right text-xs focus:border-blue-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeCharge(idx)}
                      className="ml-1 text-slate-300 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        {!readOnly && (
          <button
            type="button"
            onClick={addCharge}
            className="text-left text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700"
          >
            + Add Extra Charge
          </button>
        )}
        <div className="my-2 border-t border-dashed border-gray-200" />
        {salesReturnTotal > 0 ? (
          <>
            <div className="flex items-center justify-between text-gray-600">
              <span>Original Invoice Total</span>
              <span>₹ {grandTotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-rose-700">
              <span>Sales Return</span>
              <span>− ₹ {salesReturnTotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold text-gray-900">
              <span>Current Invoice Total</span>
              <span>₹ {currentTotal.toFixed(2)}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between text-base font-semibold text-gray-900">
            <span>{isQuotationSummary ? "Quoted Amount" : "Grand Total"}</span>
            <span>₹ {grandTotal.toFixed(2)}</span>
          </div>
        )}
        {isQuotationSummary && (billSavings > 0 || cashbackTotal > 0) && (
          <div className="mt-2 space-y-1 rounded-md bg-slate-50 px-2 py-2 text-[11px] leading-snug text-slate-600">
            {billSavings > 0 ? (
              <div>
                This quotation saves ₹ {billSavings.toFixed(2)} on the bill
                {membershipDiscountTotal > 0
                  ? ` (includes membership ₹ ${membershipDiscountTotal.toFixed(2)})`
                  : ""}
                .
              </div>
            ) : null}
            {cashbackTotal > 0 ? (
              <div>
                Extra cashback ₹ {cashbackTotal.toFixed(2)} goes to wallet on
                purchase and is not subtracted from the quoted amount.
              </div>
            ) : null}
          </div>
        )}

        {showPaymentBlock && (
          <>
            <div className="my-2 border-t border-dashed border-gray-200" />
            <div className="flex items-center justify-between text-gray-700">
              <span>Payment Mode</span>
              <span className="font-medium text-right max-w-[60%]">
                {formatPaymentMode(paymentMode, paymentBreakdown)}
              </span>
            </div>
            <div className="flex items-center justify-between text-gray-700">
              <span>Payment Status</span>
              <span
                className={`font-semibold ${
                  dueAmount > 0 ? "text-amber-600" : "text-emerald-600"
                }`}
              >
                {formatPaymentStatus(paymentStatus, dueAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-gray-600">
              <span>Paid</span>
              <span>₹ {paidAmount.toFixed(2)}</span>
            </div>
            {salesReturnTotal > 0 && (
              <div className="flex items-center justify-between text-rose-700">
                <span>Refunded</span>
                <span>− ₹ {salesReturnTotal.toFixed(2)}</span>
              </div>
            )}
            {dueAmount > 0 && (
              <div className="flex items-center justify-between text-amber-700 font-medium">
                <span>Due</span>
                <span>₹ {dueAmount.toFixed(2)}</span>
              </div>
            )}
          </>
        )}
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="mt-4 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
        >
          {isSaving ? "Paid" : "Checkout"}
        </button>
      )}
    </div>
  );
}
