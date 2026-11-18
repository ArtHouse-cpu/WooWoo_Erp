import { useState } from "react";
import {
  X,
  Download,
  Mail,
  Send,
  RotateCcw,
  Ban,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Ticket,
  Receipt,
  AlertTriangle,
} from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import type { EventOrder } from "../../types/eventTypes";
import { formatInr } from "../../utils/eventHelpers";
import { useEventStore } from "../../store/eventStore";
import { InvoiceModal } from "./InvoiceModal";

interface OrderDetailsModalProps {
  order: EventOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderDetailsModal = ({
  order,
  isOpen,
  onClose,
}: OrderDetailsModalProps) => {
  const { updateOrderStatus, cancelOrder } = useEventStore();
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  if (!isOpen || !order) return null;

  const handleResendConfirmation = () => {
    toast.success(`Confirmation email & entry pass resent to ${order.email}!`);
  };

  const handleCancelOrder = () => {
    Swal.fire({
      title: "Cancel this Order?",
      text: `Are you sure you want to cancel Order ${order.orderNumber}? This will revoke all ${order.totalQuantity} issued entry passes.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Cancel Order",
    }).then((result) => {
      if (result.isConfirmed) {
        cancelOrder(order.id);
        Swal.fire("Cancelled", "The order and entry passes have been cancelled.", "success");
        onClose();
      }
    });
  };

  const handleInitiateRefund = () => {
    Swal.fire({
      title: "Initiate Refund",
      html: `
        <p class="text-xs text-gray-500 mb-2">Total Order Value: <b>${formatInr(order.totalAmount)}</b></p>
        <input id="swal-refund-amount" type="number" class="swal2-input text-xs" value="${order.totalAmount}" placeholder="Refund Amount (₹)">
        <input id="swal-refund-reason" type="text" class="swal2-input text-xs" placeholder="Reason for refund">
      `,
      showCancelButton: true,
      confirmButtonColor: "#ea580c",
      confirmButtonText: "Process Refund",
      preConfirm: () => {
        const amount = (document.getElementById("swal-refund-amount") as HTMLInputElement)?.value;
        const reason = (document.getElementById("swal-refund-reason") as HTMLInputElement)?.value;
        if (!amount || parseFloat(amount) <= 0) {
          Swal.showValidationMessage("Please enter a valid refund amount");
        }
        return { amount: parseFloat(amount), reason };
      },
    }).then((res) => {
      if (res.isConfirmed) {
        updateOrderStatus(order.id, "Refunded", res.value.amount);
        Swal.fire({
          icon: "success",
          title: "Refund Processed",
          text: `Refund of ${formatInr(res.value.amount)} initiated via ${order.paymentMethod}.`,
        });
        onClose();
      }
    });
  };

  const getStatusBadge = (status: EventOrder["paymentStatus"]) => {
    switch (status) {
      case "Paid":
        return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300";
      case "Pending":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300";
      case "Refunded":
        return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300";
      case "Cancelled":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs">
        <div className="flex h-auto max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Order Details · {order.orderNumber}
                </h3>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${getStatusBadge(
                    order.paymentStatus
                  )}`}
                >
                  {order.paymentStatus}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Booked on {new Date(order.bookingDate).toLocaleString("en-IN")}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 text-xs custom-scrollbar space-y-5">
            {/* Customer Details Box */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Customer Information
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div>
                  <span className="text-gray-400 block text-[10px]">Full Name:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {order.customerName}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Email Address:</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {order.email}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Phone Number:</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    +91 {order.phone}
                  </span>
                </div>
              </div>
            </div>

            {/* Event & Item Lines */}
            <div className="rounded-xl border border-gray-200 p-4 dark:border-slate-800">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Booked Event & Tickets
              </h4>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 dark:border-slate-800">
                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">
                    {order.eventName}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {order.eventDate} · {order.eventLocation}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {order.items?.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-2.5 dark:bg-slate-800/60"
                  >
                    <div>
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        {item.ticketName}
                      </span>
                      <span className="ml-2 font-mono text-[11px] text-gray-500">
                        Qty: {item.quantity} × {formatInr(item.unitPrice)}
                      </span>
                      {item.selectedSeats && (
                        <p className="text-[10px] text-orange-600 font-semibold mt-0.5">
                          Seats: {item.selectedSeats.join(", ")}
                        </p>
                      )}
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {formatInr(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="rounded-xl border border-gray-200 p-4 dark:border-slate-800 space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Payment Breakdown
              </h4>

              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span>{formatInr(order.subtotal)}</span>
              </div>

              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount {order.couponCode ? `(${order.couponCode})` : ""}</span>
                  <span>- {formatInr(order.discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>GST / Taxes</span>
                <span>+ {formatInr(order.taxAmount)}</span>
              </div>

              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Convenience Fee</span>
                <span>+ {formatInr(order.convenienceFee)}</span>
              </div>

              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-sm text-gray-900 dark:border-slate-800 dark:text-white">
                <span>Grand Total</span>
                <span className="text-orange-600 text-base">{formatInr(order.totalAmount)}</span>
              </div>

              <div className="pt-2 text-[11px] text-gray-400 flex items-center justify-between">
                <span>Method: {order.paymentMethod}</span>
                {order.paymentReference && <span>Ref: {order.paymentReference}</span>}
                <span>Invoice: {order.invoiceNumber}</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              {order.paymentStatus === "Paid" && (
                <button
                  type="button"
                  onClick={handleInitiateRefund}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-2xs hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800"
                >
                  <RotateCcw size={13} /> Initiate Refund
                </button>
              )}

              {order.paymentStatus !== "Cancelled" && (
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-2xs hover:bg-gray-100 hover:text-red-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
                >
                  <Ban size={13} /> Cancel Order
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResendConfirmation}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
              >
                <Mail size={13} /> Resend Email & Pass
              </button>

              <button
                type="button"
                onClick={() => setInvoiceOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-orange-700"
              >
                <Download size={13} /> View Invoice
              </button>
            </div>
          </div>
        </div>
      </div>

      {invoiceOpen && (
        <InvoiceModal
          order={order}
          isOpen={invoiceOpen}
          onClose={() => setInvoiceOpen(false)}
        />
      )}
    </>
  );
};
