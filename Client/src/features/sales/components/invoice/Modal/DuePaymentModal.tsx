import  { useState } from "react";
import { X, Check, Banknote, CreditCard, Smartphone, Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import { handleUpdateInvoice } from "@/services/apiClient";
import { useAppSelector } from "@/store/hooks";

type Props = {
  open: boolean;
  onClose: () => void;
  invoice: any;
  onSuccess: () => void;
};

export default function DuePaymentModal({ open, onClose, invoice, onSuccess }: Props) {
  const [payAmount, setPayAmount] = useState<number>(invoice?.dueAmount );
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [loading, setLoading] = useState(false);
  const staff = useAppSelector((state) => state.user);

  if (!open || !invoice) return null;

  const handlePay = async () => {
    if (payAmount <= 0) {
      Swal.fire("Invalid amount", "Payment amount must be greater than 0", "warning");
      return;
    }
    if (payAmount > invoice.dueAmount) {
      Swal.fire("Invalid amount", `Payment cannot exceed due amount (₹${invoice.dueAmount})`, "warning");
      return;
    }

    try {
      setLoading(true);
      
      const currentBreakdown = invoice.raw?.paymentBreakdown || {
        cash: 0,
        upi: 0,
        card: 0,
        wallet: 0,
        paidAmount: 0,
        dueAmount: invoice.amount,
        changeAmount: 0,
      };

      const newPaidAmount = (currentBreakdown.paidAmount || 0) + payAmount;
      const newDueAmount = Math.max(0, (currentBreakdown.dueAmount || invoice.amount) - payAmount);
      
      const updatedBreakdown = {
        ...currentBreakdown,
        [paymentMode.toLowerCase()]: (currentBreakdown[paymentMode.toLowerCase()] || 0) + payAmount,
        paidAmount: newPaidAmount,
        dueAmount: newDueAmount,
      };

      const payload = {
        paymentStatus: (newDueAmount === 0 ? "full" : "partial") as "full" | "partial",
        paymentBreakdown: updatedBreakdown,
        // Also update top-level pendingAmount if backend uses it
        pendingAmount: newDueAmount,
        newPayment: {
          date: new Date().toISOString(),
          amount: payAmount,
          mode: paymentMode,
          receivedBy: staff?.m_staff_name || "Unknown",
        },
      };

      await handleUpdateInvoice(invoice._id, payload);
      
      Swal.fire("Success", "Payment recorded successfully", "success");
      onSuccess();
      onClose();
    } catch (error: any) {
      Swal.fire("Error", error?.response?.data?.message || "Failed to record payment", "error");
    } finally {
      setLoading(false);
    }
  };

  const items = Array.isArray(invoice.raw?.items)
    ? invoice.raw.items
    : Array.isArray(invoice.items)
      ? invoice.items
      : [];

  const formatInr = (value: number) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;

  const lineAmount = (item: any) => {
    const qty = Number(item.qty || 0);
    const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
    const discount = Number(item.discount || 0);
    if (Number.isFinite(Number(item.lineTotal))) {
      return Number(item.lineTotal);
    }
    return Math.max(0, qty * unitPrice - discount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Record Payment</h3>
            <p className="text-sm text-gray-500">Bill: {invoice.bill} | {invoice.customer}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left Side: Invoice Details */}
          <div className="border-r border-gray-100 p-6">
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Invoice Items</h4>
            <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-xs text-gray-400">
                  No products found on this invoice.
                </div>
              ) : (
                items.map((item: any, idx: number) => {
                  const name =
                    item.productName || item.name || item.description || "Item";
                  const qty = Number(item.qty || 0);
                  const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
                  const discount = Number(item.discount || 0);
                  return (
                    <div
                      key={item._id || `${name}-${idx}`}
                      className="flex justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-gray-800">
                          {name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {qty} × {formatInr(unitPrice)}
                          {discount > 0 ? ` · Disc ${formatInr(discount)}` : ""}
                        </div>
                      </div>
                      <div className="shrink-0 font-semibold text-gray-700">
                        {formatInr(lineAmount(item))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="mt-6 border-t border-dashed border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Amount</span>
                <span className="font-medium text-gray-800">{formatInr(invoice.amount)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Already Paid</span>
                <span className="font-medium">{formatInr(invoice.amount - invoice.dueAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-amber-700">
                <span>Current Due</span>
                <span>{formatInr(invoice.dueAmount)}</span>
              </div>
            </div>
          </div>

          {/* Right Side: Payment Form */}
          <div className="bg-slate-50/50 p-6">
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Accept Payment</h4>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Amount to Pay</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    max={invoice.dueAmount}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-7 pr-3 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                  />
                </div>
                <div className="mt-1 flex justify-between">
                  <button 
                    onClick={() => setPayAmount(invoice.dueAmount)}
                    className="text-[10px] font-medium text-violet-600 hover:underline"
                  >
                    Pay Full
                  </button>
                  {payAmount < invoice.dueAmount && (
                    <span className="text-[10px] text-gray-400">Remaining: ₹{invoice.dueAmount - payAmount}</span>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "Cash", icon: Banknote, color: "text-green-600", bg: "bg-green-50" },
                    { id: "UPI", icon: Smartphone, color: "text-indigo-600", bg: "bg-indigo-50" },
                    { id: "Card", icon: CreditCard, color: "text-blue-600", bg: "bg-blue-50" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setPaymentMode(mode.id)}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 transition-all ${
                        paymentMode === mode.id
                          ? "border-violet-500 bg-violet-50 ring-1 ring-violet-500"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <mode.icon size={18} className={paymentMode === mode.id ? "text-violet-600" : mode.color} />
                      <span className={`text-[10px] font-bold ${paymentMode === mode.id ? "text-violet-700" : "text-gray-600"}`}>
                        {mode.id}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={loading || payAmount <= 0}
                onClick={handlePay}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition-all hover:bg-violet-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check size={18} />
                )}
                Confirm Payment
              </button>
              
              <button
                onClick={onClose}
                className="w-full py-2 text-xs font-medium text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
