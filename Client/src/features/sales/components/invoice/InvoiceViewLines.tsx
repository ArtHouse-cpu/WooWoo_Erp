import {
  buildInvoiceViewLines,
  currentInvoiceTotal,
  originalInvoiceTotal,
  returnedInvoiceTotal,
  roundMoney,
} from "@/features/sales/utils/salesReturn";

function formatInr(value: number) {
  return roundMoney(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function InvoiceViewLines({invoice}: {invoice: any}) {
  const lines = buildInvoiceViewLines(invoice);
  const originalTotal = originalInvoiceTotal(invoice);
  const returnedTotal = returnedInvoiceTotal(invoice);
  const currentTotal = currentInvoiceTotal(invoice);

  if (!lines.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
        No products were sold on this invoice.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
          <tr>
            <th className="px-3 py-2 text-left">Item</th>
            <th className="px-3 py-2 text-center">Qty</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map(line => {
            const isReturn = line.kind === "return";
            return (
              <tr
                key={line.key}
                className={`border-t ${
                  isReturn
                    ? "border-rose-100 bg-rose-50/70"
                    : line.returnedQty > 0
                      ? "border-gray-100 bg-slate-50/80"
                      : "border-gray-100"
                }`}
              >
                <td className="px-3 py-2">
                  <p className={`font-medium ${isReturn ? "text-rose-800" : "text-gray-800"}`}>
                    {line.productName}
                  </p>
                  {!isReturn && line.returnedQty > 0 ? (
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Original {line.originalQty} · Returned {line.returnedQty} · Remaining{" "}
                      {line.remainingQty}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-center font-semibold">{line.qty}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      isReturn || line.status === "Returned"
                        ? "bg-rose-100 text-rose-700"
                        : line.status === "Partially returned"
                          ? "bg-amber-100 text-amber-800"
                          : line.isGift
                            ? "bg-pink-100 text-pink-700"
                            : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {line.status}
                  </span>
                </td>
                <td
                  className={`px-3 py-2 text-right font-extrabold ${
                    line.amount < 0 ? "text-rose-700" : "text-gray-900"
                  }`}
                >
                  {line.amount < 0 ? "−" : ""}₹{formatInr(Math.abs(line.amount))}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          {returnedTotal > 0 ? (
            <>
              <tr className="border-t border-gray-200 bg-white text-sm text-slate-600">
                <td className="px-3 py-2" colSpan={3}>
                  Original Invoice Total
                </td>
                <td className="px-3 py-2 text-right font-semibold">
                  ₹{formatInr(originalTotal)}
                </td>
              </tr>
              <tr className="text-sm text-rose-700">
                <td className="px-3 py-2" colSpan={3}>
                  Sales Return
                </td>
                <td className="px-3 py-2 text-right font-semibold">
                  −₹{formatInr(returnedTotal)}
                </td>
              </tr>
            </>
          ) : null}
          <tr className="border-t border-dashed border-gray-200 bg-slate-50 text-base">
            <td className="px-3 py-3 font-extrabold text-slate-900" colSpan={3}>
              Final Invoice Amount
            </td>
            <td className="px-3 py-3 text-right font-extrabold text-slate-900">
              ₹{formatInr(currentTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
