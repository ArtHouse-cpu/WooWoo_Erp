type ExtraCharge = {
  label: string;
  amount: number;
};

type Props = {
  subTotal: number;
  discountTotal: number;
  cashbackTotal?: number;
  extraCharges?: ExtraCharge[];
  onExtraChargesChange?: (val: ExtraCharge[]) => void;
  grandTotal: number;
  onSave: () => void;
  isSaving?: boolean;
};

export default function InvoiceSummaryCard({
  subTotal,
  discountTotal,
  cashbackTotal = 0,
  extraCharges = [],
  onExtraChargesChange,
  grandTotal,
  onSave,
  isSaving = false,
}: Props) {
  const addCharge = () => {
    onExtraChargesChange?.([...extraCharges, { label: "Extra Charge", amount: 0 }]);
  };

  const removeCharge = (index: number) => {
    const next = [...extraCharges];
    next.splice(index, 1);
    onExtraChargesChange?.(next);
  };

  const updateCharge = (index: number, field: keyof ExtraCharge, value: string | number) => {
    const next = [...extraCharges];
    next[index] = { ...next[index], [field]: field === "amount" ? Number(value) : value };
    onExtraChargesChange?.(next);
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">Invoice Summary</h3>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-gray-600">
          <span>Sub Total</span>
          <span>₹ {subTotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-gray-600">
          <span>Discount</span>
          <span>- ₹ {discountTotal.toFixed(2)}</span>
        </div>
        {cashbackTotal > 0 && (
          <div className="flex items-center justify-between text-emerald-600 font-medium">
            <span>Cashback (Credit to Wallet)</span>
            <span>+ ₹ {cashbackTotal.toFixed(2)}</span>
          </div>
        )}
        {extraCharges.map((charge, idx) => (
          <div key={idx} className="flex flex-col gap-1 border-t border-slate-50 pt-2 first:border-t-0">
            <div className="flex items-center justify-between">
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
                  onChange={(e) => updateCharge(idx, "amount", e.target.value)}
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
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addCharge}
          className="text-left text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700"
        >
          + Add Extra Charge
        </button>
        <div className="my-2 border-t border-dashed border-gray-200" />
        <div className="flex items-center justify-between text-base font-semibold text-gray-900">
          <span>Grand Total</span>
          <span>₹ {grandTotal.toFixed(2)}</span>  
        </div>
      </div>
      <button
        onClick={onSave}
        disabled={isSaving}
        className="mt-4 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
      >
        {isSaving ? "Paid" : "Checkout"}
      </button>
    </div>
  );
}
