import {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import axios from 'axios';
import {Download} from 'lucide-react';
import {ThermalPrint, type ThermalPrintProps} from '../../thermalPrint/ThermalPrint';
import {downloadThermalInvoicePdf} from '../../thermalPrint/downloadThermalInvoicePdf';
import {mapActivityInvoiceToThermalPrint} from './mapActivityInvoiceToThermalPrint';
import type {ActivityInvoiceDetail} from '../../types/auth';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

type PublicInvoice = ActivityInvoiceDetail & {
  customerName?: string;
  customerPhone?: string;
  membershipType?: string;
};

export default function PublicInvoicePage() {
  const {invoiceId} = useParams();
  const [bill, setBill] = useState<ThermalPrintProps | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const id = String(invoiceId || '').trim();
    if (!id) {
      setError('This bill link is not valid.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    axios
      .get<{success: boolean; data?: PublicInvoice; message?: string}>(
        `${API_BASE_URL}/public/invoices/${encodeURIComponent(id)}`,
      )
      .then(async ({data}) => {
        if (cancelled) return;
        const detail = data.data;
        if (!detail) {
          setError('Invoice not found.');
          return;
        }
        const props = mapActivityInvoiceToThermalPrint(detail, {
          name: detail.customerName,
          mobile: detail.customerPhone,
          membershipType: detail.membershipType,
        });
        setBill(props);
        setDownloading(true);
        try {
          await downloadThermalInvoicePdf(props);
        } catch {
          // The bill stays on screen if the browser blocks the automatic download.
        } finally {
          if (!cancelled) setDownloading(false);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = axios.isAxiosError(err)
          ? err.response?.data?.message
          : '';
        setError(message || 'Invoice not found.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  const downloadAgain = async () => {
    if (!bill) return;
    setDownloading(true);
    try {
      await downloadThermalInvoicePdf(bill);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#F4F6F8]">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">Your bill</p>
          <p className="truncate text-xs text-slate-500">
            {bill?.invoiceNo ? `Invoice ${bill.invoiceNo}` : 'WooWoo Art House'}
          </p>
        </div>
        {bill ? (
          <button
            type="button"
            onClick={() => void downloadAgain()}
            disabled={downloading}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#111111] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" />
            {downloading ? 'Downloading…' : 'Download invoice'}
          </button>
        ) : null}
      </div>

      <div className="px-3 py-4">
        {loading ? (
          <p className="py-16 text-center text-sm font-semibold text-slate-500">
            Opening your bill…
          </p>
        ) : error ? (
          <p className="py-16 text-center text-sm font-semibold text-slate-600">{error}</p>
        ) : bill ? (
          <div className="overflow-x-auto">
            <ThermalPrint {...bill} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
