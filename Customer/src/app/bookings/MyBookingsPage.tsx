import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {Download} from 'lucide-react';
import {downloadCoworkingInvoice, fetchMyBookings, type CoworkingReceipt} from '../../services/coworkingCheckout.service';
import {getErrorMessage} from '../../services/axios';

const inr = (value: number) => `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;

const when = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
};

export default function MyBookingsPage() {
  const [rows, setRows] = useState<CoworkingReceipt[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyBookings()
      .then(setRows)
      .catch(err => setError(getErrorMessage(err, 'Could not load bookings.')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-dvh bg-[#FAFBFD] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-900">My Bookings</h1>
            <p className="text-sm text-slate-500">Coworking plans paid from your account.</p>
          </div>
          <Link to="/home" className="text-sm font-bold text-[#6344E7]">Home</Link>
        </div>
        {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2">Booking</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Start</th>
                  <th className="px-3 py-2">Paid</th>
                  <th className="px-3 py-2">Payment</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-bold text-slate-800">{row.bookingCode}</td>
                    <td className="px-3 py-3">
                      <p>{row.planName || row.spaceName}</p>
                      <p className="text-xs text-slate-400">{row.notes}</p>
                    </td>
                    <td className="px-3 py-3">{when(row.startDate)}</td>
                    <td className="px-3 py-3 font-bold">{inr(row.payable)}</td>
                    <td className="px-3 py-3">{row.paymentStatus === 'full' ? 'Paid' : row.paymentStatus || '—'}</td>
                    <td className="px-3 py-3">{row.status || '—'}</td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => downloadCoworkingInvoice(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#6344E7] px-2.5 py-1 text-xs font-bold text-[#6344E7]"
                      >
                        <Download size={13} /> Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && rows.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-slate-400">No coworking bookings yet.</p>
          ) : null}
          {loading ? <p className="px-3 py-8 text-center text-sm text-slate-400">Loading bookings…</p> : null}
        </div>
      </div>
    </div>
  );
}
