import React, { useEffect } from "react";
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
} from "lucide-react";

export type PaymentEntry = {
  id: string;
  date: Date;
  type: "INFLOW" | "OUTFLOW";
  paymentNo: string;
  invoiceNo: string;
  partyName: string;
  partyType: "Customer" | "Supplier";
  amount: number;
  totalBill: number;
  dueAmount: number;
  paymentMethod: string;
  status: "Paid" | "Partial" | "Pending" | "Refunded" | "Cancelled";
  createdBy: string;
  notes?: string;
  breakdown?: {
    cash?: number;
    upi?: number;
    card?: number;
    wallet?: number;
    paidAmount?: number;
    dueAmount?: number;
  };
};

type Props = {
  open: boolean;
  onClose: () => void;
  payment: PaymentEntry | null;
};

export default function PaymentModal({ open, onClose, payment }: Props) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !payment) return null;

  const isInflow = payment.type === "INFLOW";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Receipt size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Payment Details</h3>
              <p className="text-xs text-gray-400">{payment.paymentNo}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Amount & Type Card */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div>
              <span className="text-xs text-gray-400 font-medium">Transacted Amount</span>
              <p
                className={`text-2xl font-bold mt-0.5 ${
                  isInflow ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {isInflow ? "+" : "-"} ₹ {payment.amount.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isInflow
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {isInflow ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                {isInflow ? "Received" : "Paid Out"}
              </span>
              <span className="text-xs font-medium text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200">
                {payment.status}
              </span>
            </div>
          </div>

          {/* Key Information Grid */}
          <div className="grid grid-cols-2 gap-3.5 text-xs">
            <div className="bg-gray-50/60 p-3 rounded-lg border border-gray-100">
              <span className="text-gray-400 block mb-0.5 font-medium">Payment ID</span>
              <span className="text-gray-900 font-semibold">{payment.paymentNo}</span>
            </div>

            <div className="bg-gray-50/60 p-3 rounded-lg border border-gray-100">
              <span className="text-gray-400 block mb-0.5 font-medium">Invoice / Bill No</span>
              <span className="text-blue-600 font-semibold">{payment.invoiceNo}</span>
            </div>

            <div className="bg-gray-50/60 p-3 rounded-lg border border-gray-100">
              <span className="text-gray-400 block mb-0.5 font-medium">Party Name</span>
              <span className="text-gray-900 font-semibold">{payment.partyName}</span>
            </div>

            <div className="bg-gray-50/60 p-3 rounded-lg border border-gray-100">
              <span className="text-gray-400 block mb-0.5 font-medium">Party Type</span>
              <span className="text-gray-900 font-semibold">{payment.partyType}</span>
            </div>

            <div className="bg-gray-50/60 p-3 rounded-lg border border-gray-100">
              <span className="text-gray-400 block mb-0.5 font-medium">Payment Method</span>
              <span className="text-gray-900 font-semibold">{payment.paymentMethod}</span>
            </div>

            <div className="bg-gray-50/60 p-3 rounded-lg border border-gray-100">
              <span className="text-gray-400 block mb-0.5 font-medium">Date & Time</span>
              <span className="text-gray-900 font-semibold">
                {payment.date.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}{" "}
                {payment.date.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>

            <div className="bg-gray-50/60 p-3 rounded-lg border border-gray-100">
              <span className="text-gray-400 block mb-0.5 font-medium">Total Bill</span>
              <span className="text-gray-900 font-semibold">
                ₹ {payment.totalBill.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="bg-gray-50/60 p-3 rounded-lg border border-gray-100">
              <span className="text-gray-400 block mb-0.5 font-medium">Due Amount</span>
              <span className="text-amber-600 font-semibold">
                ₹ {payment.dueAmount.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="col-span-2 bg-gray-50/60 p-3 rounded-lg border border-gray-100">
              <span className="text-gray-400 block mb-0.5 font-medium">Recorded By</span>
              <span className="text-gray-900 font-semibold">{payment.createdBy}</span>
            </div>

            {payment.notes && (
              <div className="col-span-2 bg-gray-50/60 p-3 rounded-lg border border-gray-100">
                <span className="text-gray-400 block mb-0.5 font-medium">Notes / Remarks</span>
                <span className="text-gray-800">{payment.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-100 px-6 py-3.5 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
