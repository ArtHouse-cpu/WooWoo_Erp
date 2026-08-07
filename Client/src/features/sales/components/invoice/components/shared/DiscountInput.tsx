type DiscountType = "flat" | "percentage";

type Props = {
  valueType: DiscountType;
  valueAmount: number;
  onTypeChange: (type: DiscountType) => void;
  onValueChange: (value: number) => void;
  disabled?: boolean;
};

export default function DiscountInput({
  valueType,
  valueAmount,
  onTypeChange,
  onValueChange,
  disabled = false,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onTypeChange("flat")}
          className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition ${
            valueType === "flat"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-white hover:text-slate-900"
          }`}
        >
          ₹ Flat
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onTypeChange("percentage")}
          className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition ${
            valueType === "percentage"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-white hover:text-slate-900"
          }`}
        >
          %
        </button>
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
          {valueType === "percentage" ? "%" : "₹"}
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          disabled={disabled}
          value={valueAmount}
          onChange={(e) => onValueChange(Number(e.target.value) || 0)}
          placeholder={valueType === "flat" ? "0.00" : "0"}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white py-2 pl-7 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
        />
      </div>
    </div>
  );
}
