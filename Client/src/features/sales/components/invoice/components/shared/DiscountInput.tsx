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
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Discount</label>
      <div className="flex rounded-lg border border-gray-300 bg-white p-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onTypeChange("flat")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            valueType === "flat" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          INR Flat
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onTypeChange("percentage")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            valueType === "percentage"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          %
        </button>
      </div>
      <input
        type="number"
        min="0"
        step="0.01"
        disabled={disabled}
        value={valueAmount}
        onChange={(e) => onValueChange(Number(e.target.value) || 0)}
        placeholder={valueType === "flat" ? "Discount in INR" : "Discount in %"}
        className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
