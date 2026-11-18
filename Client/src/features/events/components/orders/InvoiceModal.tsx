import { useRef } from "react";
import { X, Printer, Download, Sparkles } from "lucide-react";
import type { EventOrder } from "../../types/eventTypes";
import { formatInr } from "../../utils/eventHelpers";
import { useEventStore } from "../../store/eventStore";

interface InvoiceModalProps {
  order: EventOrder;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal = ({ order, isOpen, onClose }: InvoiceModalProps) => {
  const { globalSettings } = useEventStore();
  const invoiceRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const gstHalf = (order.taxAmount / 2);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-2 backdrop-blur-xs sm:p-4">
      <div className="flex h-auto max-h-[95dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header Toolbar */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
              Tax Invoice
            </span>
            <span className="font-mono text-xs font-semibold text-gray-500">
              {order.invoiceNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-orange-700"
            >
              <Printer size={13} /> Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Page */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <div
            ref={invoiceRef}
            className="mx-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xs text-xs text-gray-800 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-200"
          >
            {/* Top Branding & Invoice Title */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-5 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-600 text-white font-bold">
                    W
                  </span>
                  <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
                    {globalSettings.businessName || "WooWoo ArtHouse & Events"}
                  </h2>
                </div>
                <p className="mt-1 text-gray-500 max-w-sm text-[11px]">
                  {globalSettings.businessAddress || "BKC Avenue, Bandra East, Mumbai, Maharashtra 400051"}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  GSTIN: <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{globalSettings.gstin}</span>
                </p>
              </div>

              <div className="text-right">
                <h3 className="text-lg font-black uppercase text-gray-900 dark:text-white">
                  TAX INVOICE
                </h3>
                <p className="mt-1 font-mono font-bold text-orange-600">
                  {order.invoiceNumber}
                </p>
                <p className="text-[11px] text-gray-500">
                  Date: {new Date(order.bookingDate).toLocaleDateString("en-IN")}
                </p>
                <p className="text-[11px] text-gray-500">
                  Order Ref: <span className="font-mono">{order.orderNumber}</span>
                </p>
              </div>
            </div>

            {/* Bill To & Event Section */}
            <div className="grid grid-cols-2 gap-4 border-b border-gray-200 py-4 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Billed To (Customer):
                </span>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                  {order.customerName}
                </p>
                <p className="text-gray-500">{order.email}</p>
                <p className="text-gray-500">+91 {order.phone}</p>
              </div>

              <div className="text-right sm:text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Event Details:
                </span>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                  {order.eventName}
                </p>
                <p className="text-gray-500">{order.eventLocation}</p>
                <p className="text-gray-500">Date: {order.eventDate}</p>
              </div>
            </div>

            {/* Line items table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-gray-300">
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3">SAC Code</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {order.items?.map((item, i) => (
                    <tr key={i}>
                      <td className="py-3 px-3">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {item.ticketName}
                        </p>
                        {item.selectedSeats && (
                          <p className="text-[11px] text-gray-500">
                            Assigned Seats: {item.selectedSeats.join(", ")}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-500">998599</td>
                      <td className="py-3 px-3 text-center font-bold">{item.quantity}</td>
                      <td className="py-3 px-3 text-right font-mono">{formatInr(item.unitPrice)}</td>
                      <td className="py-3 px-3 text-right font-bold font-mono">
                        {formatInr(item.subtotal)}
                      </td>
                    </tr>
                  ))}

                  {order.convenienceFee > 0 && (
                    <tr>
                      <td className="py-2.5 px-3">Convenience & Booking Fee</td>
                      <td className="py-2.5 px-3 font-mono text-gray-500">998599</td>
                      <td className="py-2.5 px-3 text-center font-bold">1</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatInr(order.convenienceFee)}</td>
                      <td className="py-2.5 px-3 text-right font-bold font-mono">
                        {formatInr(order.convenienceFee)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations and Taxes */}
            <div className="mt-4 flex flex-col items-end border-t border-gray-200 pt-3 dark:border-slate-800">
              <div className="w-full max-w-xs space-y-1.5 text-right">
                <div className="flex justify-between text-gray-500">
                  <span>Taxable Value:</span>
                  <span className="font-mono">{formatInr(order.subtotal + order.convenienceFee)}</span>
                </div>

                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount:</span>
                    <span className="font-mono">- {formatInr(order.discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-500">
                  <span>CGST (9%):</span>
                  <span className="font-mono">+ {formatInr(gstHalf)}</span>
                </div>

                <div className="flex justify-between text-gray-500">
                  <span>SGST (9%):</span>
                  <span className="font-mono">+ {formatInr(gstHalf)}</span>
                </div>

                <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-sm text-gray-900 dark:border-slate-800 dark:text-white">
                  <span>Grand Total (INR):</span>
                  <span className="font-mono text-orange-600 text-base">
                    {formatInr(order.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sign & Stamp */}
            <div className="mt-8 flex items-end justify-between border-t border-gray-200 pt-5 dark:border-slate-800">
              <div className="max-w-xs text-[10px] text-gray-400">
                <p className="font-bold text-gray-600 dark:text-gray-300">Terms & Conditions:</p>
                <p className="mt-0.5">
                  This is a computer-generated invoice and requires no physical signature under GST Rule 46.
                </p>
              </div>

              <div className="text-right">
                <p className="font-bold text-gray-800 dark:text-gray-200">
                  For {globalSettings.businessName || "WooWoo ArtHouse Ltd."}
                </p>
                <div className="mt-3 inline-block rounded-md border border-gray-300 px-4 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
