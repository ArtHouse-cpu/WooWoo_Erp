
import React, { useMemo, useState } from "react";
import {
  X,
  Search,
  Receipt,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Calendar,
} from "lucide-react";
import { createPortal } from "react-dom";

export type CommissionInvoice = {
  id: string;
  invoiceCode: string;
  date: string;
  rawDate?: string;
  customerName: string;
  customerPhone?: string;
  category: string;
  invoiceAmount: number;
  commissionRate: number;
  commissionAmount: number;
  paymentMode: string;
  status: "Credited" | "Paid" | "Pending";
};

export type Staff = {
  id?: string;
  staffName: string;
  role: string;
  phone: string;
  email: string;
  totalOrders?: number;
  totalSales?: number;
 
  commission: number;
  invoices?: CommissionInvoice[];
};

export const parseInvoiceDate = (dateStr?: string, rawDate?: string): number => {
  if (rawDate) {
    const t = new Date(rawDate).getTime();
    if (!isNaN(t)) return t;
  }
  if (!dateStr) return 0;

  // Direct Date parse attempt
  let t = new Date(dateStr).getTime();
  if (!isNaN(t)) return t;

  // Handle "Sept" -> "Sep" and remove commas
  const cleaned = dateStr.replace(/Sept/i, "Sep").replace(/,/g, "");
  t = new Date(cleaned).getTime();
  if (!isNaN(t)) return t;

  // Custom regex fallback: "DD Mon YYYY hh:mm am/pm"
  const match = dateStr.match(
    /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]m)?)?/i,
  );
  if (match) {
    const [, day, monthStr, year, hourStr, minStr, ampm] = match;
    const months: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      sept: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };
    const m = months[monthStr.toLowerCase().slice(0, 3)] ?? 0;
    let h = hourStr ? parseInt(hourStr, 10) : 0;
    const min = minStr ? parseInt(minStr, 10) : 0;
    if (ampm) {
      if (ampm.toLowerCase() === "pm" && h < 12) h += 12;
      if (ampm.toLowerCase() === "am" && h === 12) h = 0;
    }
    const d = new Date(parseInt(year, 10), m, parseInt(day, 10), h, min);
    const timeVal = d.getTime();
    if (!isNaN(timeVal)) return timeVal;
  }

  return 0;
};

type CommissionLedgerModalProps = {
  isOpen?: boolean;
  staff: Staff | null;
  onClose: () => void;
};

const CommissionLedgerModal = ({
  isOpen,
  staff,
  onClose,
}: CommissionLedgerModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [timeRange, setTimeRange] = useState<string>("lifetime");
  const [customFromDate, setCustomFromDate] = useState<string>("");
  const [customToDate, setCustomToDate] = useState<string>("");

  const invoices = useMemo(() => staff?.invoices || [], [staff]);

  const filteredInvoices = useMemo(() => {
    const list = invoices.filter((inv) => {
      const matchSearch =
        inv.invoiceCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.customerPhone && inv.customerPhone.includes(searchQuery)) ||
        inv.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === "All" ? true : inv.status === statusFilter;

      let matchTime = true;
      if (timeRange !== "lifetime" && (inv.date || inv.rawDate)) {
        const invTime = parseInvoiceDate(inv.date, inv.rawDate);
        if (invTime > 0) {
          const invDate = new Date(invTime);
          const now = new Date();
          now.setHours(0, 0, 0, 0);

          if (timeRange === "today") {
            const invDay = new Date(invDate);
            invDay.setHours(0, 0, 0, 0);
            matchTime = invDay.getTime() === now.getTime();
          } else if (timeRange === "this_week") {
            const startOfWeek = new Date(now);
            const day = startOfWeek.getDay() || 7;
            startOfWeek.setDate(startOfWeek.getDate() - (day - 1));
            matchTime = invDate >= startOfWeek;
          } else if (timeRange === "this_month") {
            matchTime =
              invDate.getMonth() === now.getMonth() &&
              invDate.getFullYear() === now.getFullYear();
          } else if (timeRange === "last_month") {
            const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
            const lastMonthYear =
              now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
            matchTime =
              invDate.getMonth() === lastMonth &&
              invDate.getFullYear() === lastMonthYear;
          } else if (timeRange === "this_year") {
            matchTime = invDate.getFullYear() === now.getFullYear();
          } else if (timeRange === "last_year") {
            matchTime = invDate.getFullYear() === now.getFullYear() - 1;
          } else if (timeRange === "custom") {
            const fromTime = customFromDate
              ? new Date(`${customFromDate}T00:00:00`).getTime()
              : -Infinity;
            const toTime = customToDate
              ? new Date(`${customToDate}T23:59:59`).getTime()
              : Infinity;
            matchTime = invTime >= fromTime && invTime <= toTime;
          }
        }
      }

      return matchSearch && matchStatus && matchTime;
    });

    // Make the newest commission gained at top
    return list.sort((a, b) => {
      const timeA = parseInvoiceDate(a.date, a.rawDate);
      const timeB = parseInvoiceDate(b.date, b.rawDate);
      if (timeB !== timeA) return timeB - timeA;
      return (b.invoiceCode || "").localeCompare(a.invoiceCode || "", undefined, {
        numeric: true,
      });
    });
  }, [invoices, searchQuery, statusFilter, timeRange, customFromDate, customToDate]);

  const totalFilteredCommission = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + inv.commissionAmount, 0);
  }, [filteredInvoices]);

  const totalFilteredSales = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + inv.invoiceAmount, 0);
  }, [filteredInvoices]);

  if (isOpen === false || !staff) return null;


  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Modal Box */}
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative z-10 animate-in zoom-in-95 duration-150 border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-200 bg-gray-50/80 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">
                {staff.staffName}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                {staff.role}
              </span>
            </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Phone size={12} className="text-gray-400" />
                  {staff.phone}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Mail size={12} className="text-gray-400" />
                  {staff.email}
                </span>
              </div>
            </div>

          {/* Right Top: Lifetime Dropdown + Custom Date Inputs + Close Button */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200/90 text-xs shadow-none">
              <Calendar size={13} className="text-gray-400 shrink-0" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="text-xs font-semibold text-gray-800 bg-transparent outline-none cursor-pointer pr-1"
              >
                <option value="lifetime">Lifetime</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_year">This Year</option>
                <option value="last_year">Last Year</option>
                <option value="custom">Custom Date</option>
              </select>
            </div>

            {timeRange === "custom" && (
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-gray-200 text-xs animate-in fade-in duration-100">
                <input
                  type="date"
                  value={customFromDate}
                  max={customToDate || undefined}
                  onChange={(e) => setCustomFromDate(e.target.value)}
                  className="bg-transparent text-gray-700 outline-none text-xs"
                />
                <span className="text-gray-400 font-medium">to</span>
                <input
                  type="date"
                  value={customToDate}
                  min={customFromDate || undefined}
                  onChange={(e) => setCustomToDate(e.target.value)}
                  className="bg-transparent text-gray-700 outline-none text-xs"
                />
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-200/70 text-gray-400 hover:text-gray-700 transition shrink-0"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Top Summary Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50/60 border-b border-gray-200/70">
          <div className="bg-white p-3.5 rounded-xl border border-gray-200/80">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              Total Commission
            </p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              ₹{totalFilteredCommission.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-gray-200/80">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              Total Sales
            </p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              ₹{totalFilteredSales.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-gray-200/80">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              Invoices Billed
            </p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {filteredInvoices.length}
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-gray-200/80">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              Avg / Bill
            </p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              ₹{filteredInvoices.length > 0
                ? Math.round(totalFilteredCommission / filteredInvoices.length).toLocaleString("en-IN")
                : "0"}
            </p>
          </div>
        </div>

        {/* Ledger Title & Filter Controls */}
        <div className="p-4 border-b border-gray-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Receipt size={16} className="text-indigo-600" />
              Commission Ledger Transactions
            </h3>
            <p className="text-xs text-gray-500">
              Breakdown of all invoices where commission was credited
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search invoice or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs font-medium">
              {["All", "Credited", "Pending"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 rounded-md transition ${
                    statusFilter === status
                      ? "bg-white text-indigo-700 shadow-sm font-semibold"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-y-auto min-h-[220px]">
          {filteredInvoices.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              <Receipt size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="font-medium text-gray-700">No ledger records found</p>
              <p className="text-xs text-gray-400 mt-1">
                Try clearing search or changing the filter.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-gray-100 text-gray-600 font-semibold uppercase tracking-wider border-b border-gray-200 z-10">
                <tr>
                  <th className="py-2.5 px-4">Invoice No</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-right">Invoice Total</th>
                 
                  <th className="py-2.5 px-4 text-right">Commission</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-indigo-50/30 transition">
                    <td className="py-3 px-4 font-bold text-indigo-600">
                      {inv.invoiceCode}
                    </td>

                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                      {inv.date}
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">
                        {inv.customerName}
                      </p>
                      {inv.customerPhone && (
                        <p className="text-[10px] text-gray-400">
                          {inv.customerPhone}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-700">
                        {inv.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-semibold text-gray-800">
                      ₹{inv.invoiceAmount.toLocaleString("en-IN")}
                    </td>


                    <td className="py-3 px-4 text-right font-bold text-emerald-600 text-sm">
                      +₹{inv.commissionAmount.toLocaleString("en-IN")}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          inv.status === "Credited"
                            ? "bg-emerald-100 text-emerald-700"
                            : inv.status === "Paid"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {inv.status === "Credited" ? (
                          <CheckCircle2 size={10} />
                        ) : (
                          <Clock size={10} />
                        )}
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="text-gray-500 font-medium">
            Showing <span className="font-bold text-gray-800">{filteredInvoices.length}</span>{" "}
            invoice records • Filtered Commission:{" "}
            <span className="font-bold text-emerald-600 text-sm">
              ₹{totalFilteredCommission.toLocaleString("en-IN")}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800 font-semibold transition shadow-sm"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CommissionLedgerModal;



