import {
  CreditCard,
  FileSpreadsheet,
  Receipt,
  Percent,
  CheckCircle2,
  DollarSign,
  Building,
} from "lucide-react";
import type { EventItem, InvoicePaymentSettings } from "../../types/eventTypes";
import { formatInr } from "../../utils/eventHelpers";

interface Step8InvoicesProps {
  event: EventItem;
  onChange: (updates: Partial<EventItem>) => void;
}

export const Step8Invoices = ({ event, onChange }: Step8InvoicesProps) => {
  const payment = event.paymentSettings;

  const handleUpdate = (updates: Partial<InvoicePaymentSettings>) => {
    onChange({
      paymentSettings: {
        ...payment,
        ...updates,
      },
    });
  };

  // Demo calculations for price breakdown
  const sampleTicketPrice = event.tickets[0]?.price || 1499;
  const gstAmount = payment.taxEnabled
    ? Math.round((sampleTicketPrice * payment.gstRatePercent) / 100)
    : 0;
  const totalPayable = sampleTicketPrice + gstAmount + payment.convenienceFeeAmount;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Settings Form (7 cols) */}
      <div className="space-y-6 lg:col-span-7">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
            Payment Gateways, GST & Automated Invoicing
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Configure Razorpay online payments, cash collection at gate, tax slabs, and legal GST invoices.
          </p>

          <div className="mt-5 space-y-5 text-xs">
            {/* Currency & Gateway */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Billing Currency
                </label>
                <select
                  value={payment.currency}
                  onChange={(e) => handleUpdate({ currency: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800"
                >
                  <option value="INR">INR (₹) - Indian Rupee (Default)</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Payment Collection Method
                </label>
                <select
                  value={payment.paymentGateway}
                  onChange={(e) =>
                    handleUpdate({
                      paymentGateway: e.target.value as InvoicePaymentSettings["paymentGateway"],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800"
                >
                  <option value="Razorpay">Razorpay Online (UPI, Cards, NetBanking)</option>
                  <option value="CashOnEntry">Pay at Venue / Gate Cash</option>
                  <option value="Both">Both (Online Payment & Pay at Gate)</option>
                </select>
              </div>
            </div>

            {/* Razorpay Gateway Keys */}
            {(payment.paymentGateway === "Razorpay" || payment.paymentGateway === "Both") && (
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-orange-600" />
                    <span className="font-bold text-gray-900 dark:text-white">
                      Razorpay Gateway Integration
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 font-semibold text-orange-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={payment.isTestMode}
                      onChange={(e) => handleUpdate({ isTestMode: e.target.checked })}
                    />
                    Sandbox / Test Mode
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Razorpay Key ID
                    </label>
                    <input
                      type="text"
                      value={payment.razorpayKeyId}
                      onChange={(e) => handleUpdate({ razorpayKeyId: e.target.value })}
                      placeholder="rzp_live_..."
                      className="mt-1 w-full rounded-lg border border-gray-200 p-2 font-mono dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Razorpay Key Secret
                    </label>
                    <input
                      type="password"
                      value={payment.razorpayKeySecret || "••••••••••••••••"}
                      onChange={(e) => handleUpdate({ razorpayKeySecret: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-200 p-2 font-mono dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tax & GST */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={payment.taxEnabled}
                    onChange={(e) => handleUpdate({ taxEnabled: e.target.checked })}
                  />
                  Enable GST / Tax
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    disabled={!payment.taxEnabled}
                    value={payment.gstRatePercent}
                    onChange={(e) =>
                      handleUpdate({ gstRatePercent: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full rounded-lg border border-gray-200 p-2 font-bold dark:bg-slate-800 disabled:opacity-50"
                  />
                  <span className="font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Convenience Fee (₹)
                </label>
                <input
                  type="number"
                  value={payment.convenienceFeeAmount}
                  onChange={(e) =>
                    handleUpdate({ convenienceFeeAmount: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Platform Fee (₹)
                </label>
                <input
                  type="number"
                  value={payment.platformFeeAmount}
                  onChange={(e) =>
                    handleUpdate({ platformFeeAmount: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800 font-bold"
                />
              </div>
            </div>

            {/* Invoicing Settings */}
            <div className="border-t border-gray-100 pt-4 dark:border-slate-800">
              <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px] mb-3">
                Invoice Numbering & Company Details
              </h4>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300">
                    Invoice Prefix
                  </label>
                  <input
                    type="text"
                    value={payment.invoicePrefix}
                    onChange={(e) => handleUpdate({ invoicePrefix: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 font-mono dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300">
                    Company GSTIN
                  </label>
                  <input
                    type="text"
                    value={payment.gstin}
                    onChange={(e) => handleUpdate({ gstin: e.target.value })}
                    placeholder="27AABCV1234F1Z8"
                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 font-mono uppercase dark:bg-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-gray-700 dark:text-gray-300">
                    Registered Business Name
                  </label>
                  <input
                    type="text"
                    value={payment.businessName}
                    onChange={(e) => handleUpdate({ businessName: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-gray-700 dark:text-gray-300">
                    Registered Business Address (printed on invoices)
                  </label>
                  <input
                    type="text"
                    value={payment.businessAddress}
                    onChange={(e) => handleUpdate({ businessAddress: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Checkout Price Breakdown Preview (5 cols) */}
      <div className="lg:col-span-5">
        <div className="sticky top-4 rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-xs">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-slate-800">
            <span className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-gray-200">
              <Receipt size={16} className="text-orange-600" />
              Checkout Price Breakdown
            </span>
            <span className="text-[10px] text-gray-400 font-mono">Sample Calculation</span>
          </div>

          <div className="mt-4 space-y-2.5">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Base Ticket Price (1x {event.tickets[0]?.name || "Standard"})</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatInr(sampleTicketPrice)}
              </span>
            </div>

            {payment.taxEnabled && (
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>
                  GST ({payment.gstRatePercent}%) – CGST + SGST
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  + {formatInr(gstAmount)}
                </span>
              </div>
            )}

            {payment.convenienceFeeAmount > 0 && (
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Platform & Convenience Fee</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  + {formatInr(payment.convenienceFeeAmount)}
                </span>
              </div>
            )}

            <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between font-bold text-sm text-gray-900 dark:border-slate-800 dark:text-white">
              <span>Total Attendee Pays</span>
              <span className="text-orange-600 text-base">
                {formatInr(totalPayable)}
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-gray-50 p-3 text-[11px] text-gray-500 dark:bg-slate-800/60">
            <p className="font-bold text-gray-700 dark:text-gray-300">
              Automated Invoice Generation:
            </p>
            <p className="mt-0.5">
              Upon successful payment, an official GST tax invoice with prefix{" "}
              <code className="font-mono text-orange-600">{payment.invoicePrefix}</code> will be
              automatically generated and emailed to the attendee.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
