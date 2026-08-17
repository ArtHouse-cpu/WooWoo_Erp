import {useEffect, useState} from 'react';
import {handleGetReturnSales} from '@/services/apiClient';
import {
  currentInvoiceTotal,
  originalInvoiceTotal,
  returnedInvoiceTotal,
  roundMoney,
} from '@/features/sales/utils/salesReturn';

function formatInr(value: number) {
  return roundMoney(Number(value) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatWhen(value?: string | Date) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function InvoiceReturnHistory({
  invoiceId,
  invoice,
}: {
  invoiceId?: string | null;
  invoice?: any;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!invoiceId) return;
    let cancelled = false;
    setLoading(true);
    void handleGetReturnSales('', 100, undefined, invoiceId)
      .then(res => {
        if (cancelled) return;
        setRows(Array.isArray(res?.returnSales) ? res.returnSales : []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  if (!invoiceId) return null;

  const originalTotal = originalInvoiceTotal(invoice);
  const returnedTotal = returnedInvoiceTotal(invoice);
  const currentTotal = currentInvoiceTotal(invoice);

  return (
    <div className="pointer-events-auto mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-extrabold text-slate-900">Sales return history</h3>
      <p className="mt-1 text-[11px] text-slate-500">
        Original invoice data is kept. Returns reverse quantity and amount without deleting the
        original sale.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-slate-500">Original</p>
          <p className="font-bold text-slate-900">₹{formatInr(originalTotal)}</p>
        </div>
        <div className="rounded-xl bg-rose-50 p-2">
          <p className="text-rose-700">Returned</p>
          <p className="font-bold text-rose-800">−₹{formatInr(returnedTotal)}</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-2">
          <p className="text-blue-700">Current</p>
          <p className="font-bold text-blue-800">₹{formatInr(currentTotal)}</p>
        </div>
      </div>
      {loading ? (
        <p className="mt-3 text-xs text-slate-500">Loading returns…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">No sales returns for this invoice yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {rows.map(row => {
            const breakdown = row.refundBreakdown || {};
            const when = row.createdAt || row.refundedAt;
            const amount = Number(row.grandTotal) || 0;
            return (
              <div
                key={row._id || row.returnCode}
                className="rounded-xl border border-rose-100 bg-rose-50/40 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-900">{row.returnCode}</p>
                  <p className="text-[11px] text-rose-700 font-extrabold">
                    −₹{formatInr(amount)}
                  </p>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">
                  {formatWhen(when)} · Status: {String(row.status || 'final')} · Refund:{' '}
                  {row.refundMode || '—'}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Wallet ₹{formatInr(breakdown.wallet)} · Cash ₹{formatInr(breakdown.cash)} · UPI ₹
                  {formatInr(breakdown.upi)} · Card ₹{formatInr(breakdown.card)}
                </p>
                <ul className="mt-1 text-[11px] text-slate-600">
                  {(row.items || []).map((item: any, idx: number) => (
                    <li key={`${row.returnCode}-${idx}`}>
                      {item.productName} × {item.qty}
                      {item.isGift ? ' (Gift)' : ''} ·{' '}
                      <span className="font-semibold text-rose-700">
                        −₹
                        {formatInr(Number(item.refundAmount ?? item.lineTotal) || 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
