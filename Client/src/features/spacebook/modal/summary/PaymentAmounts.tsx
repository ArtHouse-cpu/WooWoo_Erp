const inr = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function PaymentAmounts({
  paidPrice,
  pendingPrice,
  paymentMethod,
}: {
  totalPrice: number;
  payPrice: number;
  paidPrice: number;
  pendingPrice: number;
  paymentMethod?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-xl border border-emerald-100/80 bg-emerald-50/90 px-3 py-2 text-xs font-semibold text-emerald-700">
        <span>Paid</span>
        <span>{inr(paidPrice)}</span>
      </div>
      {pendingPrice >= 1 ? (
        <div className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          <span>Balance due</span>
          <span>{inr(pendingPrice)}</span>
        </div>
      ) : null}
      {paymentMethod ? (
        <div className="flex items-center justify-between gap-3 px-1 text-[11px] text-slate-500">
          <span>Payment method</span>
          <span className="font-semibold text-slate-800">{paymentMethod}</span>
        </div>
      ) : null}
    </div>
  );
}
