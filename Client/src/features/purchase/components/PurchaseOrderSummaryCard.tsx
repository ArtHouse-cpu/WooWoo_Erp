type Props = {
  subTotal: number;
  discountTotal: number;
  grandTotal: number;
  onSave: () => void;
  isSaving?: boolean;
};

export default function PurchaseSummaryCard({
  subTotal,
  discountTotal,
  grandTotal,
  onSave,
  isSaving = false,
}: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">Purchase Order Summary</h3>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-gray-600">
          <span>Sub Total</span>
          <span>₹ {subTotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-gray-600">
          <span>Discount</span>
          <span>- ₹ {discountTotal.toFixed(2)}</span>
        </div>
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
        {isSaving ? "Saving..." : "Save Purchase Order"}
      </button>
    </div>
  );
}
