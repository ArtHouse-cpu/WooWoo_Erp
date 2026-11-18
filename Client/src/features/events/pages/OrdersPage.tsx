import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Download,
  Receipt,
  Mail,
  RotateCcw,
  Ban,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  FileSpreadsheet,
} from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useEventStore } from "../store/eventStore";
import type { EventOrder, PaymentStatus } from "../types/eventTypes";
import { formatInr } from "../utils/eventHelpers";
import { exportOrdersToCsv } from "../utils/ticketExport";
import { OrderDetailsModal } from "../components/orders/OrderDetailsModal";
import { InvoiceModal } from "../components/orders/InvoiceModal";

export const OrdersPage = () => {
  const { orders, updateOrderStatus, cancelOrder } = useEventStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | PaymentStatus>("All");
  const [selectedOrder, setSelectedOrder] = useState<EventOrder | null>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  // KPIs
  const totalOrders = orders.length;
  const paidOrders = orders.filter((o) => o.paymentStatus === "Paid").length;
  const pendingOrders = orders.filter((o) => o.paymentStatus === "Pending").length;
  const cancelledOrders = orders.filter((o) => o.paymentStatus === "Cancelled").length;
  const totalSales = orders
    .filter((o) => o.paymentStatus === "Paid")
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const refundAmount = orders
    .filter((o) => o.paymentStatus === "Refunded")
    .reduce((sum, o) => sum + (o.discountAmount || o.totalAmount), 0);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = o.orderNumber.toLowerCase().includes(q);
        const matchesName = o.customerName.toLowerCase().includes(q);
        const matchesEmail = o.email.toLowerCase().includes(q);
        const matchesEvent = o.eventName.toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesEmail && !matchesEvent) return false;
      }

      if (statusFilter !== "All" && o.paymentStatus !== statusFilter) return false;

      return true;
    });
  }, [orders, searchQuery, statusFilter]);

  const handleViewOrder = (order: EventOrder) => {
    setSelectedOrder(order);
    setOrderDetailsOpen(true);
  };

  const handleDownloadInvoice = (order: EventOrder) => {
    setSelectedOrder(order);
    setInvoiceOpen(true);
  };

  const handleResendTicket = (order: EventOrder) => {
    toast.success(`Digital entry pass resent to ${order.email}!`);
  };

  const handleResendConfirmation = (order: EventOrder) => {
    toast.success(`Booking confirmation email resent to ${order.email}!`);
  };

  const handleCancelOrder = (order: EventOrder) => {
    Swal.fire({
      title: "Cancel Order?",
      text: `Are you sure you want to cancel order ${order.orderNumber}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, Cancel Order",
    }).then((res) => {
      if (res.isConfirmed) {
        cancelOrder(order.id);
        toast.warning("Order has been cancelled.");
      }
    });
  };

  const handleInitiateRefund = (order: EventOrder) => {
    Swal.fire({
      title: "Initiate Refund",
      html: `
        <p class="text-xs text-gray-500 mb-2">Order Total: <b>${formatInr(order.totalAmount)}</b></p>
        <input id="swal-refund-amount" type="number" class="swal2-input text-xs" value="${order.totalAmount}" placeholder="Refund Amount">
      `,
      showCancelButton: true,
      confirmButtonColor: "#ea580c",
      confirmButtonText: "Process Refund",
      preConfirm: () => {
        const val = (document.getElementById("swal-refund-amount") as HTMLInputElement)?.value;
        return parseFloat(val) || order.totalAmount;
      },
    }).then((res) => {
      if (res.isConfirmed) {
        updateOrderStatus(order.id, "Refunded", res.value);
        toast.success(`Refund of ${formatInr(res.value)} processed.`);
      }
    });
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "Paid":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
      case "Pending":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
      case "Refunded":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300";
      case "Cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            Orders & Bookings Management
          </h1>
          <p className="text-xs text-gray-500">
            Track customer registrations, payments, GST invoices, and cancellations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => exportOrdersToCsv(filteredOrders)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-200"
        >
          <FileSpreadsheet size={15} className="text-emerald-600" /> Export Excel
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Total Orders
          </span>
          <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
            {totalOrders}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            Paid Orders
          </span>
          <p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-400 sm:text-xl">
            {paidOrders}
          </p>
        </div>

        <div className="rounded-xl border border-amber-100 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
            Pending Orders
          </span>
          <p className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-400 sm:text-xl">
            {pendingOrders}
          </p>
        </div>

        <div className="rounded-xl border border-red-100 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">
            Cancelled Orders
          </span>
          <p className="mt-1 text-lg font-bold text-red-700 dark:text-red-400 sm:text-xl">
            {cancelledOrders}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Total Sales
          </span>
          <p className="mt-1 text-lg font-black text-emerald-700 dark:text-emerald-300 sm:text-xl">
            {formatInr(totalSales)}
          </p>
        </div>

        <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
            Refund Amount
          </span>
          <p className="mt-1 text-lg font-black text-purple-700 dark:text-purple-300 sm:text-xl">
            {formatInr(refundAmount)}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1 sm:max-w-xs">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, customer, event..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-xs text-gray-900 focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
          >
            <option value="All">All Payment Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Refunded">Refunded</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <span className="text-xs text-gray-400 font-medium">
          Showing {filteredOrders.length} orders
        </span>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-gray-300">
                <th className="py-3 px-3.5">Order ID</th>
                <th className="py-3 px-3.5">Customer</th>
                <th className="py-3 px-3.5">Event & Category</th>
                <th className="py-3 px-3.5 text-center">Qty</th>
                <th className="py-3 px-3.5 text-right">Amount</th>
                <th className="py-3 px-3.5 text-center">Payment Status</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Booking Date</th>
                <th className="py-3 px-3.5 text-right w-44">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50/70 transition dark:hover:bg-slate-800/40"
                  >
                    <td className="py-3 px-3.5 font-mono font-bold text-gray-900 dark:text-white">
                      {order.orderNumber}
                    </td>

                    <td className="py-3 px-3.5">
                      <p className="font-bold text-gray-900 dark:text-white">
                        {order.customerName}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {order.email} · {order.phone}
                      </p>
                    </td>

                    <td className="py-3 px-3.5">
                      <p className="font-bold text-gray-900 dark:text-white truncate max-w-xs">
                        {order.eventName}
                      </p>
                      <span className="text-[11px] text-gray-500">
                        {order.ticketCategory}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-center font-bold">
                      {order.totalQuantity}
                    </td>

                    <td className="py-3 px-3.5 text-right font-bold font-mono text-gray-900 dark:text-white whitespace-nowrap">
                      {formatInr(order.totalAmount)}
                    </td>

                    <td className="py-3 px-3.5 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${getStatusBadge(
                          order.paymentStatus
                        )}`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-gray-500 whitespace-nowrap">
                      {new Date(order.bookingDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleViewOrder(order)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-black dark:hover:bg-slate-800 dark:hover:text-white"
                          title="View Order Breakdown"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoice(order)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-black dark:hover:bg-slate-800 dark:hover:text-white"
                          title="View / Download Invoice"
                        >
                          <Download size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResendTicket(order)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-black dark:hover:bg-slate-800 dark:hover:text-white"
                          title="Resend Digital Pass"
                        >
                          <Receipt size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResendConfirmation(order)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-black dark:hover:bg-slate-800 dark:hover:text-white"
                          title="Resend Confirmation Email"
                        >
                          <Mail size={15} />
                        </button>

                        {order.paymentStatus === "Paid" && (
                          <button
                            type="button"
                            onClick={() => handleInitiateRefund(order)}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-orange-50 hover:text-orange-600"
                            title="Initiate Refund"
                          >
                            <RotateCcw size={15} />
                          </button>
                        )}

                        {order.paymentStatus !== "Cancelled" && (
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(order)}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            title="Cancel Order"
                          >
                            <Ban size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    No orders found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {orderDetailsOpen && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={orderDetailsOpen}
          onClose={() => setOrderDetailsOpen(false)}
        />
      )}

      {/* Invoice Modal */}
      {invoiceOpen && selectedOrder && (
        <InvoiceModal
          order={selectedOrder}
          isOpen={invoiceOpen}
          onClose={() => setInvoiceOpen(false)}
        />
      )}
    </div>
  );
};
