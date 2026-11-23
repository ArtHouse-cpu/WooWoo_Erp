import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Clock3,
  Crown,
  FileText,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  Store,
  TrendingUp,
  User,
  Users,
  Utensils,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SpaceUtilizationPanel from "@/features/BookingOverview/SpaceUtilization";
import { handleGetBookingOverview, type SpaceUtilization } from "@/services/apiClient";
import {
  fetchInsights,
  fetchVisitHistory,
  fetchVisitors,
  type InsightMembership,
  type InsightPreset,
  type InsightQuery,
  type InsightSegment,
  type InsightsPayload,
  type RankedCustomer,
  type RankedItem,
  type VisitHistory,
  type VisitorRow,
} from "@/features/purchase/insightsApi";

const PRESETS: { id: InsightPreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 Days" },
  { id: "last30", label: "Last 30 Days" },
  { id: "thisMonth", label: "This Month" },
  { id: "lastMonth", label: "Last Month" },
  { id: "year", label: "This Year" },
  { id: "custom", label: "Custom" },
];

const PRIMARY_TABS: { id: InsightSegment; label: string }[] = [
  { id: "all", label: "Overall" },
  { id: "food", label: "Food" },
  { id: "store", label: "Store" },
  { id: "space", label: "Space" },
  { id: "membership", label: "Membership" },
];

const SEGMENT_COLOR: Record<string, string> = {
  food: "#f59e0b",
  space: "#6366f1",
  store: "#0d9488",
  membership: "#7c3aed",
};
const inr = (value: number) => `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;
const pretty = (ymd?: string) => {
  if (!ymd) return "—";
  const [year, month, day] = ymd.split("-").map(Number);
  if (!year || !month || !day) return ymd;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const apiMessage = (error: unknown) => {
  const err = error as { response?: { data?: { message?: string } } };
  return err?.response?.data?.message || "Could not load insights. Try again.";
};

const InsightsAnalyticsScreen = () => {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<InsightPreset>("last30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [segment, setSegment] = useState<InsightSegment>("all");
  const [membership, setMembership] = useState<InsightMembership>("all");
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [spaceUse, setSpaceUse] = useState<SpaceUtilization | null>(null);

  const query = useMemo<InsightQuery>(
    () => ({ preset, from, to, segment, membership }),
    [preset, from, to, segment, membership],
  );
  const canLoad = preset !== "custom" || (Boolean(from) && Boolean(to) && from <= to);

  useEffect(() => {
    if (!canLoad) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchInsights(query)
      .then(payload => {
        if (!controller.signal.aborted) setData(payload);
      })
      .catch(err => {
        if (!controller.signal.aborted) setError(apiMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, canLoad, reloadKey]);

  useEffect(() => {
    if (!data?.range?.from || !data.range.to) return;
    if (segment !== "all" && segment !== "space") {
      setSpaceUse(null);
      return;
    }
    const controller = new AbortController();
    handleGetBookingOverview({ from: data.range.from, to: data.range.to, limit: 1 })
      .then(payload => {
        if (!controller.signal.aborted) setSpaceUse(payload.utilization || null);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSpaceUse(null);
      });
    return () => controller.abort();
  }, [data?.range?.from, data?.range?.to, segment]);

  const reset = () => {
    setPreset("last30");
    setFrom("");
    setTo("");
    setSegment("all");
    setMembership("all");
  };

  const segmentLabel =
    segment === "all"
      ? "All Segments"
      : segment === "food"
      ? "Food"
      : segment === "space"
      ? "Space"
      : segment === "store"
      ? "Store"
      : "Membership";

  const membershipLabel =
    membership === "all"
      ? "All Customers"
      : membership === "member"
      ? "Membership"
      : "Non-membership";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F2EDFD] via-[#F4F3FF] to-[#E9EFFD] px-3 py-3 sm:px-6 sm:py-5">
      <div className="mx-auto max-w-7xl space-y-3 sm:space-y-3.5">
        {/* ================= TOP HEADER (MATCH REFERENCE) ================= */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-100/90 transition hover:scale-95 active:scale-90 cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="truncate text-lg sm:text-xl font-black tracking-tight text-slate-900">
              Insights
            </h1>
          </div>

          {/* Right: Refresh icon button on desktop / All Customers filter icon button on mobile, Date filter */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Desktop Refresh icon button */}
            <button
              type="button"
              onClick={() => setReloadKey(k => k + 1)}
              className="hidden sm:flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#673DE6] shadow-[0_2px_10px_rgba(103,61,230,0.08)] border border-purple-100/90 transition hover:bg-purple-50 hover:scale-95 active:scale-90 cursor-pointer"
              aria-label="Refresh data"
              title="Refresh"
            >
              <RefreshCw size={16} strokeWidth={2.3} className={loading ? "animate-spin" : ""} />
            </button>

            {/* Mobile Only: All Customers filter icon button (replaces refresh icon on mobile) */}
            <div className="relative sm:hidden">
              <button
                type="button"
                className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-[0_2px_10px_rgba(103,61,230,0.08)] border transition active:scale-95 cursor-pointer ${
                  membership !== "all"
                    ? "border-[#673DE6] bg-purple-50 text-[#673DE6]"
                    : "border-purple-100/90 text-slate-700 hover:bg-purple-50/50"
                }`}
                aria-label="Customer filter"
                title={`Customer: ${membershipLabel}`}
              >
                <Users size={16} strokeWidth={2.2} className="text-[#673DE6]" />
                {membership !== "all" && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#673DE6] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#673DE6]" />
                  </span>
                )}
              </button>
              <select
                value={membership}
                onChange={e => setMembership(e.target.value as InsightMembership)}
                aria-label="Customer filter"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              >
                <option value="all">All Customers</option>
                <option value="member">Membership</option>
                <option value="nonmember">Non-membership</option>
              </select>
            </div>

            {/* Date filter pill with pink sparkle burst accent */}
            <div className="relative shrink-0">
              {/* Pink burst decorative rays */}
              <div className="absolute -top-2.5 -right-1 text-[#F43F5E] pointer-events-none select-none">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M12 2v4" />
                  <path d="M19.5 4.5l-2.8 2.8" />
                  <path d="M22 12h-4" />
                </svg>
              </div>

              <div className="relative">
                <div className="flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 shadow-[0_2px_10px_rgba(103,61,230,0.08)] border border-purple-100/90 text-slate-800 font-bold text-xs pointer-events-none">
                  <Calendar size={15} className="text-[#673DE6]" strokeWidth={2.2} />
                  <span>{PRESETS.find(p => p.id === preset)?.label || "Date"}</span>
                  <ChevronDown size={14} className="text-slate-500" strokeWidth={2.5} />
                </div>
                <select
                  value={preset}
                  onChange={e => setPreset(e.target.value as InsightPreset)}
                  aria-label="Date range filter"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                >
                  {PRESETS.map(item => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ================= MOBILE PRIMARY TABS (Overall | Food | Store | Space | Membership) ================= */}
        <div className="sm:hidden">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none p-1 bg-white/90 backdrop-blur-xs rounded-2xl border border-purple-100/90 shadow-[0_2px_8px_rgba(103,61,230,0.04)]">
            {PRIMARY_TABS.map(tab => {
              const active = segment === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSegment(tab.id)}
                  className={`flex-1 min-w-[68px] py-2 px-2.5 text-center text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                    active
                      ? "bg-[#673DE6] text-white shadow-[0_2px_8px_rgba(103,61,230,0.28)]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-purple-50/60"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= ROW 2: FILTERS (SEGMENT & MEMBERSHIP) - DESKTOP ONLY ================= */}
        <div className="hidden sm:grid grid-cols-2 gap-3">
          {/* Segment filter pill */}
          <div className="relative">
            <div className="flex items-center justify-between rounded-2xl bg-white px-3.5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100/90 text-slate-800 font-bold text-xs pointer-events-none">
              <div className="flex items-center gap-2 truncate">
                <Layers size={16} className="text-[#673DE6] shrink-0" strokeWidth={2.2} />
                <span className="truncate">{segmentLabel}</span>
              </div>
              <ChevronDown size={14} className="text-slate-500 shrink-0 ml-1" strokeWidth={2.5} />
            </div>
            <select
              value={segment}
              onChange={e => setSegment(e.target.value as InsightSegment)}
              aria-label="Segment filter"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            >
              <option value="all">All Segments</option>
              <option value="food">Food</option>
              <option value="space">Space</option>
              <option value="store">Store</option>
              <option value="membership">Membership</option>
            </select>
          </div>

          {/* Membership filter pill */}
          <div className="relative">
            <div className="flex items-center justify-between rounded-2xl bg-white px-3.5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100/90 text-slate-800 font-bold text-xs pointer-events-none">
              <div className="flex items-center gap-2 truncate">
                <Users size={16} className="text-[#673DE6] shrink-0" strokeWidth={2.2} />
                <span className="truncate">{membershipLabel}</span>
              </div>
              <ChevronDown size={14} className="text-slate-500 shrink-0 ml-1" strokeWidth={2.5} />
            </div>
            <select
              value={membership}
              onChange={e => setMembership(e.target.value as InsightMembership)}
              aria-label="Membership filter"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            >
              <option value="all">All Customers</option>
              <option value="member">Membership</option>
              <option value="nonmember">Non-membership</option>
            </select>
          </div>
        </div>

        {/* ================= ROW 3: ACTION BUTTONS (DESKTOP ONLY - HIDDEN ON MOBILE) ================= */}
        <div className="hidden sm:grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={reset}
            className="flex items-center justify-center gap-2 rounded-2xl border border-purple-200 bg-white py-2.5 text-xs font-bold text-[#673DE6] shadow-[0_2px_8px_rgba(103,61,230,0.06)] hover:bg-purple-50 transition active:scale-95 cursor-pointer"
          >
            <RotateCcw size={15} strokeWidth={2.2} />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={() => setReloadKey(k => k + 1)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#673DE6] py-2.5 text-xs font-bold text-white shadow-[0_4px_14px_rgba(103,61,230,0.35)] hover:bg-[#5B33D4] transition active:scale-95 cursor-pointer"
          >
            <RefreshCw size={15} strokeWidth={2.2} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Custom date range if selected */}
        {preset === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center justify-between rounded-2xl bg-white px-3.5 py-2 shadow-xs border border-purple-100 text-xs font-bold text-slate-700">
              <span className="text-[10px] uppercase text-purple-600 font-extrabold">From</span>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="bg-transparent text-xs outline-none" />
            </label>
            <label className="flex items-center justify-between rounded-2xl bg-white px-3.5 py-2 shadow-xs border border-purple-100 text-xs font-bold text-slate-700">
              <span className="text-[10px] uppercase text-purple-600 font-extrabold">To</span>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="bg-transparent text-xs outline-none" />
            </label>
          </div>
        )}

        {/* ================= DESKTOP: SEGMENT CARDS THEN PERIOD KPIS ================= */}
        <div className="hidden sm:block space-y-3">
          {data ? (
            <SegmentCards
              segments={
                segment === "all"
                  ? data.segments
                  : data.segments.filter(s => s.key === segment)
              }
            />
          ) : null}
          {data ? <PeriodKpis periods={data.peak.periods} /> : null}
        </div>

        {/* ================= MOBILE: TIME-BASED KPIS IN ALL 5 TABS ================= */}
        <div className="sm:hidden space-y-3">
          {data ? <PeriodKpis periods={data.peak.periods} /> : null}
          {data ? (
            <SegmentCards
              segments={
                segment === "all"
                  ? data.segments
                  : data.segments.filter(s => s.key === segment)
              }
            />
          ) : null}
        </div>

        {/* ================= SPACE BOOKING UTILIZATION & DAY-WISE CHART ================= */}
        {segment !== "food" && (segment === "all" || segment === "space") && (
          <SpaceUtilizationPanel data={spaceUse} />
        )}

        {/* ================= ERROR & SKELETON ================= */}
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold text-rose-700 shadow-2xs">
            {error}
          </div>
        ) : null}
        {preset === "custom" && !canLoad ? (
          <div className="rounded-2xl border border-purple-100 bg-white px-4 py-8 text-center text-xs sm:text-sm font-semibold text-purple-600 shadow-2xs">
            Choose a start and end date.
          </div>
        ) : null}

        {loading && !data ? <Skeleton /> : null}

        {/* ================= REVENUE, TOP ITEMS, VISITORS, PEAK ================= */}
        {data ? (
          <>
            <RevenueSection data={data} loading={loading} segment={segment} />
            <TopSection data={data} segment={segment} />
            <VisitorSection query={query} summary={data.visitors} />
            <PeakSection data={data} />
          </>
        ) : null}
      </div>
    </div>
  );
};

function ChipGroup<T extends string>({
  value,
  onChange,
  options,
  fullWidth = false,
  className = "",
}: {
  value: T;
  onChange: (value: T) => void;
  options: [T, string][];
  fullWidth?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center rounded-xl bg-purple-50/80 p-0.5 border border-purple-100/80 ${
        fullWidth ? "w-full" : ""
      } ${className}`}
    >
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`rounded-lg px-2.5 py-1.5 text-[10px] sm:text-[11px] font-bold transition cursor-pointer text-center justify-center whitespace-nowrap ${
            fullWidth ? "flex-1" : ""
          } ${
            value === id
              ? "bg-[#673DE6] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function PeriodKpis({ periods }: { periods: InsightsPayload["peak"]["periods"] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
      {periods.map(row => (
        <div
          key={row.key}
          className="rounded-2xl border border-purple-100/90 bg-white p-3 sm:p-3.5 text-xs shadow-[0_2px_8px_rgba(103,61,230,0.04)] hover:border-purple-200 transition"
        >
          <div className="flex items-center justify-between">
            <p className="font-bold text-slate-900 text-xs sm:text-sm">{row.label}</p>
            <span className="rounded-lg bg-purple-100/80 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-[#673DE6]">
              {row.share}%
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-medium">{row.hint}</p>
          <p className="mt-1.5 font-bold text-slate-800 text-[11px] sm:text-xs leading-tight">
            {row.bills} bills <span className="text-slate-400 font-normal">·</span>{" "}
            <span className="text-emerald-600 font-bold">{inr(row.revenue)}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

function SegmentCards({ segments }: { segments: InsightsPayload["segments"] }) {
  const isSingle = segments.length === 1;

  return (
    <div
      className={
        isSingle
          ? "w-full"
          : "flex overflow-x-auto gap-3 pb-2 pt-1 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none snap-x snap-mandatory overscroll-x-contain"
      }
    >
      {segments.map((row) => {
        const isFood = row.key === "food";
        const isSpace = row.key === "space";
        const isStore = row.key === "store";
        const isMembership = row.key === "membership";

        const cardTheme = isFood
          ? "border-amber-200/90 bg-gradient-to-br from-amber-50/80 via-orange-50/30 to-white shadow-xs"
          : isSpace
          ? "border-indigo-200/90 bg-gradient-to-br from-indigo-50/80 via-purple-50/30 to-white shadow-xs"
          : isStore
          ? "border-teal-200/90 bg-gradient-to-br from-teal-50/80 via-emerald-50/30 to-white shadow-xs"
          : "border-purple-200/90 bg-gradient-to-br from-purple-50/80 via-fuchsia-50/30 to-white shadow-xs";

        const iconTheme = isFood
          ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/25"
          : isSpace
          ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-500/25"
          : isStore
          ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm shadow-teal-500/25"
          : "bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-500/25";

        const textTheme = isFood
          ? "text-amber-950"
          : isSpace
          ? "text-indigo-950"
          : isStore
          ? "text-teal-950"
          : "text-purple-950";

        const dlTheme = isFood
          ? "bg-amber-50/70 border-amber-100/90"
          : isSpace
          ? "bg-indigo-50/70 border-indigo-100/90"
          : isStore
          ? "bg-teal-50/70 border-teal-100/90"
          : "bg-purple-50/70 border-purple-100/90";

        return (
          <article
            key={row.key}
            className={`${
              isSingle
                ? "w-full sm:max-w-xl"
                : "w-[85vw] max-w-[340px] sm:w-[320px] shrink-0 snap-start"
            } flex flex-col justify-between rounded-2xl border ${cardTheme} p-3.5 sm:p-4`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconTheme}`}>
                    {isFood ? (
                      <Utensils size={15} />
                    ) : isSpace ? (
                      <Store size={15} />
                    ) : isStore ? (
                      <ShoppingBag size={15} />
                    ) : (
                      <Crown size={15} />
                    )}
                  </span>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900">{row.label}</p>
                    <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">
                      {isMembership
                        ? `${row.activeMembers ?? 0} active members`
                        : `${row.share}% of net sales`}
                    </p>
                  </div>
                </div>
                <Trend value={row.changePct} />
              </div>
              <p className={`mt-2.5 sm:mt-3 text-xl sm:text-2xl font-black ${textTheme}`}>{inr(row.revenue)}</p>

              {isMembership ? (
                <dl className={`mt-2.5 sm:mt-3 grid grid-cols-2 gap-2 text-[10px] sm:text-[11px] rounded-xl p-2.5 border ${dlTheme}`}>
                  <div>
                    <dt className="text-slate-500 font-medium">Revenue</dt>
                    <dd className="font-bold text-slate-800">{inr(row.revenue)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Total active members</dt>
                    <dd className="font-bold text-slate-800">{row.activeMembers ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Expired</dt>
                    <dd className="font-bold text-slate-800">{row.expiredMembers ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium truncate">Top selling</dt>
                    <dd
                      className="font-bold text-slate-800 truncate"
                      title={row.topSellingMembership || row.top[0]?.name || "—"}
                    >
                      {row.topSellingMembership || row.top[0]?.name || "—"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <dl className={`mt-2.5 sm:mt-3 grid grid-cols-2 gap-2 text-[10px] sm:text-[11px] rounded-xl p-2.5 border ${dlTheme}`}>
                  <div><dt className="text-slate-500 font-medium">Bills</dt><dd className="font-bold text-slate-800">{row.bills}</dd></div>
                  <div><dt className="text-slate-500 font-medium">Average bill</dt><dd className="font-bold text-slate-800">{inr(row.average)}</dd></div>
                  <div><dt className="text-slate-500 font-medium">{isSpace ? "Booked hours" : "Quantity sold"}</dt><dd className="font-bold text-slate-800">{isSpace ? row.hours : row.qty}</dd></div>
                  <div><dt className="text-slate-500 font-medium">{isSpace ? "Bookings" : "Previous period"}</dt><dd className="font-bold text-slate-800">{isSpace ? row.bookings : inr(row.previousRevenue)}</dd></div>
                </dl>
              )}
            </div>

            {isMembership ? (
              <p className="mt-2.5 truncate text-[10px] sm:text-[11px] text-slate-500">
                Top selling membership: <span className="font-bold text-slate-800">{row.topSellingMembership || row.top[0]?.name || "—"}</span>
              </p>
            ) : row.top[0] ? (
              <p className="mt-2.5 truncate text-[10px] sm:text-[11px] text-slate-500">Top: <span className="font-bold text-slate-800">{row.top[0].name}</span></p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function RevenueSection({
  data,
  loading,
  segment = "all",
}: {
  data: InsightsPayload;
  loading: boolean;
  segment?: InsightSegment;
}) {
  const [mobileSlide, setMobileSlide] = useState(0);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  const handleMobileScroll = () => {
    if (!mobileScrollRef.current) return;
    const { scrollLeft, clientWidth } = mobileScrollRef.current;
    if (clientWidth > 0) {
      const idx = Math.round(scrollLeft / clientWidth);
      setMobileSlide(idx);
    }
  };

  const scrollToSlide = (idx: number) => {
    if (!mobileScrollRef.current) return;
    const clientWidth = mobileScrollRef.current.clientWidth;
    mobileScrollRef.current.scrollTo({
      left: idx * clientWidth,
      behavior: "smooth",
    });
    setMobileSlide(idx);
  };

  const currentSegment = segment === "all" ? null : data.segments.find(s => s.key === segment);

  const totalRevenue = currentSegment ? currentSegment.revenue : data.totals.revenue;
  const growth = currentSegment ? currentSegment.changePct : data.totals.changePct;
  const previousRevenue = currentSegment ? currentSegment.previousRevenue : data.totals.previousRevenue;
  const share = currentSegment ? currentSegment.share : 100;

  const totalBills = currentSegment ? currentSegment.bills : data.totals.bills;
  const avgBill = currentSegment
    ? currentSegment.average || (currentSegment.bills > 0 ? Math.round(currentSegment.revenue / currentSegment.bills) : 0)
    : (data.totals.bills > 0 ? Math.round(data.totals.revenue / data.totals.bills) : 0);

  const itemsSold = currentSegment
    ? (segment === "space"
        ? (currentSegment.hours ? `${currentSegment.hours} hrs` : `${currentSegment.bookings} bookings`)
        : segment === "membership"
        ? `${currentSegment.activeMembers ?? currentSegment.qty} members`
        : `${currentSegment.qty} sold`)
    : `${data.segments.reduce((sum, s) => sum + (s.qty || 0), 0)} sold`;

  const filteredSegments =
    segment === "all"
      ? data.segments
      : data.segments.filter(row => row.key === segment);

  const donut = filteredSegments
    .filter(row => row.revenue > 0)
    .map(row => ({
      name: row.label,
      value: row.revenue,
      share: row.share,
      color: SEGMENT_COLOR[row.key],
    }));
  const memberDonut = [
    { name: "Membership", value: data.membership.memberRevenue, share: data.membership.memberShare, color: "#7c3aed" },
    { name: "Non-membership", value: data.membership.otherRevenue, share: data.membership.otherShare, color: "#94a3b8" },
  ].filter(row => row.value > 0);

  return (
    <section className="space-y-3">
      <SectionTitle title="Revenue Overview" note={loading ? "Updating…" : "Compared with previous period"} />

      {/* ================= REVENUE & BILLS KPI CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Card 1: Revenue Overview Card */}
        <article className="flex flex-col justify-between rounded-2xl border border-purple-200/90 bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/30 p-3.5 sm:p-4 shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#673DE6] text-white shadow-sm shadow-purple-500/25">
                  <TrendingUp size={16} strokeWidth={2.3} />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    {segment === "all" ? "Total Revenue" : `${currentSegment?.label || "Segment"} Revenue`}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-purple-700">
                    {share}% of sales
                  </p>
                </div>
              </div>
              <Trend value={growth} />
            </div>

            <p className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {inr(totalRevenue)}
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-purple-100/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Growth vs previous</span>
            <span className="font-bold text-slate-800">
              {growth != null ? `${growth >= 0 ? "+" : ""}${growth}%` : "New"}
              {previousRevenue > 0 ? ` (Prev: ${inr(previousRevenue)})` : ""}
            </span>
          </div>
        </article>

        {/* Card 2: New Card for Bills */}
        <article className="flex flex-col justify-between rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/30 p-3.5 sm:p-4 shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-500/25">
                  <FileText size={16} strokeWidth={2.3} />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">Bills & Items</h3>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-indigo-700">
                    Average: {inr(avgBill)}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-extrabold text-indigo-700 border border-indigo-200/80">
                {totalBills} {totalBills === 1 ? "bill" : "bills"}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-indigo-50/60 border border-indigo-100/80 p-2.5 text-center">
              <div>
                <dt className="text-[10px] font-medium text-slate-500 truncate">Avg. Bill</dt>
                <dd className="mt-0.5 text-xs sm:text-sm font-black text-slate-900 truncate">
                  {inr(avgBill)}
                </dd>
              </div>
              <div className="border-x border-indigo-100/90 px-1">
                <dt className="text-[10px] font-medium text-slate-500 truncate">Total Bills</dt>
                <dd className="mt-0.5 text-xs sm:text-sm font-black text-indigo-700 truncate">
                  {totalBills}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-medium text-slate-500 truncate">Items Sold</dt>
                <dd className="mt-0.5 text-xs sm:text-sm font-black text-emerald-700 truncate">
                  {itemsSold}
                </dd>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-indigo-100/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Volume summary</span>
            <span className="font-bold text-slate-800">
              {totalBills} bills · {itemsSold}
            </span>
          </div>
        </article>
      </div>

      {/* MOBILE VIEW ONLY: Both donuts unified inside ONE box, horizontally scrollable */}
      <div className="block sm:hidden">
        <article className="rounded-2xl border border-purple-100/90 bg-white p-3.5 shadow-xs">
          {/* Header inside box with slide tabs & pagination dots */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-purple-100/70">
            <div className="flex items-center gap-1 rounded-xl bg-purple-50/80 p-0.5 border border-purple-100/80">
              <button
                type="button"
                onClick={() => scrollToSlide(0)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                  mobileSlide === 0
                    ? "bg-[#673DE6] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Segment
              </button>
              <button
                type="button"
                onClick={() => scrollToSlide(1)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                  mobileSlide === 1
                    ? "bg-[#673DE6] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Membership
              </button>
            </div>

            {/* Pagination indicator dots */}
            <div className="flex items-center gap-1.5 px-1">
              <button
                type="button"
                onClick={() => scrollToSlide(0)}
                aria-label="View Segment Breakdown"
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  mobileSlide === 0 ? "w-5 bg-[#673DE6]" : "w-2 bg-purple-200"
                }`}
              />
              <button
                type="button"
                onClick={() => scrollToSlide(1)}
                aria-label="View Membership Breakdown"
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  mobileSlide === 1 ? "w-5 bg-[#673DE6]" : "w-2 bg-purple-200"
                }`}
              />
            </div>
          </div>

          {/* Horizontally scrollable slides container */}
          <div
            ref={mobileScrollRef}
            onScroll={handleMobileScroll}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none overscroll-x-contain"
          >
            <div className="w-full shrink-0 snap-start">
              <DonutBlock
                title="By Business Segment"
                center={inr(data.totals.revenue)}
                rows={donut}
                empty="No billed sales in this range."
              />
            </div>
            <div className="w-full shrink-0 snap-start">
              <DonutBlock
                title="Membership vs Non-membership"
                center={inr(data.totals.revenue)}
                rows={memberDonut}
                empty="No billed sales in this range."
              />
            </div>
          </div>
        </article>
      </div>

      {/* WEB VIEW (UNTOUCHED): 2 separate side-by-side boxes */}
      <div className="hidden sm:grid sm:grid-cols-2 gap-2.5 sm:gap-3">
        <DonutCard
          title="By Business Segment"
          center={inr(data.totals.revenue)}
          rows={donut}
          empty="No billed sales in this range."
          theme="amber"
        />
        <DonutCard
          title="Membership vs Non-membership"
          center={inr(data.totals.revenue)}
          rows={memberDonut}
          empty="No billed sales in this range."
          theme="purple"
        />
      </div>
    </section>
  );
}

function DonutBlock({
  title,
  center,
  rows,
  empty,
}: {
  title: string;
  center: string;
  rows: { name: string; value: number; share: number; color: string }[];
  empty: string;
}) {
  return (
    <div>
      <h3 className="text-xs sm:text-sm font-bold text-slate-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-8 sm:py-16 text-center text-xs sm:text-sm text-slate-400">{empty}</p>
      ) : (
        <div className="mt-2 grid items-center gap-2 sm:grid-cols-[200px_1fr] md:grid-cols-[220px_1fr]">
          <div className="relative h-44 sm:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={rows} dataKey="value" nameKey="name" innerRadius={52} outerRadius={72} paddingAngle={2} stroke="none">
                  {rows.map(row => <Cell key={row.name} fill={row.color} />)}
                </Pie>
                <Tooltip formatter={(value, _name, item) => [inr(Number(value) || 0), `${item?.payload?.share ?? 0}%`]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-slate-400">Net Sales</span>
              <span className="text-xs sm:text-sm font-black text-slate-900">{center}</span>
            </div>
          </div>
          <ul className="space-y-1.5 sm:space-y-2">
            {rows.map(row => (
              <li key={row.name} className="flex items-center justify-between gap-2 sm:gap-3 text-[11px] sm:text-xs">
                <span className="flex items-center gap-1.5 sm:gap-2 text-slate-600 truncate">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: row.color }} />
                  <span className="truncate font-medium">{row.name}</span>
                </span>
                <span className="font-bold text-slate-900 shrink-0">{inr(row.value)} · {row.share}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DonutCard({
  title,
  center,
  rows,
  empty,
  theme = "purple",
}: {
  title: string;
  center: string;
  rows: { name: string; value: number; share: number; color: string }[];
  empty: string;
  theme?: "amber" | "purple";
}) {
  const cardBorder = theme === "amber"
    ? "border-amber-100/90 bg-gradient-to-br from-amber-50/20 via-white to-purple-50/20"
    : "border-purple-100/90 bg-gradient-to-br from-purple-50/25 via-white to-indigo-50/20";

  return (
    <article className={`rounded-2xl border ${cardBorder} p-3.5 sm:p-4 shadow-xs`}>
      <DonutBlock title={title} center={center} rows={rows} empty={empty} />
    </article>
  );
}

function Trend({ value }: { value: number | null }) {
  if (value == null) return <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-[#673DE6] border border-purple-200">New</span>;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold border ${
      up ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
    }`}>
      {up ? "+" : ""}{value}%
    </span>
  );
}

function TopSection({
  data,
  segment = "all",
}: {
  data: InsightsPayload;
  segment?: InsightSegment;
}) {
  const [viewType, setViewType] = useState<"customers" | "items">("customers");
  const [limit, setLimit] = useState<5 | 10>(5);
  const [sort, setSort] = useState<"revenue" | "qty">("revenue");

  const allItemColumns: {
    key: "food" | "store" | "space" | "membership";
    title: string;
    icon: typeof Utensils;
    borderBg: string;
    titleColor: string;
    iconColor: string;
  }[] = [
    {
      key: "food",
      title: "Most Selling Food",
      icon: Utensils,
      borderBg: "border-amber-200/90 bg-gradient-to-b from-amber-50/40 via-white to-white",
      titleColor: "text-amber-900",
      iconColor: "text-amber-600",
    },
    {
      key: "space",
      title: "Most Popular Spaces",
      icon: Store,
      borderBg: "border-indigo-200/90 bg-gradient-to-b from-indigo-50/40 via-white to-white",
      titleColor: "text-indigo-900",
      iconColor: "text-indigo-600",
    },
    {
      key: "store",
      title: "Most Selling Store Products",
      icon: ShoppingBag,
      borderBg: "border-teal-200/90 bg-gradient-to-b from-teal-50/40 via-white to-white",
      titleColor: "text-teal-900",
      iconColor: "text-teal-600",
    },
    {
      key: "membership",
      title: "Top Memberships",
      icon: Crown,
      borderBg: "border-purple-200/90 bg-gradient-to-b from-purple-50/40 via-white to-white",
      titleColor: "text-purple-900",
      iconColor: "text-purple-600",
    },
  ];

  const allCustomerColumns: {
    key: "food" | "store" | "space" | "membership";
    title: string;
    icon: typeof Utensils;
    borderBg: string;
    titleColor: string;
    iconColor: string;
  }[] = [
    {
      key: "food",
      title: "Top Food Customers",
      icon: Utensils,
      borderBg: "border-amber-200/90 bg-gradient-to-b from-amber-50/40 via-white to-white",
      titleColor: "text-amber-900",
      iconColor: "text-amber-600",
    },
    {
      key: "space",
      title: "Top Space Customers",
      icon: Store,
      borderBg: "border-indigo-200/90 bg-gradient-to-b from-indigo-50/40 via-white to-white",
      titleColor: "text-indigo-900",
      iconColor: "text-indigo-600",
    },
    {
      key: "store",
      title: "Top Store Customers",
      icon: ShoppingBag,
      borderBg: "border-teal-200/90 bg-gradient-to-b from-teal-50/40 via-white to-white",
      titleColor: "text-teal-900",
      iconColor: "text-teal-600",
    },
    {
      key: "membership",
      title: "Top Membership Customers",
      icon: Crown,
      borderBg: "border-purple-200/90 bg-gradient-to-b from-purple-50/40 via-white to-white",
      titleColor: "text-purple-900",
      iconColor: "text-purple-600",
    },
  ];

  const columns = useMemo(() => {
    const list = viewType === "customers" ? allCustomerColumns : allItemColumns;
    if (segment === "all") {
      return list.filter((c) => c.key !== "membership");
    }
    return list.filter((c) => c.key === segment);
  }, [segment, viewType]);

  const isSingle = columns.length === 1;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
        <SectionTitle
          title={viewType === "customers" ? "Top Performing Customers" : "Top Performing Items"}
          note={viewType === "customers" ? "Ranked by highest purchase amount" : "Completed final bills only"}
        />
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 shrink-0">
          <ChipGroup
            value={viewType}
            onChange={setViewType}
            options={[
              ["customers", "Customers"],
              ["items", "Items"],
            ]}
          />
          {viewType === "items" && segment !== "membership" && (
            <ChipGroup value={sort} onChange={setSort} options={[["revenue", "Revenue"], ["qty", "Quantity"]]} />
          )}
          {(viewType === "customers" || segment !== "membership") && (
            <ChipGroup
              value={String(limit) as "5" | "10"}
              onChange={value => setLimit(value === "10" ? 10 : 5)}
              options={[["5", "Top 5"], ["10", "Top 10"]]}
            />
          )}
        </div>
      </div>
      <div
        className={
          isSingle
            ? "w-full"
            : "flex overflow-x-auto gap-3 pb-3 pt-1 -mx-3 px-3 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-3 scrollbar-none snap-x snap-mandatory overscroll-x-contain"
        }
      >
        {columns.map(column => {
          const IconComp = column.icon;

          if (viewType === "customers") {
            const customerRows: RankedCustomer[] = (data.topCustomers?.[column.key] || []).slice(0, limit);

            return (
              <article
                key={column.key}
                className={`${
                  isSingle
                    ? "w-full sm:max-w-xl"
                    : "w-[85vw] max-w-[340px] sm:w-[340px] lg:w-auto shrink-0 snap-start"
                } flex flex-col rounded-2xl border ${column.borderBg} p-3 sm:p-4 shadow-xs`}
              >
                <h3 className={`flex items-center gap-2 px-1 text-xs sm:text-sm font-bold ${column.titleColor}`}>
                  <IconComp size={14} className={`${column.iconColor} shrink-0`} />
                  <span>{column.title}</span>
                </h3>
                {customerRows.length === 0 ? (
                  <p className="px-1 py-8 text-center text-xs text-slate-400">No customer purchases in this range.</p>
                ) : (
                  <ol className="mt-2 space-y-1.5 sm:space-y-2 flex-1">
                    {customerRows.map((row, index) => (
                      <RankCustomerRow key={`${row.name}-${row.phone || index}`} index={index + 1} row={row} kind={column.key} />
                    ))}
                  </ol>
                )}
              </article>
            );
          }

          const rawRows: RankedItem[] =
            column.key === "membership"
              ? data.segments.find(s => s.key === "membership")?.top || []
              : data.top[column.key] || [];

          const rows = [...rawRows]
            .sort((a, b) => (sort === "qty" ? b.qty - a.qty : b.revenue - a.revenue))
            .slice(0, limit);

          return (
            <article
              key={column.key}
              className={`${
                isSingle
                  ? "w-full sm:max-w-xl"
                  : "w-[85vw] max-w-[340px] sm:w-[340px] lg:w-auto shrink-0 snap-start"
              } flex flex-col rounded-2xl border ${column.borderBg} p-3 sm:p-4 shadow-xs`}
            >
              <h3 className={`flex items-center gap-2 px-1 text-xs sm:text-sm font-bold ${column.titleColor}`}>
                <IconComp size={14} className={`${column.iconColor} shrink-0`} />
                <span>{column.title}</span>
              </h3>
              {rows.length === 0 ? (
                <p className="px-1 py-8 text-center text-xs text-slate-400">Nothing sold in this range.</p>
              ) : (
                <ol className="mt-2 space-y-1.5 sm:space-y-2 flex-1">
                  {rows.map((row, index) => (
                    <RankRow key={row.name} index={index + 1} row={row} kind={column.key} />
                  ))}
                </ol>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RankRow({
  index,
  row,
  kind,
}: {
  index: number;
  row: RankedItem;
  kind: "food" | "store" | "space" | "membership";
}) {
  const badgeStyle = index === 1
    ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-white font-black shadow-2xs"
    : index === 2
    ? "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800 font-bold"
    : index === 3
    ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold"
    : "bg-purple-100 text-[#673DE6] font-bold";

  return (
    <li className="flex items-center gap-2 rounded-xl bg-white border border-slate-100/90 p-2 shadow-2xs hover:border-purple-200 transition">
      <span className={`flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg text-[10px] sm:text-[11px] shrink-0 ${badgeStyle}`}>
        {index}
      </span>
      {row.image ? (
        <img src={row.image} alt="" className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-cover shrink-0 border border-black/5" />
      ) : (
        <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-slate-50 border border-slate-100 text-slate-400 shrink-0">
          {kind === "food" ? (
            <Utensils size={13} className="text-amber-500/70" />
          ) : kind === "space" ? (
            <Store size={13} className="text-indigo-500/70" />
          ) : kind === "store" ? (
            <ShoppingBag size={13} className="text-teal-500/70" />
          ) : (
            <Crown size={13} className="text-purple-500/70" />
          )}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-slate-800">{row.name}</p>
        <p className="truncate text-[10px] text-slate-400">
          {kind === "store" && row.sku ? `${row.sku} · ` : ""}
          {kind === "space"
            ? `${row.bookings || row.orders} bookings · ${row.hours || 0}h`
            : kind === "membership"
            ? `${row.orders || row.qty || 0} members · ${row.orders || 0} bills`
            : `${row.qty} sold · ${row.orders} bills`}
        </p>
      </div>
      <span className="text-xs font-black text-slate-900 shrink-0">{inr(row.revenue)}</span>
    </li>
  );
}

function RankCustomerRow({
  index,
  row,
  kind,
}: {
  index: number;
  row: RankedCustomer;
  kind: "food" | "store" | "space" | "membership";
}) {
  const badgeStyle =
    index === 1
      ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-white font-black shadow-2xs"
      : index === 2
      ? "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800 font-bold"
      : index === 3
      ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold"
      : "bg-purple-100 text-[#673DE6] font-bold";

  const initials =
    row.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join("") || "U";

  return (
    <li className="flex items-center gap-2 rounded-xl bg-white border border-slate-100/90 p-2 shadow-2xs hover:border-purple-200 transition">
      <span
        className={`flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg text-[10px] sm:text-[11px] shrink-0 ${badgeStyle}`}
      >
        {index}
      </span>
      <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-purple-50 border border-purple-100 text-[#673DE6] font-extrabold text-[11px] sm:text-xs shrink-0">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-slate-800">{row.name}</p>
        <p className="truncate text-[10px] text-slate-400">
          {row.phone ? `${row.phone} · ` : ""}
          {kind === "space"
            ? `${row.bills} ${row.bills === 1 ? "booking" : "bookings"}${row.qty ? ` · ${row.qty}h` : ""}`
            : kind === "membership"
            ? `${row.bills} ${row.bills === 1 ? "plan" : "plans"}${row.topItem ? ` · ${row.topItem}` : ""}`
            : `${row.bills} ${row.bills === 1 ? "order" : "orders"}${row.topItem ? ` · ${row.topItem}` : ""}`}
        </p>
      </div>
      <span className="text-xs font-black text-slate-900 shrink-0">{inr(row.spend)}</span>
    </li>
  );
}

function VisitorSection({
  query,
  summary,
}: {
  query: InsightQuery;
  summary: InsightsPayload["visitors"];
}) {
  const [bucket, setBucket] = useState<"day" | "week" | "month">("day");
  const [visits, setVisits] = useState<"all" | "1" | "2" | "3">("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [rows, setRows] = useState<VisitorRow[]>([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<VisitorRow | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => { setPage(1); }, [query, bucket, visits, debounced]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchVisitors({ ...query, bucket, visits, page, search: debounced })
      .then(payload => {
        if (!active) return;
        setRows(payload.rows || []);
        setPages(payload.pagination?.pages || 1);
        setTotal(payload.pagination?.total || 0);
      })
      .catch(() => {
        if (!active) return;
        setRows([]);
        setTotal(0);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [query, bucket, visits, page, debounced]);

  const donut = [
    { name: "First time", value: summary.firstTime, color: "#0284c7" },
    { name: "Repeat", value: summary.repeat, color: "#7c3aed" },
  ].filter(row => row.value > 0);

  return (
    <section className="space-y-3">
      {/* ================= VISITOR ANALYTICS HERO CARD ================= */}
      <div className="rounded-[28px] sm:rounded-[32px] border border-purple-100/70 bg-[#F9F8FD] p-4 sm:p-6 shadow-[0_4px_24px_rgba(103,61,230,0.04)]">
        {/* Header */}
        <div className="flex items-start gap-2.5 mb-4 sm:mb-5">
          <span className="w-1.5 h-6 rounded-full bg-[#7C3AED] shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
              Visitor Analytics
            </h2>
            <p className="text-xs sm:text-[13px] font-medium text-slate-500 mt-0.5">
              One bill & one transaction. A visit is a unique day with a bill.
            </p>
          </div>
        </div>

        {/* Content Grid: 1 Column on Mobile (KPIs row then Donut), 2 Columns on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-stretch">
          {/* Mobile: KPIs in 1 row (grid-cols-2). Desktop: Left column stacked (md:flex md:flex-col) */}
          <div className="grid grid-cols-2 md:flex md:flex-col gap-2.5 sm:gap-3.5 md:gap-4 justify-between">
            {/* Card 1: First-time visitors */}
            <div className="flex-1 flex flex-col justify-between rounded-2xl md:rounded-[22px] border border-[#BAE6FD] bg-[#F0F9FF] p-3 sm:p-4 md:p-5 shadow-2xs">
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-md sm:rounded-lg bg-[#E0F2FE] text-[#0284C7]">
                    <Users size={13} className="sm:w-4 sm:h-4" strokeWidth={2.2} />
                  </div>
                  <span className="text-[11px] sm:text-xs md:text-sm font-bold text-[#0284C7] truncate">
                    First-time visitors
                  </span>
                </div>
                <p className="mt-1.5 sm:mt-2.5 md:mt-3 text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                  {summary.firstTime}
                </p>
              </div>
              <p className="mt-1.5 sm:mt-2 md:mt-3 text-[10px] sm:text-xs md:text-[13px] font-semibold text-[#0369A1] leading-tight line-clamp-2">
                {summary.firstShare}% of {summary.unique} unique customers
              </p>
            </div>

            {/* Card 2: Repeat visitors */}
            <div className="flex-1 flex flex-col justify-between rounded-2xl md:rounded-[22px] border border-[#E9D5FF] bg-[#FAF5FF] p-3 sm:p-4 md:p-5 shadow-2xs">
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-md sm:rounded-lg bg-[#F3E8FF] text-[#7C3AED]">
                    <Users size={13} className="sm:w-4 sm:h-4" strokeWidth={2.2} />
                  </div>
                  <span className="text-[11px] sm:text-xs md:text-sm font-bold text-[#7C3AED] truncate">
                    Repeat visitors
                  </span>
                </div>
                <p className="mt-1.5 sm:mt-2.5 md:mt-3 text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                  {summary.repeat}
                </p>
              </div>
              <p className="mt-1.5 sm:mt-2 md:mt-3 text-[10px] sm:text-xs md:text-[13px] font-semibold text-[#6D28D9] leading-tight line-clamp-2">
                {summary.repeatShare}% – more than one visit
              </p>
            </div>
          </div>

          {/* Right Column (Desktop) / Row 2 (Mobile): Donut Chart Card */}
          <div className="flex flex-col justify-center rounded-2xl md:rounded-[24px] border border-slate-100/90 bg-white p-3.5 sm:p-5 md:p-6 shadow-xs">
            {donut.length === 0 ? (
              <p className="py-12 text-center text-xs text-slate-400">No visitors in this period.</p>
            ) : (
              <div className="w-full flex items-center justify-center gap-3.5 sm:gap-6 md:gap-8">
                {/* Donut Chart with Center KPI */}
                <div className="relative w-[130px] sm:w-[155px] md:w-[175px] aspect-square shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donut}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="65%"
                        outerRadius="92%"
                        paddingAngle={3}
                        stroke="none"
                      >
                        {donut.map(row => (
                          <Cell key={row.name} fill={row.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val, name) => [
                          `${val} visitors (${summary.unique > 0 ? Math.round((Number(val) / summary.unique) * 1000) / 10 : 0}%)`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center KPI Display */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[6px] sm:text-[9.5px] md:text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      TOTAL VISITORS
                    </span>
                    <span className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 leading-tight my-0.5">
                      {summary.unique}
                    </span>
                    <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-[#7C3AED]">
                      {summary.repeatShare}% repeat
                    </span>
                  </div>
                </div>

                {/* Pointers at Right Side Only */}
                <div className="flex flex-col justify-center gap-2.5 sm:gap-3.5 min-w-0">
                  {/* First-time Pointer */}
                  <div className="flex items-start gap-2 text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#0284C7] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[11px] sm:text-xs font-bold text-slate-700 leading-tight">
                        First-time:
                      </p>
                      <p className="text-xs sm:text-sm font-black text-slate-900 leading-tight mt-0.5">
                        {summary.firstTime}{" "}
                        <span className="text-[10px] sm:text-xs font-semibold text-slate-500">
                          ({summary.firstShare}%)
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Repeat Pointer */}
                  <div className="flex items-start gap-2 text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#7C3AED] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[11px] sm:text-xs font-bold text-slate-700 leading-tight">
                        Repeat:
                      </p>
                      <p className="text-xs sm:text-sm font-black text-slate-900 leading-tight mt-0.5">
                        {summary.repeat}{" "}
                        <span className="text-[10px] sm:text-xs font-semibold text-slate-500">
                          ({summary.repeatShare}%)
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-purple-100/90 bg-white p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 w-full sm:w-auto">
            <ChipGroup
              fullWidth
              className="w-full sm:w-auto"
              value={bucket}
              onChange={setBucket}
              options={[
                ["day", "Per day"],
                ["week", "Per week"],
                ["month", "Per month"],
              ]}
            />
            <ChipGroup
              fullWidth
              className="w-full sm:w-auto"
              value={visits}
              onChange={setVisits}
              options={[
                ["all", "All"],
                ["1", "1 visit"],
                ["2", "2 visits"],
                ["3", "3+ visits"],
              ]}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="flex items-center gap-1.5 rounded-xl border border-purple-200/80 bg-white px-2.5 py-1.5 flex-1 sm:w-48 shadow-2xs">
              <Search size={13} className="text-purple-500 shrink-0" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name or phone..." className="w-full bg-transparent text-xs outline-none font-medium" />
            </label>
            {/* View Switcher for Desktop */}
            <div className="hidden sm:flex rounded-xl bg-purple-50/80 p-0.5 border border-purple-100/80">
              <button
                type="button"
                onClick={() => setViewMode("card")}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === "card" ? "bg-[#673DE6] text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Card View"
              >
                <LayoutGrid size={13} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === "table" ? "bg-[#673DE6] text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Table View"
              >
                <List size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* ================= CARD VIEW (DEFAULT & MOBILE - IMAGE 1) ================= */}
        {viewMode === "card" ? (
          <div className="mt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {rows.map(row => (
                <article
                  key={row.key}
                  onClick={() => setSelected(row)}
                  className="group rounded-2xl border border-purple-100/90 bg-gradient-to-br from-white via-white to-purple-50/15 p-3 sm:p-3.5 shadow-2xs hover:border-[#673DE6]/40 hover:shadow-[0_4px_16px_rgba(103,61,230,0.08)] transition-all active:scale-[0.99] cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Customer header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate group-hover:text-[#673DE6] transition">
                            {row.name}
                          </h4>
                          {row.member && (
                            <span className="shrink-0 rounded-md bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-[#673DE6]">
                              Member
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">{row.phone || "No phone"}</p>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                          row.visitType === "Repeat"
                            ? "bg-purple-100 text-purple-700 border border-purple-200/80"
                            : "bg-sky-100 text-sky-700 border border-sky-200/80"
                        }`}
                      >
                        {row.visitType}
                      </span>
                    </div>

                    {/* 3 Metric Pills */}
                    <div className="mt-2.5 grid grid-cols-3 gap-1.5 rounded-xl bg-purple-50/50 p-2 text-center border border-purple-100/60">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Visits</span>
                        <span className="text-xs sm:text-sm font-bold text-slate-800">{row.visits}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Bills</span>
                        <span className="text-xs sm:text-sm font-bold text-slate-800">{row.bills}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Spent</span>
                        <span className="text-xs sm:text-sm font-black text-emerald-600">{inr(row.spend)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dates footer */}
                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 font-medium pt-2 border-t border-slate-100">
                    <span>First: <strong className="text-slate-600 font-semibold">{pretty(row.firstVisit)}</strong></span>
                    <span>Last: <strong className="text-slate-600 font-semibold">{pretty(row.lastVisit)}</strong></span>
                  </div>
                </article>
              ))}
            </div>
            {!loading && rows.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No customers match this frequency.</p>
            ) : null}
            {loading ? (
              <p className="flex items-center justify-center gap-2 py-4 text-xs text-purple-600 font-semibold">
                <Loader2 size={14} className="animate-spin" /> Loading visitors...
              </p>
            ) : null}
          </div>
        ) : (
          /* ================= TABLE VIEW (OPTIONAL DESKTOP) ================= */
          <div className="mt-3 overflow-x-auto -mx-1 sm:mx-0 rounded-xl border border-slate-100">
            <table className="min-w-[620px] sm:min-w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[10px] uppercase tracking-wider bg-gradient-to-r from-purple-50/70 via-slate-50 to-indigo-50/70 text-slate-600 font-bold">
                <tr>
                  {["Customer", "Phone", "Visits", "Bills", "First visit", "Last visit", "Spending", "Type"].map(heading => (
                    <th key={heading} className="px-3 py-2.5 font-bold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(row => (
                  <tr key={row.key} onClick={() => setSelected(row)} className="cursor-pointer hover:bg-purple-50/40 transition">
                    <td className="px-3 py-2.5 font-bold text-slate-800">{row.name}</td>
                    <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px]">{row.phone || "—"}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-700">{row.visits}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-700">{row.bills}</td>
                    <td className="px-3 py-2.5 text-slate-500">{pretty(row.firstVisit)}</td>
                    <td className="px-3 py-2.5 text-slate-500">{pretty(row.lastVisit)}</td>
                    <td className="px-3 py-2.5 font-black text-emerald-700">{inr(row.spend)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${row.visitType === "Repeat" ? "bg-purple-100 text-purple-700 border border-purple-200/80" : "bg-sky-100 text-sky-700 border border-sky-200/80"}`}>{row.visitType}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && rows.length === 0 ? <p className="py-8 text-center text-xs text-slate-400">No customers match this frequency.</p> : null}
            {loading ? <p className="flex items-center justify-center gap-2 py-4 text-xs text-purple-600 font-semibold"><Loader2 size={14} className="animate-spin" /> Loading visitors...</p> : null}
          </div>
        )}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <span className="font-semibold text-purple-700">{total} customers</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-purple-200 bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-2xs disabled:opacity-40 cursor-pointer">Previous</button>
            <span className="font-bold text-slate-800 self-center">{page} / {pages}</span>
            <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-purple-200 bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-2xs disabled:opacity-40 cursor-pointer">Next</button>
          </div>
        </div>
      </div>
      {selected ? <VisitDialog row={selected} query={query} onClose={() => setSelected(null)} /> : null}
    </section>
  );
}

function VisitDialog({ row, query, onClose }: { row: VisitorRow; query: InsightQuery; onClose: () => void }) {
  const [detail, setDetail] = useState<VisitHistory | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetchVisitHistory(row.key, query)
      .then(payload => { if (active) setDetail(payload); })
      .catch(err => { if (active) setError(apiMessage(err)); });
    return () => { active = false; };
  }, [row.key, query]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-xs p-2 sm:p-3 sm:items-center">
      <div className="max-h-[90vh] sm:max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-purple-100 bg-white p-4 sm:p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">{row.name}</h3>
            <p className="text-[11px] sm:text-xs text-purple-700 font-semibold truncate">{row.phone || "No phone"} {detail?.customer.member ? "· Membership" : ""}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 shrink-0 cursor-pointer"><X size={18} /></button>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        {!detail && !error ? <p className="mt-6 flex justify-center"><Loader2 className="animate-spin text-purple-600" size={20} /></p> : null}
        {detail ? (
          <>
            <dl className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 text-[11px] sm:text-xs">
              <Stat label="Visits in range" value={String(detail.range.visits)} />
              <Stat label="Bills in range" value={String(detail.range.bills)} />
              <Stat label="Spent in range" value={inr(detail.range.spend)} />
              <Stat label="Average per visit" value={inr(detail.range.average)} />
              <Stat label="First visit ever" value={pretty(detail.lifetime.firstVisit)} />
              <Stat label="Last visit ever" value={pretty(detail.lifetime.lastVisit)} />
            </dl>
            <h4 className="mt-4 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-purple-600">Bills in this range</h4>
            <ul className="mt-2 space-y-1.5 sm:space-y-2">
              {detail.range.billsList.map(bill => (
                <li key={bill.invoiceCode} className="rounded-xl border border-purple-100/80 bg-purple-50/30 p-2.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span className="truncate text-purple-900">{bill.invoiceCode}</span>
                    <span className="shrink-0 text-emerald-700 font-black">{inr(bill.amount)}</span>
                  </div>
                  <p className="text-slate-500 truncate mt-0.5">{pretty(bill.date)} · {bill.items.join(", ") || "Items"}</p>
                </li>
              ))}
              {detail.range.billsList.length === 0 ? <li className="text-xs text-slate-400">No bills in this range.</li> : null}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-purple-100/80 bg-gradient-to-br from-purple-50/40 to-white p-2.5 sm:px-3 sm:py-2 shadow-2xs">
      <dt className="text-[10px] sm:text-xs text-slate-500 font-medium">{label}</dt>
      <dd className="font-black text-slate-900 text-xs sm:text-sm mt-0.5">{value}</dd>
    </div>
  );
}

function PeakSection({ data }: { data: InsightsPayload }) {
  const [metric, setMetric] = useState<"bills" | "revenue">("bills");
  const highlight = metric === "bills" ? data.peak.busiestPeriod : data.peak.highestRevenuePeriod;
  return (
    <section className="space-y-3 pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <SectionTitle title="Peak Billing Hours" note="Time is taken from when bill was saved" />
        <ChipGroup
          fullWidth
          className="w-full sm:w-auto"
          value={metric}
          onChange={setMetric}
          options={[
            ["bills", "Number of bills"],
            ["revenue", "Revenue"],
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Mini icon={<Clock3 size={15} />} label="Most active" value={data.peak.busiestPeriod || "—"} theme="amber" />
        <Mini icon={<Store size={15} />} label="Highest revenue" value={data.peak.highestRevenuePeriod || "—"} theme="emerald" />
        <Mini icon={<Users size={15} />} label="Total bills" value={String(data.peak.totalBills)} theme="indigo" />
        <Mini icon={<Clock3 size={15} />} label="Average bills / day" value={String(data.peak.averageBillsPerDay)} theme="rose" />
      </div>
      <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-2">
        <ChartCard title="Time of Day">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.peak.periods} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={28} allowDecimals={false} />
              <Tooltip formatter={(value, name) => [name === "revenue" ? inr(Number(value) || 0) : value, name === "revenue" ? "Revenue" : "Bills"]} />
              <Bar dataKey={metric} radius={[5, 5, 0, 0]}>
                {data.peak.periods.map(row => (
                  <Cell key={row.key} fill={row.label === highlight ? "#673DE6" : "#DDD6FE"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title={`Weekday · Busiest ${data.peak.busiestDay || "—"}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.peak.weekdays} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={28} allowDecimals={false} />
              <Tooltip formatter={(value, name) => [name === "revenue" ? inr(Number(value) || 0) : value, name === "revenue" ? "Revenue" : "Bills"]} />
              <Bar dataKey={metric} radius={[5, 5, 0, 0]}>
                {data.peak.weekdays.map(row => (
                  <Cell key={row.day} fill={row.day === data.peak.busiestDay ? "#059669" : "#A7F3D0"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-2xl border border-purple-100/90 bg-gradient-to-br from-purple-50/20 via-white to-white p-3 sm:p-4 shadow-xs">
      <h3 className="mb-2 text-xs sm:text-sm font-bold text-slate-900">{title}</h3>
      <div className="h-48 sm:h-60">{children}</div>
    </article>
  );
}

function Mini({
  icon,
  label,
  value,
  theme = "indigo",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  theme?: "amber" | "emerald" | "indigo" | "rose";
}) {
  const styles = {
    amber: "border-amber-200/90 bg-gradient-to-br from-amber-50/70 to-white text-amber-950",
    emerald: "border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 to-white text-emerald-950",
    indigo: "border-indigo-200/90 bg-gradient-to-br from-indigo-50/70 to-white text-indigo-950",
    rose: "border-rose-200/90 bg-gradient-to-br from-rose-50/70 to-white text-rose-950",
  }[theme];

  const iconStyles = {
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    indigo: "bg-indigo-100 text-indigo-700",
    rose: "bg-rose-100 text-rose-700",
  }[theme];

  return (
    <article className={`flex items-center gap-2.5 rounded-2xl border p-2.5 sm:px-3 sm:py-3 shadow-xs ${styles}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconStyles}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] sm:text-[11px] font-medium text-slate-500">{label}</p>
        <p className="truncate text-xs sm:text-sm font-black">{value}</p>
      </div>
    </article>
  );
}

function SectionTitle({ title, note }: { title: string; note: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="h-3.5 w-1 rounded-full bg-[#673DE6] shrink-0" />
        <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{title}</h2>
      </div>
      <p className="text-[10px] sm:text-[11px] text-slate-400 pl-2.5 truncate">{note}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-32 sm:h-40 animate-pulse rounded-2xl bg-gradient-to-br from-purple-50 to-slate-100 border border-purple-100" />
      ))}
    </div>
  );
}

export default InsightsAnalyticsScreen;
