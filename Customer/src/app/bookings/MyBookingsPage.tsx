import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {Calendar, Coffee, Download, Home} from 'lucide-react';
import {downloadCoworkingInvoice, fetchMyBookings, type CoworkingReceipt} from '../../services/coworkingCheckout.service';
import {getErrorMessage} from '../../services/axios';

const inr = (value: number) => `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;

const when = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
};

const planDetails = (row: CoworkingReceipt) => {
  const notes = row.notes || '';
  const coworking = notes.match(/Coworking\s+([^.]*)/i)?.[1]?.trim() || '';
  const drink = row.drink || notes.match(/Drink:\s*([^.]*)/i)?.[1]?.trim() || '';
  const dates = coworking || [when(row.startDate), when(row.coworkingEnd)].filter(Boolean).join(' – ');
  return {dates, drink};
};

const statusTone = (status?: string) => {
  const value = String(status || '').toLowerCase();
  if (value.includes('cancel')) return 'bg-rose-50 text-rose-700';
  if (value.includes('complete') || value.includes('done')) return 'bg-slate-100 text-slate-600';
  return 'bg-violet-50 text-violet-700';
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
    <div className="min-h-dvh bg-[#F6F5FB] px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">My Bookings</h1>
            {/* <p className="mt-1 text-sm text-slate-500">Coworking plans paid from your account.</p> */}
          </div>
          <Link
            to="/home"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-bold text-[#6344E7] shadow-xs ring-1 ring-violet-100"
          >
            <Home size={14} />
            Home
          </Link>
        </div>

        {error ? (
          <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>
        ) : null}

        {loading ? (
          <div className="space-y-3">
            {[0, 1].map(item => (
              <div key={item} className="h-36 animate-pulse rounded-3xl bg-white ring-1 ring-slate-200" />
            ))}
          </div>
        ) : null}

        {!loading && rows.length === 0 && !error ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center shadow-xs ring-1 ring-slate-200">
            <p className="text-base font-black text-slate-900">No bookings yet</p>
            <Link
              to="/home"
              className="mt-4 inline-flex rounded-xl bg-[#6344E7] px-4 py-2.5 text-sm font-bold text-white"
            >
              Browse spaces
            </Link>
          </div>
        ) : null}

        {!loading && rows.length > 0 ? (
          <>
            <ul className="space-y-3 md:hidden">
              {rows.map(row => (
                <BookingCard key={row.id} row={row} />
              ))}
            </ul>

            <div className="hidden overflow-hidden rounded-3xl bg-white shadow-xs ring-1 ring-slate-200 md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Booking Code</th>
                    <th className="px-4 py-3">Booking Name</th>
                    <th className="px-4 py-3">Booking Dates</th>
                    <th className="px-4 py-3">Drink Type</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" >Download Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const detail = planDetails(row);
                    return (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-4 py-4 font-black text-slate-900">{row.bookingCode}</td>
                        <td className="px-4 py-4 font-semibold text-slate-800">{row.planName || row.spaceName}</td>
                        <td className="px-4 py-4 text-slate-600">{detail.dates || '—'}</td>
                        <td className="px-4 py-4 text-slate-600">{detail.drink || '—'}</td>
                        <td className="px-4 py-4">
                          <p className="font-black text-slate-900">{inr(row.payable)}</p>
                          {/* <p className="text-xs font-semibold text-emerald-700">
                            {row.paymentStatus || '—'}
                          </p> */}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusTone(row.status)}`}>
                            {row.status || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <InvoiceButton row={row} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function BookingCard({row}: {row: CoworkingReceipt}) {
  const detail = planDetails(row);
  return (
    <li className="rounded-3xl bg-white p-4 shadow-xs ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{row.bookingCode}</p>
          <p className="mt-0.5 truncate text-base font-black text-slate-900">{row.planName || row.spaceName}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(row.status)}`}>
          {row.status || '—'}
        </span>
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-slate-600">
        {detail.dates ? (
          <p className="flex items-center gap-2">
            <Calendar size={14} className="shrink-0 text-[#6344E7]" />
            <span>{detail.dates}</span>
          </p>
        ) : null}
        {detail.drink ? (
          <p className="flex items-center gap-2">
            <Coffee size={14} className="shrink-0 text-[#6344E7]" />
            <span>{detail.drink}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div>
          <p className="text-lg font-black text-slate-900">{inr(row.payable)}</p>
          <p className="text-xs font-semibold text-emerald-700">
            {row.paymentStatus === 'full' ? 'Paid' : row.paymentStatus || 'Payment pending'}
          </p>
        </div>
        <InvoiceButton row={row} />
      </div>
    </li>
  );
}

function InvoiceButton({row}: {row: CoworkingReceipt}) {
  return (
    <button
      type="button"
      onClick={() => downloadCoworkingInvoice(row)}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#6344E7] bg-white px-3 text-xs font-bold text-[#6344E7]"
    >
      <Download size={14} />
      Invoice
    </button>
  );
}
