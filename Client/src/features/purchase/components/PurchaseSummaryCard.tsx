export type ManualDiscountType = "flat" | "percentage";

type Props = {
  subTotal: number;
  discountTotal: number;
  /** Entered manual discount value (₹ or %) */
  manualDiscount?: number;
  manualDiscountType?: ManualDiscountType;
  onManualDiscountChange?: (value: number) => void;
  onManualDiscountTypeChange?: (type: ManualDiscountType) => void;
  readOnly?: boolean;
  grandTotal: number;
  onSave: () => void;
  isSaving?: boolean;
  title?: string;
  saveLabel?: string;
};

/** Applied manual discount in ₹ (capped so grand total never goes negative). */
export function computeManualDiscountAmount(
  subTotal: number,
  lineDiscountTotal: number,
  value: number,
  type: ManualDiscountType = "flat",
): number {
  const remaining = Math.max(0, subTotal - lineDiscountTotal);
  const safeValue = Math.max(0, Number(value) || 0);
  if (type === "percentage") {
    const pct = Math.min(100, safeValue);
    return Math.min(remaining, (remaining * pct) / 100);
  }
  return Math.min(remaining, safeValue);
}

export default function PurchaseSummaryCard({
  subTotal,
  discountTotal,
  manualDiscount = 0,
  manualDiscountType = "flat",
  onManualDiscountChange,
  onManualDiscountTypeChange,
  readOnly = false,
  grandTotal,
  onSave,
  isSaving = false,
  title = "Purchase Summary",
  saveLabel = "Save Purchase",
}: Props) {
  const canEditManual =
    Boolean(onManualDiscountChange) &&
    Boolean(onManualDiscountTypeChange) &&
    !readOnly;
  const safeValue = Math.max(0, Number(manualDiscount) || 0);
  const type: ManualDiscountType =
    manualDiscountType === "percentage" ? "percentage" : "flat";
  const appliedAmount = computeManualDiscountAmount(
    subTotal,
    discountTotal,
    safeValue,
    type,
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">{title}</h3>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-gray-600">
          <span>Sub Total</span>
          <span>₹ {subTotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-gray-600">
          <span>Discount</span>
          <span>- ₹ {discountTotal.toFixed(2)}</span>
        </div>

        <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/40 px-3 py-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700">
              Manual Discount
            </span>
            {!canEditManual && (
              <span className="text-sm font-medium text-red-600">
                {type === "percentage"
                  ? `${safeValue.toFixed(2)}% (− ₹ ${appliedAmount.toFixed(2)})`
                  : `- ₹ ${appliedAmount.toFixed(2)}`}
              </span>
            )}
          </div>

          {canEditManual ? (
            <div className="space-y-2">
              <div className="flex rounded-md border border-blue-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => onManualDiscountTypeChange?.("flat")}
                  className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold transition ${
                    type === "flat"
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  ₹ Flat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onManualDiscountTypeChange?.("percentage");
                    if (safeValue > 100) onManualDiscountChange?.(100);
                  }}
                  className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold transition ${
                    type === "percentage"
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  %
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 shrink-0 text-xs text-slate-500">
                  {type === "percentage" ? "%" : "₹"}
                </span>
                <input
                  type="number"
                  min={0}
                  max={type === "percentage" ? 100 : undefined}
                  step="0.01"
                  value={safeValue}
                  onChange={(e) => {
                    let next = Math.max(0, Number(e.target.value) || 0);
                    if (type === "percentage") next = Math.min(100, next);
                    onManualDiscountChange?.(next);
                  }}
                  placeholder={type === "percentage" ? "0" : "0.00"}
                  className="h-9 w-full rounded-md border border-blue-200 bg-white px-2.5 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              {type === "percentage" && safeValue > 0 ? (
                <p className="text-[11px] font-medium text-red-600">
                  Applied: − ₹ {appliedAmount.toFixed(2)}
                </p>
              ) : null}
            </div>
          ) : null}

          <p className="mt-1.5 text-[10px] leading-snug text-slate-500">
            Extra bill-level discount on top of line discounts (flat ₹ or %).
          </p>
        </div>

        <div className="my-2 border-t border-dashed border-gray-200" />
        <div className="flex items-center justify-between text-base font-semibold text-gray-900">
          <span>Grand Total</span>
          <span>₹ {grandTotal.toFixed(2)}</span>
        </div>
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="mt-4 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isSaving ? "Saving..." : saveLabel}
        </button>
      )}
    </div>
  );
}
