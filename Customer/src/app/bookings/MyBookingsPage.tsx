import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  CalendarCheck,
  ChevronLeft,
  Clock,
  Coffee,
  Copy,
  Download,
  IndianRupee,
  LayoutGrid,
  List,
  Search,
  Sparkles,
  Store,
  Layers,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardSidebar } from "../../components/dashboard/DashboardSidebar";
import { TopNavbar } from "../../components/dashboard/TopNavbar";
import {
  downloadCoworkingInvoice,
  fetchMyBookings,
  type CoworkingReceipt,
} from "../../services/coworkingCheckout.service";
import { getErrorMessage } from "../../services/axios";

type BookingCategory = "All" | "Full" | "Space" | "Coworking";
type ViewMode = "cards" | "table";

const inr = (value?: number) =>
  `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;

const when = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusTone = (status?: string) => {
  const value = String(status || "").toLowerCase();
  if (value.includes("cancel")) return "bg-rose-50 text-rose-700 border border-rose-200";
  if (value.includes("complete") || value.includes("done") || value.includes("expired"))
    return "bg-slate-100 text-slate-700 border border-slate-200";
  if (value.includes("ongoing"))
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  return "bg-blue-50 text-blue-700 border border-blue-200";
};

/** Categorizes a booking into 'Full', 'Space', or 'Coworking' */
const getBookingCategory = (row: CoworkingReceipt): "Full" | "Space" | "Coworking" => {
  const type = String(row.spaceType || "").toLowerCase();
  const name = String(row.spaceName || row.planName || "").toLowerCase();
  const notes = String(row.notes || "").toLowerCase();

  // Full space
  if (type.includes("full") || name.includes("full") || notes.includes("full space")) {
    return "Full";
  }
  // Coworking
  if (
    type.includes("coworking") ||
    name.includes("coworking") ||
    name.includes("day pass") ||
    notes.includes("coworking")
  ) {
    return "Coworking";
  }
  // Otherwise standard space
  return "Space";
};

const categoryBadgeStyle = (category: "Full" | "Space" | "Coworking") => {
  if (category === "Full") {
    return "bg-violet-50 text-[#6344E7] border border-violet-200";
  }
  if (category === "Coworking") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }
  return "bg-amber-50 text-amber-700 border border-amber-200";
};

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rows, setRows] = useState<CoworkingReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<BookingCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  useEffect(() => {
    fetchMyBookings()
      .then(setRows)
      .catch((err) => setError(getErrorMessage(err, "Could not load bookings.")))
      .finally(() => setLoading(false));
  }, []);

  const copyBookingCode = (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      toast.success("Booking code copied!");
    }
  };

  // Metrics calculation
  const totalBookings = rows.length;

  const totalDiscount = rows.reduce(
    (sum, r) => sum + (Number(r.discount) || Number(r.savings) || 0),
    0
  );

  const totalCashback = rows.reduce(
    (sum, r) => sum + (Number(r.cashback) || 0),
    0
  );

  const totalBenefit = rows.reduce(
    (sum, r) =>
      sum +
      (Number(r.benefit) ||
        Number(r.discount) ||
        Number(r.savings) ||
        0) +
      (Number(r.cashback) || 0),
    0
  );

  const totalPaid = rows.reduce((sum, r) => sum + (Number(r.payable) || 0), 0);

  // Category counts
  const counts = useMemo(() => {
    const res = { All: rows.length, Full: 0, Space: 0, Coworking: 0 };
    for (const r of rows) {
      const cat = getBookingCategory(r);
      res[cat] = (res[cat] || 0) + 1;
    }
    return res;
  }, [rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Category filter
      if (selectedCategory !== "All") {
        const cat = getBookingCategory(r);
        if (cat !== selectedCategory) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const code = String(r.bookingCode || "").toLowerCase();
        const name = String(r.spaceName || r.planName || "").toLowerCase();
        const notes = String(r.notes || "").toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !notes.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [rows, selectedCategory, searchQuery]);

  const content = (
    <div className="w-full space-y-6 pb-12">
      <div className="overflow-visible rounded-[24px] border border-black/[0.04] bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.03)] sm:p-6 md:p-8">
        
        {/* ================= HEADER ================= */}
        <div className="mb-6 flex flex-nowrap items-center justify-between gap-2 border-b border-gray-100 pb-5 sm:gap-3">
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-[#4B5563] shadow-[0_2px_8px_rgba(15,23,42,0.02)] transition hover:scale-95 cursor-pointer"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5 text-[#111111]" strokeWidth={2.5} />
            </button>

            <div className="shrink-0">
              <div className="flex items-center gap-1.5">
                <h1 className="whitespace-nowrap text-[17px] font-black tracking-tight text-[#0f172a] sm:text-2xl md:text-3xl">
                  Bookings
                </h1>
                {/* 3 diagonal purple sparks */}
                <svg
                  className="h-4 w-4 -mt-2 shrink-0 text-[#6344E7] sm:h-5 sm:w-5"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M4 3L2 1.5" />
                  <path d="M8 2L8 0" />
                  <path d="M12 3L14 1.5" />
                </svg>
              </div>

              <p className="whitespace-nowrap text-[11px] font-semibold text-[#94a3b8] sm:text-sm">
                Space reservations & coworking plans
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/spaces"
              className="flex items-center gap-1.5 rounded-xl bg-[#6344E7] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#5233d6] active:scale-95 cursor-pointer"
            >
              <Store className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Book Space</span>
            </Link>
          </div>
        </div>

        {/* ================= 2 PROMINENT KPIS: TOTAL BOOKINGS & BENEFIT ================= */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          {/* KPI 1: Total Bookings */}
          <div className="flex flex-col justify-between rounded-2xl border border-violet-100 bg-[#FAF9FF] p-4 transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100/90 text-[#6344E7]">
                <CalendarCheck className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-bold text-[#6344E7]">
                Reservations
              </span>
            </div>
            <div className="mt-4">
              <span className="text-xs font-bold text-slate-500">Total Bookings</span>
              <p className="mt-0.5 text-2xl font-black text-slate-900 sm:text-3xl">
                {totalBookings}
              </p>
              <span className="mt-1 block text-[11px] font-medium text-slate-400">
                Confirmed in your account
              </span>
            </div>
          </div>

          {/* KPI 2: Benefit (Discount + Cashback) */}
          <div className="flex flex-col justify-between rounded-2xl border border-emerald-100 bg-[#F2FBF5] p-4 transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100/90 text-emerald-700">
                <Sparkles className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                Saved & Earned
              </span>
            </div>
            <div className="mt-4">
              <span className="text-xs font-bold text-slate-500">
                Benefit (Discount + Cashback)
              </span>
              <p className="mt-0.5 text-2xl font-black text-emerald-700 sm:text-3xl">
                {inr(totalBenefit)}
              </p>
              <span className="mt-1 block text-[11px] font-semibold text-emerald-700">
                Discount: {inr(totalDiscount)} · Cashback: {inr(totalCashback)}
              </span>
            </div>
          </div>

          {/* KPI 3: Total Paid Amount */}
          <div className="flex flex-col justify-between rounded-2xl border border-blue-100 bg-[#F4F8FC] p-4 transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100/90 text-blue-600">
                <IndianRupee className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                Settled
              </span>
            </div>
            <div className="mt-4">
              <span className="text-xs font-bold text-slate-500">Total Spent</span>
              <p className="mt-0.5 text-2xl font-black text-slate-900 sm:text-3xl">
                {inr(totalPaid)}
              </p>
              <span className="mt-1 block text-[11px] font-medium text-slate-400">
                All booking payments
              </span>
            </div>
          </div>

          {/* KPI 4: Active Spaces / Coworking */}
          <div className="flex flex-col justify-between rounded-2xl border border-amber-100 bg-[#FCFAF2] p-4 transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100/90 text-amber-700">
                <Layers className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                Categories
              </span>
            </div>
            <div className="mt-4">
              <span className="text-xs font-bold text-slate-500">Active Types</span>
              <p className="mt-0.5 text-2xl font-black text-slate-900 sm:text-3xl">
                {counts.Full > 0 && counts.Coworking > 0 ? "Full & Desk" : "Spaces"}
              </p>
              <span className="mt-1 block text-[11px] font-medium text-slate-400">
                {counts.Full} Full · {counts.Space} Space · {counts.Coworking} Desk
              </span>
            </div>
          </div>
        </div>

        {/* ================= CATEGORY FILTER PILLS: All, Full, Space, Coworking ================= */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            {(["All", "Full", "Space", "Coworking"] as BookingCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer active:scale-95 ${
                  selectedCategory === cat
                    ? "bg-[#6344E7] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{cat === "All" ? "All Bookings" : cat}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    selectedCategory === cat
                      ? "bg-white/25 text-white"
                      : "bg-white text-slate-700"
                  }`}
                >
                  {counts[cat]}
                </span>
              </button>
            ))}
          </div>

          {/* Search + View Mode Toolbar */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px] flex-1 sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search by code or name…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-7 text-xs font-medium text-slate-900 outline-none transition focus:border-[#6344E7] focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-white text-[#6344E7] shadow-xs"
                    : "text-slate-400 hover:text-slate-700"
                }`}
                title="Cards view"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-[#6344E7] shadow-xs"
                    : "text-slate-400 hover:text-slate-700"
                }`}
                title="Table view"
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </p>
        )}

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredRows.length === 0 && !error && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-[#6344E7]">
              <CalendarCheck size={28} />
            </div>
            <p className="mt-3 text-base font-black text-slate-900">
              No {selectedCategory !== "All" ? selectedCategory : ""} bookings found
            </p>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? "Try adjusting your search query to find your booking."
                : "Reserve a dedicated studio or coworking desk to get started with your creative projects."}
            </p>
            <Link
              to="/spaces"
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#6344E7] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#5233d6]"
            >
              <Store size={14} />
              <span>Browse Spaces & Coworking</span>
            </Link>
          </div>
        )}

        {/* ================= CARDS VIEW ================= */}
        {!loading && viewMode === "cards" && filteredRows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRows.map((row) => {
              const cat = getBookingCategory(row);
              const benefitVal =
                Number(row.benefit) ||
                (Number(row.discount) || Number(row.savings) || 0) +
                  (Number(row.cashback) || 0);

              const formattedDate =
                when(row.startDate) ||
                (row.notes?.match(/Coworking\s+([^.]*)/i)?.[1]?.trim() ?? "—");

              const timeRange =
                row.startTime && row.endTime
                  ? `${row.startTime} – ${row.endTime}`
                  : row.durationHours
                  ? `${row.durationHours} Hours`
                  : "";

              return (
                <div
                  key={row.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Booking Code, Category badge, Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-900">
                          {row.bookingCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyBookingCode(row.bookingCode)}
                          className="text-slate-400 hover:text-[#6344E7] transition cursor-pointer"
                          title="Copy Code"
                        >
                          <Copy size={13} />
                        </button>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${categoryBadgeStyle(
                            cat
                          )}`}
                        >
                          {cat}
                        </span>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${statusTone(
                          row.status
                        )}`}
                      >
                        {row.status || "Confirmed"}
                      </span>
                    </div>

                    {/* Booking Title / Space Name */}
                    <h3 className="mt-3 text-base font-black text-slate-900 leading-snug">
                      {row.spaceName || row.planName}
                    </h3>

                    {/* Dates & Timing */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-[#6344E7] shrink-0" />
                        <span className="font-medium">{formattedDate}</span>
                      </div>

                      {timeRange && (
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className="text-[#6344E7] shrink-0" />
                          <span className="font-medium">{timeRange}</span>
                        </div>
                      )}

                      {row.drink && (
                        <div className="flex items-center gap-1.5">
                          <Coffee size={14} className="text-[#6344E7] shrink-0" />
                          <span className="font-medium">{row.drink}</span>
                        </div>
                      )}
                    </div>

                    {/* Benefit / Savings pill */}
                    {benefitVal > 0 && (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-100">
                        <Sparkles size={12} className="text-emerald-600" />
                        <span>Benefit received: {inr(benefitVal)}</span>
                        {row.cashback ? (
                          <span className="text-[10px] text-emerald-600">
                            (+{inr(row.cashback)} cashback)
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Bottom Row: Amount paid & Invoice action */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400">
                        Paid Amount
                      </span>
                      <p className="text-base font-black text-slate-900">
                        {inr(row.payable)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => downloadCoworkingInvoice(row)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 cursor-pointer"
                    >
                      <Download size={13} className="text-[#6344E7]" />
                      <span>Invoice</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= TABLE VIEW ================= */}
        {!loading && viewMode === "table" && filteredRows.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Booking Code</th>
                    <th className="px-4 py-3">Space / Plan</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Benefit</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => {
                    const cat = getBookingCategory(row);
                    const benefitVal =
                      Number(row.benefit) ||
                      (Number(row.discount) || Number(row.savings) || 0) +
                        (Number(row.cashback) || 0);

                    const formattedDate =
                      when(row.startDate) ||
                      (row.notes?.match(/Coworking\s+([^.]*)/i)?.[1]?.trim() ?? "—");

                    const timeRange =
                      row.startTime && row.endTime
                        ? `${row.startTime} – ${row.endTime}`
                        : row.durationHours
                        ? `${row.durationHours}h`
                        : "";

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                          {row.bookingCode}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {row.spaceName || row.planName}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${categoryBadgeStyle(
                              cat
                            )}`}
                          >
                            {cat}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-medium">
                          <div>{formattedDate}</div>
                          {timeRange && (
                            <div className="text-[10px] text-slate-400">{timeRange}</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {benefitVal > 0 ? (
                            <span className="font-bold text-emerald-700">
                              +{inr(benefitVal)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-black text-slate-900">
                          {inr(row.payable)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${statusTone(
                              row.status
                            )}`}
                          >
                            {row.status || "Confirmed"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => downloadCoworkingInvoice(row)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            <Download size={12} className="text-[#6344E7]" />
                            <span>Invoice</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardSidebar
        mode="drawer"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="mx-auto max-w-[1440px] p-4 md:p-6">
        <div className="hidden gap-6 xl:flex">
          <DashboardSidebar mode="fixed" />
          <div className="min-w-0 flex-1 space-y-6">
            <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
            {content}
          </div>
        </div>
        <div className="xl:hidden">
          <div className="space-y-5 pb-6">
            <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
