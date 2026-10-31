import { useEffect, useMemo, useState } from "react";
import { 
  handleGetInvoices, 
  handleGetPurchases
} from "@/services/apiClient";
import { 
  Package, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Calendar, 
  User, 
  Hash, 
  ShoppingBag, 
  History, 
  Tag,
  X,
  Eye,
  RefreshCw
} from "lucide-react";
import Swal from "sweetalert2";

type TimelineEntry = {
  id: string;
  date: Date;
  type: "IN" | "OUT";
  productName: string;
  qty: number;
  amount: number;
  invoiceNo: string;
  createdBy: string;
  entityName: string; 
  category?: string;
  rawInvoice?: any;
  rawPurchase?: any;
  rawItem?: any;
};

const InventoryTimelineScreen = () => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [dateRange, setDateRange] = useState({
    start: "",
    end: ""
  });
  const [selectedEntry, setSelectedEntry] = useState<TimelineEntry | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, purRes] = await Promise.all([
        handleGetInvoices(),
        handleGetPurchases()
      ]);

      if (invRes.success) setInvoices(invRes.invoices);
      if (purRes.success) setPurchases(purRes.purchases);
    } catch (error) {
      console.error("Error fetching timeline data:", error);
      Swal.fire("Error", "Failed to load inventory history", "error");
    } finally {
      setLoading(false);
    }
  };

  const timelineData = useMemo(() => {
    const data: TimelineEntry[] = [];

    // Process Sales (OUT)
    invoices.forEach((inv) => {
      if (inv.status === "cancelled") return;
      (inv.items || []).forEach((item: any, idx: number) => {
        data.push({
          id: `sale-${inv._id}-${idx}`,
          date: new Date(inv.invoiceDate || inv.createdAt),
          type: "OUT",
          productName: item.productName || "Unknown Product",
          qty: item.qty,
          amount: item.unitPrice,
          invoiceNo: inv.invoiceCode || inv.invoiceNumber || "N/A",
          createdBy: inv.createdBy?.m_staff_name || "System",
          entityName: inv.customerName || "Walk-in Customer",
          category: item.category,
          rawInvoice: inv,
          rawItem: item,
        });
      });
    });

    // Process Purchases (IN)
    purchases.forEach((pur) => {
      if (pur.status === "cancelled") return;
      (pur.items || []).forEach((item: any, idx: number) => {
        data.push({
          id: `pur-${pur._id}-${idx}`,
          date: new Date(pur.invoiceDate || pur.createdAt),
          type: "IN",
          productName: item.productName || "Unknown Product",
          qty: item.qty,
          amount: item.unitPrice,
          invoiceNo: pur.invoiceNumber || "N/A",
          createdBy: pur.purchaser || "System",
          entityName: pur.supplierName || "Direct Purchase",
          category: "Purchase",
          rawPurchase: pur,
          rawItem: item,
        });
      });
    });

    // Sort by date descending
    return data.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [invoices, purchases]);

  const filteredData = useMemo(() => {
    return timelineData.filter((item) => {
      const matchesSearch = 
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.entityName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === "ALL" || item.type === typeFilter;
      
      const itemDate = item.date.toISOString().split("T")[0];
      const matchesDate = 
        (!dateRange.start || itemDate >= dateRange.start) &&
        (!dateRange.end || itemDate <= dateRange.end);

      return matchesSearch && matchesType && matchesDate;
    });
  }, [timelineData, searchTerm, typeFilter, dateRange]);

  const stats = useMemo(() => {
    return filteredData.reduce((acc, curr) => {
      if (curr.type === "IN") {
        acc.totalIn += curr.qty;
        acc.valIn += curr.qty * curr.amount;
      } else {
        acc.totalOut += curr.qty;
        acc.valOut += curr.qty * curr.amount;
      }
      return acc;
    }, { totalIn: 0, totalOut: 0, valIn: 0, valOut: 0 });
  }, [filteredData]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-gray-500">Loading timeline data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6 p-2 sm:p-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History className="text-blue-600" />
            Inventory Timeline
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
            Track every stock movement across your store
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={fetchData}
            className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-xs flex items-center justify-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Stats Cards: 2-2 in a row on mobile, 4 in a row on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard 
          title="Stock In (Qty)" 
          value={stats.totalIn} 
          icon={<ArrowDownLeft className="text-emerald-600" size={18} />} 
          color="emerald"
          label={`Value: ₹${stats.valIn.toLocaleString()}`}
        />
        <StatCard 
          title="Stock Out (Qty)" 
          value={stats.totalOut} 
          icon={<ArrowUpRight className="text-rose-600" size={18} />} 
          color="rose"
          label={`Value: ₹${stats.valOut.toLocaleString()}`}
        />
        <StatCard 
          title="Total Transactions" 
          value={filteredData.length} 
          icon={<Package className="text-blue-600" size={18} />} 
          color="blue"
          label="Recent movements"
        />
        <StatCard 
          title="Net Movement" 
          value={stats.totalIn - stats.totalOut} 
          icon={<Tag className="text-indigo-600" size={18} />} 
          color="indigo"
          label="Inventory Delta"
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-xs sm:shadow-sm space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search product, invoice, or entity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs sm:text-sm transition"
            />
          </div>

          <div className="md:col-span-3">
            <div className="flex p-1 bg-gray-100 rounded-xl">
              <button 
                type="button"
                onClick={() => setTypeFilter("ALL")}
                className={`flex-1 px-2.5 py-1.5 text-xs font-bold rounded-lg transition ${typeFilter === "ALL" ? "bg-white shadow-xs text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              >
                ALL
              </button>
              <button 
                type="button"
                onClick={() => setTypeFilter("IN")}
                className={`flex-1 px-2.5 py-1.5 text-xs font-bold rounded-lg transition ${typeFilter === "IN" ? "bg-white shadow-xs text-emerald-600" : "text-gray-500 hover:text-gray-700"}`}
              >
                STOCK IN
              </button>
              <button 
                type="button"
                onClick={() => setTypeFilter("OUT")}
                className={`flex-1 px-2.5 py-1.5 text-xs font-bold rounded-lg transition ${typeFilter === "OUT" ? "bg-white shadow-xs text-rose-600" : "text-gray-500 hover:text-gray-700"}`}
              >
                STOCK OUT
              </button>
            </div>
          </div>

          <div className="md:col-span-4 flex gap-2">
            <div className="flex-1 relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full pl-8 pr-2 py-1.5 sm:py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1 relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full pl-8 pr-2 py-1.5 sm:py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Card List (Mobile only: block md:hidden) */}
      <div className="block md:hidden space-y-2.5">
        {filteredData.length > 0 ? (
          filteredData.map((item) => {
            const isIn = item.type === "IN";
            const totalVal = item.qty * item.amount;
            const formattedDate = item.date.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            const formattedTime = item.date.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });

            return (
              <div
                key={item.id}
                onClick={() => setSelectedEntry(item)}
                className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition hover:border-slate-300 active:bg-slate-50/70"
              >
                {/* Card Top Section */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {/* Product Name + Category Pill */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="truncate text-base font-bold text-slate-900">
                        {item.productName}
                      </h3>
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        {item.category || "General"}
                      </span>
                    </div>

                    {/* Document Number + Entity */}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-semibold text-blue-600">
                        #{item.invoiceNo}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="truncate text-slate-600 font-medium">
                        {item.entityName}
                      </span>
                    </div>
                  </div>

                  {/* Right side: Movement Badge & Total Value */}
                  <div className="flex shrink-0 flex-col items-end">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        isIn
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                    >
                      {isIn ? (
                        <ArrowDownLeft size={12} className="stroke-[2.5]" />
                      ) : (
                        <ArrowUpRight size={12} className="stroke-[2.5]" />
                      )}
                      {isIn ? `+${item.qty} IN` : `-${item.qty} OUT`}
                    </span>

                    <div className="mt-1 text-right">
                      <span className="text-base font-bold text-slate-900">
                        ₹{totalVal.toLocaleString()}
                      </span>
                      <div className="text-[10px] text-slate-400 font-medium">
                        @ ₹{item.amount.toLocaleString()}/unit
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtle Divider */}
                <div className="my-2.5 border-t border-slate-100" />

                {/* Card Bottom Section */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex min-w-0 items-center gap-1 truncate text-slate-400">
                    <Calendar size={13} className="shrink-0 text-slate-400" />
                    <span className="truncate">
                      {formattedDate}, {formattedTime} • By {item.createdBy}
                    </span>
                  </div>

                  <div
                    className="flex shrink-0 items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedEntry(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
                      title="View Details"
                      aria-label="View Details"
                    >
                      <Eye size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <Package size={24} />
            </div>
            <h4 className="mt-3 text-sm font-semibold text-slate-800">
              No inventory movements found
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Try clearing filters or search terms.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setTypeFilter("ALL");
                setDateRange({ start: "", end: "" });
              }}
              className="mt-3 text-xs font-bold text-blue-600 hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Desktop Timeline Table (Desktop only: hidden md:block) */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Qty</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rate</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Transaction Info</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr 
                    key={item.id} 
                    onClick={() => setSelectedEntry(item)}
                    className="hover:bg-gray-50/80 transition cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">
                          {item.date.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium uppercase">
                          {item.date.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        item.type === "IN" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                          : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}>
                        {item.type === "IN" ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                        {item.type === "IN" ? "Stock In" : "Stock Out"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800">{item.productName}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{item.category || "General"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-bold ${item.type === "IN" ? "text-emerald-600" : "text-rose-600"}`}>
                        {item.type === "IN" ? "+" : "-"}{item.qty}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-900">₹ {item.amount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <Hash size={12} className="text-gray-400" />
                          <span className="text-xs font-bold text-blue-600 hover:underline">{item.invoiceNo}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.type === "IN" ? <ShoppingBag size={12} className="text-gray-400" /> : <User size={12} className="text-gray-400" />}
                          <span className="text-[11px] text-gray-500 font-medium">{item.entityName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center">
                           <User size={12} className="text-slate-500" />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{item.createdBy}</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-50 rounded-full">
                        <Search size={32} className="text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-medium">No matching inventory movements found</p>
                      <button 
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          setTypeFilter("ALL");
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

      {/* Movement Details Modal */}
      {selectedEntry && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedEntry(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    selectedEntry.type === "IN"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-rose-50 text-rose-600"
                  }`}
                >
                  {selectedEntry.type === "IN" ? (
                    <ArrowDownLeft size={20} />
                  ) : (
                    <ArrowUpRight size={20} />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Movement Details
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedEntry.type === "IN"
                      ? "Stock In (Purchase)"
                      : "Stock Out (Sale)"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 space-y-4">
              {/* Product Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Product Name
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 mt-0.5 truncate">
                      {selectedEntry.productName}
                    </h4>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                      selectedEntry.type === "IN"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {selectedEntry.type === "IN" ? "Stock In" : "Stock Out"}
                  </span>
                </div>

                {/* 3 Metric Pills */}
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-3 text-center">
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="text-[10px] font-medium text-slate-400 block">
                      Quantity
                    </span>
                    <span
                      className={`text-base font-extrabold ${
                        selectedEntry.type === "IN"
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}
                    >
                      {selectedEntry.type === "IN" ? "+" : "-"}
                      {selectedEntry.qty}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="text-[10px] font-medium text-slate-400 block">
                      Unit Rate
                    </span>
                    <span className="text-base font-extrabold text-slate-900">
                      ₹{selectedEntry.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="text-[10px] font-medium text-slate-400 block">
                      Total Value
                    </span>
                    <span className="text-base font-extrabold text-slate-900">
                      ₹{(selectedEntry.qty * selectedEntry.amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Movement Breakdown Info */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Transaction Information
                </h5>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Document No.</span>
                    <span className="font-semibold text-blue-600">
                      #{selectedEntry.invoiceNo}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Category</span>
                    <span className="font-semibold text-slate-800">
                      {selectedEntry.category || "General"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">
                      {selectedEntry.type === "IN"
                        ? "Supplier / Vendor"
                        : "Customer"}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {selectedEntry.entityName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Processed By</span>
                    <span className="font-semibold text-slate-800">
                      {selectedEntry.createdBy}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block">Date & Time</span>
                    <span className="font-semibold text-slate-800">
                      {selectedEntry.date.toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      at{" "}
                      {selectedEntry.date.toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </div>
                  {/* Payment Details if available */}
                  {(selectedEntry.rawInvoice?.paymentType ||
                    selectedEntry.rawPurchase?.paymentMode) && (
                    <div>
                      <span className="text-slate-400 block">Payment Mode</span>
                      <span className="font-semibold text-slate-800">
                        {selectedEntry.rawInvoice?.paymentType ||
                          selectedEntry.rawPurchase?.paymentMode}
                      </span>
                    </div>
                  )}
                  {(selectedEntry.rawInvoice?.status ||
                    selectedEntry.rawPurchase?.status) && (
                    <div>
                      <span className="text-slate-400 block">Status</span>
                      <span className="font-semibold text-slate-800 capitalize">
                        {selectedEntry.rawInvoice?.status ||
                          selectedEntry.rawPurchase?.status}
                      </span>
                    </div>
                  )}
                  {/* Notes if available */}
                  {(selectedEntry.rawInvoice?.notes ||
                    selectedEntry.rawPurchase?.notes) && (
                    <div className="col-span-2 border-t border-slate-100 pt-2">
                      <span className="text-slate-400 block">Notes</span>
                      <p className="text-slate-600 mt-0.5">
                        {selectedEntry.rawInvoice?.notes ||
                          selectedEntry.rawPurchase?.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 bg-slate-50/50 p-4">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-98"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ 
  title, 
  value, 
  icon, 
  color, 
  label 
}: { 
  title: string; 
  value: number; 
  icon: React.ReactNode; 
  color: string; 
  label: string;
}) => {
  const colorMap: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  return (
    <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs sm:shadow-sm transition hover:shadow-md hover:border-slate-300">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate mr-1">
          {title}
        </span>
        <div className={`p-1.5 sm:p-2 rounded-xl shrink-0 ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
          {value.toLocaleString()}
        </span>
        <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 sm:mt-1 truncate">
          {label}
        </span>
      </div>
    </div>
  );
};

export default InventoryTimelineScreen;