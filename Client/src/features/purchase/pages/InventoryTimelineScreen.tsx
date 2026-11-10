import { useEffect, useState } from "react";
import { handleGetInventoryTimeline } from "@/services/apiClient";
import { 
  Package, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Calendar, 
  User, 
  Hash, 
  ShoppingBag, 
  Tag,
  X,
  Eye,
  RefreshCw,
  RotateCcw
} from "lucide-react";
import Swal from "sweetalert2";

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
  return { start: "", end: "" };
};

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
};

const PAGE_SIZE = 20;

const InventoryTimelineScreen = () => {
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({
    totalIn: 0,
    totalOut: 0,
    valueIn: 0,
    valueOut: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [productTerm, setProductTerm] = useState("");
  const [debouncedProduct, setDebouncedProduct] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [stockFilter, setStockFilter] = useState<"all" | "low">("all");
  const [datePreset, setDatePreset] = useState<string>("all");
  const [dateRange, setDateRange] = useState({
    start: "",
    end: ""
  });
  const [selectedEntry, setSelectedEntry] = useState<TimelineEntry | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    setPage(1);
    if (preset !== "custom") {
      const range = getPeriodRange(preset);
      setDateRange(range);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setDebouncedProduct(productTerm.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchTerm, productTerm]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await handleGetInventoryTimeline(
          {
            page,
            limit: PAGE_SIZE,
            search: debouncedSearch,
            product: debouncedProduct,
            type: typeFilter,
            stock: stockFilter,
            fromDate: dateRange.start,
            toDate: dateRange.end,
          },
          controller.signal,
        );
        setEntries(
          (response.entries || []).map((entry) => ({
            ...entry,
            date: new Date(entry.date),
            type: entry.type === "IN" ? "IN" : "OUT",
          })),
        );
        setTotal(Number(response.total || 0));
        setTotalPages(Math.max(1, Number(response.totalPages || 1)));
        setSummary(response.summary || { totalIn: 0, totalOut: 0, valueIn: 0, valueOut: 0 });
      } catch (err: unknown) {
        const canceled = err as { name?: string; code?: string };
        if (canceled?.name === "CanceledError" || canceled?.code === "ERR_CANCELED") return;
        setEntries([]);
        setError("Failed to load inventory history");
        Swal.fire("Error", "Failed to load inventory history", "error");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setReady(true);
        }
      }
    };
    void load();
    return () => controller.abort();
  }, [
    page,
    debouncedSearch,
    debouncedProduct,
    typeFilter,
    stockFilter,
    dateRange.start,
    dateRange.end,
    reloadToken,
  ]);

  const filteredData = entries;
  const stats = {
    totalIn: summary.totalIn,
    totalOut: summary.totalOut,
    valIn: summary.valueIn,
    valOut: summary.valueOut,
  };

  const clearFilters = () => {
    setSearchTerm("");
    setProductTerm("");
    setDebouncedSearch("");
    setDebouncedProduct("");
    setTypeFilter("ALL");
    setStockFilter("all");
    setDateRange({ start: "", end: "" });
    setDatePreset("all");
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    Boolean(productTerm) ||
    typeFilter !== "ALL" ||
    stockFilter !== "all" ||
    datePreset !== "all" ||
    Boolean(dateRange.start) ||
    Boolean(dateRange.end);

  if (!ready && loading) {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 flex-wrap">
        <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2 truncate">
          <History className="text-blue-600 shrink-0" size={22} />
          <span>Inventory Timeline</span>
        </h1>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Low Stock Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={stockFilter === "low"}
            onClick={() => {
              setStockFilter((current) => (current === "low" ? "all" : "low"));
              setPage(1);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 sm:py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 shadow-2xs hover:border-slate-300 transition"
          >
            <span>Low Stock</span>
            <span
              className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                stockFilter === "low" ? "bg-rose-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                  stockFilter === "low" ? "left-4" : "left-0.5"
                }`}
              />
            </span>
          </button>

          {/* Date Selection */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition shrink-0">
            <Calendar size={14} className="text-indigo-600 shrink-0" />
            <select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent outline-none cursor-pointer pr-1"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="custom">Custom Date</option>
            </select>
          </div>

          {/* Custom Date Range Picker when Custom is chosen */}
          {datePreset === "custom" && (
            <div className="flex items-center gap-1 bg-white px-2 py-1 sm:py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => {
                  setDateRange((prev) => ({ ...prev, start: e.target.value }));
                  setPage(1);
                }}
                className="text-xs font-medium text-slate-700 outline-none w-28 bg-transparent"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  setDateRange((prev) => ({ ...prev, end: e.target.value }));
                  setPage(1);
                }}
                className="text-xs font-medium text-slate-700 outline-none w-28 bg-transparent"
              />
            </div>
          )}

          {/* Refresh Data */}
          <button 
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            className="shrink-0 px-3 py-1.5 sm:py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh Data</span>
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
          value={total} 
          icon={<Package className="text-blue-600" size={18} />} 
          color="blue"
          label="Matching movements"
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
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 sm:space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-4 items-center">
          <div className="md:col-span-7 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search product, invoice, or entity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-xs sm:text-sm font-medium transition shadow-2xs"
            />
          </div>

          <div className="md:col-span-5">
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/60">
              <button 
                type="button"
                onClick={() => { setTypeFilter("ALL"); setPage(1); }}
                className={`flex-1 px-2.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  typeFilter === "ALL" 
                    ? "bg-indigo-600 shadow-sm text-white" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ALL
              </button>
              <button 
                type="button"
                onClick={() => { setTypeFilter("IN"); setPage(1); }}
                className={`flex-1 px-2.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  typeFilter === "IN" 
                    ? "bg-emerald-600 shadow-sm text-white" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                STOCK IN
              </button>
              <button 
                type="button"
                onClick={() => { setTypeFilter("OUT"); setPage(1); }}
                className={`flex-1 px-2.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  typeFilter === "OUT" 
                    ? "bg-rose-600 shadow-sm text-white" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                STOCK OUT
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center pt-2 border-t border-slate-100">
          <input
            type="text"
            placeholder="Exact product name..."
            value={productTerm}
            onChange={(e) => setProductTerm(e.target.value)}
            className="w-full sm:max-w-xs rounded-xl border border-slate-200 px-3 py-1.5 text-xs sm:text-sm outline-none focus:border-indigo-500 font-medium shadow-2xs"
          />
          <button
            type="button"
            onClick={() => { setStockFilter((current) => (current === "low" ? "all" : "low")); setPage(1); }}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer ${
              stockFilter === "low"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100"
            }`}
          >
            Low Stock
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer sm:ml-auto"
            >
              <RotateCcw size={12} />
              <span>Reset Filters</span>
            </button>
          )}
          {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
        </div>
      </div>

      {/* Mobile Card List (Mobile only: block md:hidden) */}
      <div className="block md:hidden space-y-2.5">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading movements...
          </div>
        ) : filteredData.length > 0 ? (
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
                className={`cursor-pointer rounded-2xl border p-3.5 shadow-2xs transition active:scale-[0.99] hover:shadow-xs ${
                  isIn
                    ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-white hover:border-emerald-300"
                    : "border-rose-200/80 bg-gradient-to-br from-rose-50/40 via-white to-white hover:border-rose-300"
                }`}
              >
                {/* Card Top Section */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {/* Product Initial Avatar */}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white font-extrabold text-xs shadow-2xs ${
                        isIn
                          ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                          : "bg-gradient-to-br from-rose-500 to-pink-600"
                      }`}
                    >
                      {item.productName ? item.productName.charAt(0).toUpperCase() : "P"}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Product Name + Category Pill */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="truncate text-sm sm:text-base font-bold text-slate-900">
                          {item.productName}
                        </h3>
                        <span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/60">
                          {item.category || "General"}
                        </span>
                      </div>

                      {/* Document Number + Entity */}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-bold text-indigo-600">
                          #{item.invoiceNo}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="truncate text-slate-700 font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-[10px] border border-slate-200/60">
                          {item.entityName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Movement Badge & Total Value */}
                  <div className="flex shrink-0 flex-col items-end">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border shadow-2xs ${
                        isIn
                          ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                          : "border-rose-300 bg-rose-100 text-rose-800"
                      }`}
                    >
                      {isIn ? (
                        <ArrowDownLeft size={11} className="stroke-[2.5]" />
                      ) : (
                        <ArrowUpRight size={11} className="stroke-[2.5]" />
                      )}
                      {isIn ? `+${item.qty} Stock In` : `-${item.qty} Stock Out`}
                    </span>

                    <div className="mt-1 text-right">
                      <span
                        className={`text-base font-black ${
                          isIn ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        ₹{totalVal.toLocaleString()}
                      </span>
                      <div className="text-[10px] text-slate-500 font-medium">
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
                    <Calendar size={12} className="text-indigo-500 shrink-0" />
                    <span className="truncate text-[11px] text-slate-500 font-medium">
                      {formattedDate}, {formattedTime} • By{" "}
                      <b className="text-slate-700">{item.createdBy}</b>
                    </span>
                  </div>

                  <div
                    className="flex shrink-0 items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedEntry(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/70 text-xs font-bold shadow-2xs active:scale-95 transition cursor-pointer"
                      title="View Details"
                      aria-label="View Details"
                    >
                      <Eye size={13} />
                      <span>Details</span>
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
              onClick={clearFilters}
              className="mt-3 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
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
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                    Loading movements...
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
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
                        onClick={clearFilters}
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          {total === 0
            ? "No movements"
            : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs font-semibold text-slate-600">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 disabled:opacity-40"
          >
            Next
          </button>
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
  const styles: Record<string, { card: string; title: string; iconWrap: string; value: string; label: string; bgBlob: string }> = {
    emerald: {
      card: "border-emerald-200/90 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-100/30 hover:border-emerald-300",
      title: "text-emerald-700",
      iconWrap: "bg-emerald-100 text-emerald-600",
      value: "text-emerald-950",
      label: "text-emerald-700/80",
      bgBlob: "bg-emerald-200/30",
    },
    rose: {
      card: "border-rose-200/90 bg-gradient-to-br from-rose-50/80 via-white to-rose-100/30 hover:border-rose-300",
      title: "text-rose-700",
      iconWrap: "bg-rose-100 text-rose-600",
      value: "text-rose-950",
      label: "text-rose-700/80",
      bgBlob: "bg-rose-200/30",
    },
    blue: {
      card: "border-blue-200/90 bg-gradient-to-br from-blue-50/80 via-white to-indigo-100/30 hover:border-blue-300",
      title: "text-blue-700",
      iconWrap: "bg-blue-100 text-blue-600",
      value: "text-blue-950",
      label: "text-blue-700/80",
      bgBlob: "bg-blue-200/30",
    },
    indigo: {
      card: "border-indigo-200/90 bg-gradient-to-br from-indigo-50/80 via-white to-purple-100/30 hover:border-indigo-300",
      title: "text-indigo-700",
      iconWrap: "bg-indigo-100 text-indigo-600",
      value: "text-indigo-950",
      label: "text-indigo-700/80",
      bgBlob: "bg-indigo-200/30",
    },
  };

  const current = styles[color] || styles.blue;

  return (
    <div className={`relative overflow-hidden p-3.5 sm:p-5 rounded-2xl border shadow-2xs sm:shadow-xs transition hover:shadow-md ${current.card}`}>
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate mr-1 ${current.title}`}>
          {title}
        </span>
        <div className={`p-1.5 sm:p-2 rounded-xl shrink-0 ${current.iconWrap}`}>
          {icon}
        </div>
      </div>
      <div className="flex flex-col">
        <span className={`text-lg sm:text-2xl font-extrabold tracking-tight ${current.value}`}>
          {value.toLocaleString()}
        </span>
        <span className={`text-[10px] sm:text-[11px] font-semibold mt-0.5 sm:mt-1 truncate ${current.label}`}>
          {label}
        </span>
      </div>
      <div className={`pointer-events-none absolute -bottom-6 -right-6 h-20 w-20 rounded-full ${current.bgBlob}`} />
    </div>
  );
};

export default InventoryTimelineScreen;