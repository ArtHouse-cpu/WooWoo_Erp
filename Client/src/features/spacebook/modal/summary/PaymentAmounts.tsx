const inr = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function PaymentAmounts({
  totalPrice,
  payPrice,
  paidPrice,
  pendingPrice,
}: {
  totalPrice: number;
  payPrice: number;
  paidPrice: number;
  pendingPrice: number;
}) {
  return (
    <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
      <div className="flex items-center justify-between text-slate-600">
        <span>Total price</span>
        <span className="font-semibold text-slate-900">{inr(totalPrice)}</span>
      </div>
      <div className="flex items-center justify-between text-slate-600">
        <span>Pay price</span>
        <span className="font-semibold text-slate-900">{inr(payPrice)}</span>
      </div>
      <div className="flex items-center justify-between text-slate-600">
        <span>Paid price</span>
        <span className="font-semibold text-emerald-700">{inr(paidPrice)}</span>
      </div>
      {pendingPrice > 0 ? (
        <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 font-semibold text-amber-700">
          <span>Pending price</span>
          <span>{inr(pendingPrice)}</span>
        </div>
      ) : null}
    </div>
  );
}
