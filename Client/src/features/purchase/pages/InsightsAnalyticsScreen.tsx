import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Clock3,
  Layers,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  Store,
  TrendingUp,
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

const SEGMENT_COLOR = { food: "#f59e0b", space: "#6366f1", store: "#0d9488" };
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
    const controller = new AbortController();
    handleGetBookingOverview({ from: data.range.from, to: data.range.to, limit: 1 })
      .then(payload => {
        if (!controller.signal.aborted) setSpaceUse(payload.utilization || null);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSpaceUse(null);
      });
    return () => controller.abort();
  }, [data?.range?.from, data?.range?.to]);

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
      : "Store";

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
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-100/90 transition hover:scale-95 active:scale-90 cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="truncate text-lg sm:text-xl font-black tracking-tight text-slate-900">
              Insights & Analytics
            </h1>
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
              <div className="flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2 shadow-[0_2px_10px_rgba(103,61,230,0.08)] border border-purple-100/90 text-slate-800 font-bold text-xs pointer-events-none">
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

        {/* ================= ROW 2: FILTERS (SEGMENT & MEMBERSHIP) ================= */}
        <div className="grid grid-cols-2 gap-3">
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

        {/* ================= ROW 3: ACTION BUTTONS (RESET & REFRESH) ================= */}
        <div className="grid grid-cols-2 gap-3">
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

        {/* ================= SPACE BOOKING UTILIZATION & DAY-WISE CHART ================= */}
        <SpaceUtilizationPanel data={spaceUse} />

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
            <RevenueSection data={data} loading={loading} />
            <TopSection data={data} />
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
}: {
  value: T;
  onChange: (value: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="flex rounded-xl bg-purple-50/80 p-0.5 border border-purple-100/80">
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`rounded-lg px-2.5 py-1 text-[10px] sm:text-[11px] font-bold transition cursor-pointer ${
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

function RevenueSection({ data, loading }: { data: InsightsPayload; loading: boolean }) {
  const donut = data.segments.filter(row => row.revenue > 0).map(row => ({
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
      <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-2">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {data.segments.map((row, idx) => {
          const cardTheme = row.key === "food"
            ? "border-amber-200/90 bg-gradient-to-br from-amber-50/80 via-orange-50/30 to-white shadow-xs"
            : row.key === "space"
            ? "border-indigo-200/90 bg-gradient-to-br from-indigo-50/80 via-purple-50/30 to-white shadow-xs"
            : "border-teal-200/90 bg-gradient-to-br from-teal-50/80 via-emerald-50/30 to-white shadow-xs";

          const iconTheme = row.key === "food"
            ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/25"
            : row.key === "space"
            ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-500/25"
            : "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm shadow-teal-500/25";

          const textTheme = row.key === "food"
            ? "text-amber-950"
            : row.key === "space"
            ? "text-indigo-950"
            : "text-teal-950";

          const dlTheme = row.key === "food"
            ? "bg-amber-50/70 border-amber-100/90"
            : row.key === "space"
            ? "bg-indigo-50/70 border-indigo-100/90"
            : "bg-teal-50/70 border-teal-100/90";

          return (
            <article
              key={row.key}
              className={`rounded-2xl border ${cardTheme} p-3.5 sm:p-4 ${
                idx === data.segments.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconTheme}`}>
                    {row.key === "food" ? <Utensils size={15} /> : row.key === "space" ? <Store size={15} /> : <ShoppingBag size={15} />}
                  </span>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900">{row.label}</p>
                    <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">{row.share}% of net sales</p>
                  </div>
                </div>
                <Trend value={row.changePct} />
              </div>
              <p className={`mt-2.5 sm:mt-3 text-xl sm:text-2xl font-black ${textTheme}`}>{inr(row.revenue)}</p>
              <dl className={`mt-2.5 sm:mt-3 grid grid-cols-2 gap-2 text-[10px] sm:text-[11px] rounded-xl p-2.5 border ${dlTheme}`}>
                <div><dt className="text-slate-500 font-medium">Bills</dt><dd className="font-bold text-slate-800">{row.bills}</dd></div>
                <div><dt className="text-slate-500 font-medium">Average bill</dt><dd className="font-bold text-slate-800">{inr(row.average)}</dd></div>
                <div><dt className="text-slate-500 font-medium">{row.key === "space" ? "Booked hours" : "Quantity sold"}</dt><dd className="font-bold text-slate-800">{row.key === "space" ? row.hours : row.qty}</dd></div>
                <div><dt className="text-slate-500 font-medium">{row.key === "space" ? "Bookings" : "Previous period"}</dt><dd className="font-bold text-slate-800">{row.key === "space" ? row.bookings : inr(row.previousRevenue)}</dd></div>
              </dl>
              {row.top[0] ? <p className="mt-2.5 truncate text-[10px] sm:text-[11px] text-slate-500">Top: <span className="font-bold text-slate-800">{row.top[0].name}</span></p> : null}
            </article>
          );
        })}
      </div>
    </section>
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
      <h3 className="text-xs sm:text-sm font-bold text-slate-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-10 sm:py-16 text-center text-xs sm:text-sm text-slate-400">{empty}</p>
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

function TopSection({ data }: { data: InsightsPayload }) {
  const [limit, setLimit] = useState<5 | 10>(5);
  const [sort, setSort] = useState<"revenue" | "qty">("revenue");
  const columns: { key: "food" | "store" | "space"; title: string }[] = [
    { key: "food", title: "Most Selling Food" },
    { key: "store", title: "Most Selling Store Products" },
    { key: "space", title: "Most Popular Spaces" },
  ];
  return (
    <section className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <SectionTitle title="Top Performing Items" note="Completed final bills only" />
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ChipGroup value={sort} onChange={setSort} options={[["revenue", "Revenue"], ["qty", "Quantity"]]} />
          <ChipGroup value={String(limit) as "5" | "10"} onChange={value => setLimit(value === "10" ? 10 : 5)} options={[["5", "Top 5"], ["10", "Top 10"]]} />
        </div>
      </div>
      <div className="flex overflow-x-auto gap-3 pb-3 pt-1 -mx-3 px-3 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-3 scrollbar-none snap-x snap-mandatory overscroll-x-contain">
        {columns.map(column => {
          const rows = [...data.top[column.key]].sort((a, b) => sort === "qty" ? b.qty - a.qty : b.revenue - a.revenue).slice(0, limit);
          const borderBg = column.key === "food"
            ? "border-amber-200/90 bg-gradient-to-b from-amber-50/40 via-white to-white"
            : column.key === "space"
            ? "border-indigo-200/90 bg-gradient-to-b from-indigo-50/40 via-white to-white"
            : "border-teal-200/90 bg-gradient-to-b from-teal-50/40 via-white to-white";
          const titleColor = column.key === "food"
            ? "text-amber-900"
            : column.key === "space"
            ? "text-indigo-900"
            : "text-teal-900";

          return (
            <article
              key={column.key}
              className={`w-[85vw] max-w-[340px] sm:w-[340px] lg:w-auto shrink-0 snap-start flex flex-col rounded-2xl border ${borderBg} p-3 shadow-xs`}
            >
              <h3 className={`flex items-center gap-2 px-1 text-xs sm:text-sm font-bold ${titleColor}`}>
                {column.key === "food" ? <Utensils size={14} className="text-amber-600 shrink-0" /> : column.key === "space" ? <Store size={14} className="text-indigo-600 shrink-0" /> : <ShoppingBag size={14} className="text-teal-600 shrink-0" />}
                <span>{column.title}</span>
              </h3>
              {rows.length === 0 ? <p className="px-1 py-8 text-center text-xs text-slate-400">Nothing sold in this range.</p> : (
                <ol className="mt-2 space-y-1.5 sm:space-y-2 flex-1">
                  {rows.map((row, index) => <RankRow key={row.name} index={index + 1} row={row} kind={column.key} />)}
                </ol>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RankRow({ index, row, kind }: { index: number; row: RankedItem; kind: "food" | "store" | "space" }) {
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
          ) : (
            <ShoppingBag size={13} className="text-teal-500/70" />
          )}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-slate-800">{row.name}</p>
        <p className="truncate text-[10px] text-slate-400">
          {kind === "store" && row.sku ? `${row.sku} · ` : ""}
          {kind === "space" ? `${row.bookings || row.orders} bookings · ${row.hours || 0}h` : `${row.qty} sold · ${row.orders} bills`}
        </p>
      </div>
      <span className="text-xs font-black text-slate-900 shrink-0">{inr(row.revenue)}</span>
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
      <SectionTitle title="Visitor Analytics" note="One bill is one transaction. A visit is a unique day with a bill." />
      <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-[1fr_280px]">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <article className="rounded-2xl border border-sky-200/90 bg-gradient-to-br from-sky-50/80 via-blue-50/20 to-white p-3 sm:p-4 shadow-xs">
            <div className="flex items-center gap-1.5 text-sky-800">
              <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-md bg-sky-100 text-sky-700">
                <Users size={12} strokeWidth={2.5} />
              </span>
              <p className="text-[10px] sm:text-xs font-bold truncate">First-time visitors</p>
            </div>
            <p className="mt-1 sm:mt-1.5 text-xl sm:text-3xl font-black text-sky-950">{summary.firstTime}</p>
            <p className="mt-0.5 text-[9px] sm:text-xs font-semibold text-sky-700 line-clamp-2 leading-tight">
              {summary.firstShare}% of {summary.unique} unique customers
            </p>
          </article>
          <article className="rounded-2xl border border-purple-200/90 bg-gradient-to-br from-purple-50/80 via-indigo-50/20 to-white p-3 sm:p-4 shadow-xs">
            <div className="flex items-center gap-1.5 text-purple-800">
              <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-md bg-purple-100 text-purple-700">
                <Users size={12} strokeWidth={2.5} />
              </span>
              <p className="text-[10px] sm:text-xs font-bold truncate">Repeat visitors</p>
            </div>
            <p className="mt-1 sm:mt-1.5 text-xl sm:text-3xl font-black text-purple-950">{summary.repeat}</p>
            <p className="mt-0.5 text-[9px] sm:text-xs font-semibold text-purple-700 line-clamp-2 leading-tight">
              {summary.repeatShare}% · more than one visit
            </p>
          </article>
        </div>
        <article className="rounded-2xl border border-indigo-100/90 bg-gradient-to-br from-indigo-50/25 via-white to-sky-50/20 p-3 shadow-xs">
          {donut.length === 0 ? (
            <p className="py-6 sm:py-10 text-center text-xs text-slate-400">No visitors.</p>
          ) : (
            <div className="h-28 sm:h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius={30} outerRadius={48} stroke="none">
                    {donut.map(row => <Cell key={row.name} fill={row.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </div>

      <div className="rounded-2xl border border-purple-100/90 bg-white p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <ChipGroup value={bucket} onChange={setBucket} options={[["day", "Per day"], ["week", "Per week"], ["month", "Per month"]]} />
            <ChipGroup value={visits} onChange={setVisits} options={[["all", "All"], ["1", "1 visit"], ["2", "2 visits"], ["3", "3+ visits"]]} />
          </div>
          <label className="flex items-center gap-1.5 rounded-xl border border-purple-200/80 bg-white px-2.5 py-1.5 w-full sm:w-auto shadow-2xs">
            <Search size={13} className="text-purple-500 shrink-0" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name or phone..." className="w-full sm:w-44 bg-transparent text-xs outline-none font-medium" />
          </label>
        </div>
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
        <ChipGroup value={metric} onChange={setMetric} options={[["bills", "Number of bills"], ["revenue", "Revenue"]]} />
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
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {data.peak.periods.map(row => (
          <li key={row.key} className="rounded-xl border border-purple-100/80 bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/20 p-2.5 sm:px-3 sm:py-2.5 text-xs shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-900 text-xs sm:text-sm">{row.label}</p>
              <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">{row.share}%</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">{row.hint}</p>
            <p className="mt-1 font-bold text-slate-700 text-[10px] sm:text-xs leading-tight">
              {row.bills} bills · <span className="text-emerald-700 font-black">{inr(row.revenue)}</span>
            </p>
          </li>
        ))}
      </ul>
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
    <div>
      <div className="flex items-center gap-1.5">
        <span className="h-3.5 w-1 rounded-full bg-[#673DE6]" />
        <h2 className="text-xs sm:text-sm font-bold text-slate-900">{title}</h2>
      </div>
      <p className="text-[10px] sm:text-[11px] text-slate-400 pl-2.5">{note}</p>
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
