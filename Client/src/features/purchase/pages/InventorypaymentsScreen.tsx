import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  handleGetInvoices,
  handleGetPurchases,
} from "@/services/apiClient";
import {
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Calendar,
  User,
  Hash,
  IndianRupee,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
  Building2,
  Wallet,
  Coins,
  RefreshCw,
  Eye,
 
 
  Filter,
  Receipt,
 
 
} from "lucide-react";
import Swal from "sweetalert2";
import PaymentModal from "../components/paymentmodal";

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

const toYmd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getPeriodRange = (period: string): { start: string; end: string } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "today") {
    const ymd = toYmd(today);
    return { start: ymd, end: ymd };
  }
  if (period === "yesterday") {
    const y = new Date(today);
    y.setDate(today.getDate() - 1);
    const ymd = toYmd(y);
    return { start: ymd, end: ymd };
  }
  if (period === "this_week") {
    const start = new Date(today);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - (day - 1));
    return { start: toYmd(start), end: toYmd(today) };
  }
  if (period === "this_month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: toYmd(start), end: toYmd(today) };
  }
  if (period === "last_month") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: toYmd(start), end: toYmd(end) };
  }
  if (period === "this_year") {
    const start = new Date(today.getFullYear(), 0, 1);
    return { start: toYmd(start), end: toYmd(today) };
  }
  return { start: "", end: "" };
};

const InventorypaymentsScreen = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [flowFilter, setFlowFilter] = useState<"ALL" | "INFLOW" | "OUTFLOW">("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "Paid" | "Partial" | "Pending" | "Cancelled"
  >("ALL");
  const [timeRange, setTimeRange] = useState("lifetime");
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });
  const [selectedPayment, setSelectedPayment] = useState<PaymentEntry | null>(null);

  const handleTimeRangeChange = (period: string) => {
    setTimeRange(period);
    if (period === "custom") return;
    const range = getPeriodRange(period);
    setDateRange(range);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const [invRes, purRes] = await Promise.all([
        handleGetInvoices().catch((err) => {
          console.warn("Error fetching invoices:", err);
          return { success: false, invoices: [] };
        }),
        handleGetPurchases().catch((err) => {
          console.warn("Error fetching purchases:", err);
          return { success: false, purchases: [] };
        }),
      ]);

      if (invRes?.success && Array.isArray(invRes.invoices)) {
        setInvoices(invRes.invoices);
      }
      if (purRes?.success && Array.isArray(purRes.purchases)) {
        setPurchases(purRes.purchases);
      }
    } catch (error) {
      console.error("Error fetching payment timeline data:", error);
      Swal.fire("Error", "Failed to load payment timeline data", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const paymentData = useMemo(() => {
    const data: PaymentEntry[] = [];

    // 1. Process Sales / Invoices (INFLOW: Customer Collections)
    invoices.forEach((inv) => {
      const isCancelled = inv.status === "cancelled";
      const total = Number(inv.grandTotal ?? 0);
      const invoiceCode = inv.invoiceCode || (inv.invoiceNumber ? `INV-${inv.invoiceNumber}` : "N/A");
      const party = inv.customerName || "Walk-in Customer";
      const staff = inv.createdBy?.m_staff_name || "System";
      const date = new Date(inv.invoiceDate || inv.createdAt || Date.now());

      if (Array.isArray(inv.paymentHistory) && inv.paymentHistory.length > 0) {
        inv.paymentHistory.forEach((hist: any, hIdx: number) => {
          const histAmt = Number(hist.amount || 0);
          data.push({
            id: `pay-sale-${inv._id}-${hIdx}`,
            date: new Date(hist.date || date),
            type: "INFLOW",
            paymentNo: `PAY-IN-${inv.invoiceNumber || invoiceCode}-${hIdx + 1}`,
            invoiceNo: invoiceCode,
            partyName: party,
            partyType: "Customer",
            amount: histAmt,
            totalBill: total,
            dueAmount: Number(inv.pendingAmount ?? inv.paymentBreakdown?.dueAmount ?? 0),
            paymentMethod: hist.mode || inv.mode || "Cash",
            status: isCancelled ? "Cancelled" : "Paid",
            createdBy: hist.receivedBy || staff,
            breakdown: inv.paymentBreakdown,
          });
        });
      } else {
        const paidAmount = Number(
          inv.paymentBreakdown?.paidAmount ??
            (inv.paymentStatus === "due" ? 0 : total)
        );
        const dueAmount = Number(
          inv.pendingAmount ??
            inv.paymentBreakdown?.dueAmount ??
            (inv.paymentStatus === "due"
              ? total
              : inv.paymentStatus === "partial"
              ? Math.max(0, total - paidAmount)
              : 0)
        );

        let status: "Paid" | "Partial" | "Pending" | "Cancelled" = "Paid";
        if (isCancelled) status = "Cancelled";
        else if (inv.paymentStatus === "due" || paidAmount === 0) status = "Pending";
        else if (inv.paymentStatus === "partial" || dueAmount > 0) status = "Partial";

        data.push({
          id: `pay-sale-${inv._id}`,
          date,
          type: "INFLOW",
          paymentNo: `PAY-IN-${inv.invoiceNumber || String(inv._id).slice(-6)}`,
          invoiceNo: invoiceCode,
          partyName: party,
          partyType: "Customer",
          amount: paidAmount,
          totalBill: total,
          dueAmount,
          paymentMethod: inv.mode || "Cash",
          status,
          createdBy: staff,
          breakdown: inv.paymentBreakdown,
        });
      }
    });

    // 2. Process Purchases (OUTFLOW: Supplier Payments)
    purchases.forEach((pur) => {
      const isCancelled = pur.status === "cancelled";
      const total = Number(pur.amount ?? 0);
      const isCredit =
        pur.purchaseType === "credit" ||
        pur.paymentMode === "Credit" ||
        pur.status === "due";
      const paidAmount = isCredit
        ? 0
        : Number(pur.paidAmount ?? (pur.status === "paid" ? total : 0));
      const dueAmount = isCredit
        ? Number(pur.dueAmount ?? total)
        : Number(pur.dueAmount ?? (pur.status === "paid" ? 0 : Math.max(0, total - paidAmount)));

      let status: "Paid" | "Partial" | "Pending" | "Cancelled" = "Paid";
      if (isCancelled) status = "Cancelled";
      else if (isCredit || pur.status === "due" || pur.status === "pending" || paidAmount === 0) {
        status = "Pending";
      } else if (pur.status === "partial" || dueAmount > 0) {
        status = "Partial";
      }

      data.push({
        id: `pay-pur-${pur._id}`,
        date: new Date(pur.invoiceDate || pur.vendorDate || pur.createdAt || Date.now()),
        type: "OUTFLOW",
        paymentNo: `PAY-OUT-${pur.invoiceNumber || String(pur._id).slice(-6)}`,
        invoiceNo: pur.invoiceNumber || "N/A",
        partyName: pur.supplierName || "Direct Supplier",
        partyType: "Supplier",
        amount: paidAmount,
        totalBill: total,
        dueAmount,
        paymentMethod: pur.paymentMode || (isCredit ? "Credit" : "Cash"),
        status,
        createdBy: pur.purchaser || "System",
      });
    });

    // Sort by date descending
    return data.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [invoices, purchases]);

  const filteredData = useMemo(() => {
    return paymentData.filter((item) => {
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        item.paymentNo.toLowerCase().includes(search) ||
        item.invoiceNo.toLowerCase().includes(search) ||
        item.partyName.toLowerCase().includes(search) ||
        item.paymentMethod.toLowerCase().includes(search) ||
        item.createdBy.toLowerCase().includes(search);

      const matchesFlow = flowFilter === "ALL" || item.type === flowFilter;
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;

      const itemDate = item.date.toISOString().split("T")[0];
      const matchesDate =
        timeRange === "lifetime"
          ? true
          : (!dateRange.start || itemDate >= dateRange.start) &&
            (!dateRange.end || itemDate <= dateRange.end);

      return matchesSearch && matchesFlow && matchesStatus && matchesDate;
    });
  }, [paymentData, searchTerm, flowFilter, statusFilter, dateRange, timeRange]);

  const stats = useMemo(() => {
    return filteredData.reduce(
      (acc, curr) => {
        if (curr.type === "INFLOW") {
          acc.totalInflow += curr.amount;
          acc.inflowCount += 1;
        } else {
          acc.totalOutflow += curr.amount;
          acc.outflowCount += 1;
        }
        acc.totalDue += curr.dueAmount;
        return acc;
      },
      {
        totalInflow: 0,
        totalOutflow: 0,
        totalDue: 0,
        inflowCount: 0,
        outflowCount: 0,
      }
    );
  }, [filteredData]);

  const exportCSV = () => {
    if (filteredData.length === 0) {
      Swal.fire("Info", "No data to export", "info");
      return;
    }
    const headers = [
      "Date",
      "Time",
      "Type",
      "Payment No",
      "Invoice No",
      "Party",
      "Party Type",
      "Payment Mode",
      "Amount",
      "Due Amount",
      "Total Bill",
      "Status",
      "Created By",
    ];
    const rows = filteredData.map((item) => [
      item.date.toISOString().split("T")[0],
      item.date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      item.type,
      `"${item.paymentNo}"`,
      `"${item.invoiceNo}"`,
      `"${item.partyName}"`,
      item.partyType,
      item.paymentMethod,
      item.amount,
      item.dueAmount,
      item.totalBill,
      item.status,
      `"${item.createdBy}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_payments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-gray-500">Loading payment records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 p-1 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="text-blue-600" />
            Inventory Payments Timeline
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track all payment collections, supplier outflows, and outstanding balances
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Right Top: Lifetime Filter Dropdown */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-xs hover:border-gray-300 transition">
            <Calendar size={14} className="text-blue-600 shrink-0" />
            <select
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="text-xs font-semibold text-gray-800 bg-transparent outline-none cursor-pointer pr-1"
            >
              <option value="lifetime">Lifetime</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year</option>
            </select>
          </div>

          <button
            onClick={fetchData}
            disabled={refreshing}
            className="px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin text-blue-600" : "text-gray-500"} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Inflow (Received)"
          value={`₹ ${stats.totalInflow.toLocaleString("en-IN")}`}
          icon={<ArrowDownLeft className="text-emerald-600" size={20} />}
          color="emerald"
          label={`${stats.inflowCount} Sales Collections`}
        />
        <StatCard
          title="Total Outflow (Paid)"
          value={`₹ ${stats.totalOutflow.toLocaleString("en-IN")}`}
          icon={<ArrowUpRight className="text-rose-600" size={20} />}
          color="rose"
          label={`${stats.outflowCount} Supplier Payments`}
        />
        <StatCard
          title="Outstanding Due"
          value={`₹ ${stats.totalDue.toLocaleString("en-IN")}`}
          icon={<Clock className="text-amber-600" size={20} />}
          color="amber"
          label="Pending Receivables & Payables"
        />
        <StatCard
          title="Net Cash Flow"
          value={`${stats.totalInflow >= stats.totalOutflow ? "+" : "-"}₹ ${Math.abs(
            stats.totalInflow - stats.totalOutflow
          ).toLocaleString("en-IN")}`}
          icon={<Receipt className="text-blue-600" size={20} />}
          color="blue"
          label={`${filteredData.length} Total Transactions`}
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search payment ID, invoice, party, or method..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition"
            />
          </div>

          <div className="md:col-span-4">
            <div className="flex p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setFlowFilter("ALL")}
                className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition ${
                  flowFilter === "ALL"
                    ? "bg-white shadow-sm text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                ALL
              </button>
              <button
                onClick={() => setFlowFilter("INFLOW")}
                className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition ${
                  flowFilter === "INFLOW"
                    ? "bg-white shadow-sm text-emerald-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                RECEIVED
              </button>
              <button
                onClick={() => setFlowFilter("OUTFLOW")}
                className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition ${
                  flowFilter === "OUTFLOW"
                    ? "bg-white shadow-sm text-rose-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                PAID OUT
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Filter: Status Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
          <span className="text-xs font-bold text-gray-400 mr-1 flex items-center gap-1 uppercase tracking-wider">
            <Filter size={12} /> Status:
          </span>
          {(["ALL", "Paid", "Partial", "Pending", "Cancelled"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                statusFilter === status
                  ? "bg-blue-600 text-white shadow-sm font-bold"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {status === "ALL" ? "All Statuses" : status}
            </button>
          ))}
          {(searchTerm || flowFilter !== "ALL" || statusFilter !== "ALL" || timeRange !== "lifetime") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setFlowFilter("ALL");
                setStatusFilter("ALL");
                setTimeRange("lifetime");
                setDateRange({ start: "", end: "" });
              }}
              className="ml-auto text-xs text-blue-600 hover:underline font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Flow
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Payment Info
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Party / Entity
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Recorded By
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/60 transition group"
                  >
                    {/* Date & Time */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">
                          {item.date.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium uppercase">
                          {item.date.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </div>
                    </td>

                    {/* Flow Badge */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          item.type === "INFLOW"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-rose-50 text-rose-700 border border-rose-100"
                        }`}
                      >
                        {item.type === "INFLOW" ? (
                          <ArrowDownLeft size={12} />
                        ) : (
                          <ArrowUpRight size={12} />
                        )}
                        {item.type === "INFLOW" ? "Received" : "Paid Out"}
                      </span>
                    </td>

                    {/* Payment Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Hash size={12} className="text-gray-400" />
                        <span className="text-sm font-bold text-gray-800">
                          {item.paymentNo}
                        </span>
                      </div>
                    </td>

                    {/* Party / Entity */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          {item.partyType === "Customer" ? (
                            <User size={13} className="text-slate-600" />
                          ) : (
                            <Building2 size={13} className="text-slate-600" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-gray-800 truncate max-w-[160px]">
                            {item.partyName}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {item.partyType}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Payment Mode */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                        <PaymentMethodIcon method={item.paymentMethod} />
                        {item.paymentMethod}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span
                          className={`text-sm font-bold ${
                            item.type === "INFLOW" ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {item.type === "INFLOW" ? "+" : "-"} ₹ {item.amount.toLocaleString("en-IN")}
                        </span>
                        {item.dueAmount > 0 && (
                          <span className="text-[10px] font-semibold text-amber-600">
                            Due: ₹ {item.dueAmount.toLocaleString("en-IN")}
                          </span>
                        )}
                        {item.totalBill > 0 && item.totalBill !== item.amount && (
                          <span className="text-[10px] text-gray-400 font-medium">
                            Bill: ₹ {item.totalBill.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          item.status === "Paid"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : item.status === "Partial"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : item.status === "Pending"
                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                            : item.status === "Refunded"
                            ? "bg-purple-50 text-purple-700 border border-purple-100"
                            : "bg-rose-50 text-rose-700 border border-rose-100"
                        }`}
                      >
                        {item.status === "Paid" && <CheckCircle2 size={12} />}
                        {item.status === "Partial" && <Clock size={12} />}
                        {item.status === "Pending" && <Clock size={12} />}
                        {item.status === "Refunded" && <RotateCcw size={12} />}
                        {item.status === "Cancelled" && <XCircle size={12} />}
                        {item.status}
                      </span>
                    </td>

                    {/* Recorded By */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center">
                          <User size={12} className="text-slate-500" />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">
                          {item.createdBy}
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedPayment(item)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition inline-flex items-center cursor-pointer"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-50 rounded-full">
                        <Search size={32} className="text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-medium">
                        No matching payment transactions found
                      </p>
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setFlowFilter("ALL");
                          setStatusFilter("ALL");
                          setDateRange({ start: "", end: "" });
                        }}
                        className="text-sm font-bold text-blue-600 hover:underline"
                      >
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Details Modal */}
      <PaymentModal
        open={Boolean(selectedPayment)}
        onClose={() => setSelectedPayment(null)}
        payment={selectedPayment}
      />
    </div>
  );
};

const StatCard = ({
  title,
  value,
  icon,
  color,
  label,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: "emerald" | "rose" | "blue" | "indigo" | "amber";
  label: string;
}) => {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm transition hover:shadow-md hover:border-gray-300">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-2 rounded-lg ${colorMap[color] || colorMap.blue}`}>
          {icon}
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-bold text-gray-900">
          {typeof value === "number" ? value.toLocaleString("en-IN") : value}
        </span>
        <span className="text-[11px] text-gray-400 font-medium mt-1">{label}</span>
      </div>
    </div>
  );
};

const PaymentMethodIcon = ({ method }: { method: string }) => {
  const m = (method || "").toLowerCase();
  if (m.includes("upi")) return <IndianRupee size={12} className="text-emerald-600" />;
  if (m.includes("card")) return <CreditCard size={12} className="text-blue-600" />;
  if (m.includes("cash")) return <Coins size={12} className="text-amber-600" />;
  if (
    m.includes("bank") ||
    m.includes("transfer") ||
    m.includes("neft") ||
    m.includes("rtgs")
  ) {
    return <Building2 size={12} className="text-indigo-600" />;
  }
  if (m.includes("wallet")) return <Wallet size={12} className="text-purple-600" />;
  return <Receipt size={12} className="text-gray-500" />;
};

export default InventorypaymentsScreen;
