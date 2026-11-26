import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Banknote,
  Box,
  Calendar,
  ChevronDown,
  Clock3,
  CreditCard,
  Crown,
  FileText,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  Moon,
  Search,
  ShoppingBag,
  Smartphone,
  Store,
  Sun,
  Sunrise,
  Sunset,
  TrendingUp,
  User,
  Users,
  Utensils,
  Wallet,
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
  type SegmentPayments,
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

export type SegmentSectionTab =
  | "revenue"
  | "visitors"
  | "bills"
  | "timing"
  | "top";

const SEGMENT_SECTION_TABS: {
  id: SegmentSectionTab;
  label: string;
  icon: typeof Layers;
}[] = [
  { id: "revenue", label: "Revenue", icon: Layers },
  { id: "visitors", label: "Visitors", icon: Users },
  { id: "bills", label: "Bills", icon: FileText },
  { id: "timing", label: "Timing", icon: Clock3 },
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
  const [preset, setPreset] = useState<InsightPreset>("last30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [segment, setSegment] = useState<InsightSegment>("all");
  const [membership, setMembership] = useState<InsightMembership>("all");
  const [segmentSection, setSegmentSection] = useState<SegmentSectionTab>("revenue");

  useEffect(() => {
    setSegmentSection("revenue");
  }, [segment]);
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
  }, [query, canLoad]);

  useEffect(() => {
    if (!data?.range?.from || !data.range.to) return;
    if (segment !== "space") {
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

  const membershipLabel =
    membership === "all"
      ? "All Customers"
      : membership === "member"
      ? "Membership"
      : "Non-membership";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F2EDFD] via-[#F4F3FF] to-[#E9EFFD] px-3 pt-3 pb-32 sm:px-6 sm:pt-5 sm:pb-12">
      <div className="mx-auto max-w-7xl space-y-3 sm:space-y-3.5">
        {/* ================= TOP HEADER WITH INTEGRATED PRIMARY TABS ================= */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-1">
          {/* Left on desktop / Top row on mobile: Insights title on left, Customer filter + Date filter on right (mobile) */}
          <div className="flex items-center justify-between md:justify-start gap-2.5 sm:gap-3 min-w-0">
            <h1 className="truncate text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Insights
            </h1>

            {/* Mobile Only: Customer filter icon button + Date filter */}
            <div className="flex items-center gap-2 shrink-0 md:hidden">
              {/* Customer filter icon button (placed to the left of Date filter on mobile) */}
              <div className="relative">
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
                  <Users size={17} strokeWidth={2.2} className="text-[#673DE6]" />
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

              {/* Date filter */}
              <div className="relative shrink-0">
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

          {/* Mobile Only: Primary Tabs */}
          <div className="w-full md:hidden">
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none p-1 bg-white/95 backdrop-blur-xs rounded-2xl border border-purple-100/90 shadow-[0_2px_10px_rgba(103,61,230,0.06)]">
              {PRIMARY_TABS.map(tab => {
                const active = segment === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSegment(tab.id)}
                    className={`flex-1 min-w-[64px] py-2 px-3 text-center text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
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

          {/* Desktop Only: Primary Tabs + Customer Filter + Date Filter tightly grouped at right */}
          <div className="hidden md:flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Primary Tabs */}
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none p-1 bg-white/95 backdrop-blur-xs rounded-2xl border border-purple-100/90 shadow-[0_2px_10px_rgba(103,61,230,0.06)]">
              {PRIMARY_TABS.map(tab => {
                const active = segment === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSegment(tab.id)}
                    className={`py-2 px-3 lg:px-5 text-center text-xs md:text-sm font-bold rounded-xl md:rounded-2xl transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
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

            {/* Customer filter pill (styled like Date filter) */}
            <div className="relative shrink-0">
              <div
                className={`flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 shadow-[0_2px_10px_rgba(103,61,230,0.08)] border transition pointer-events-none text-xs font-bold ${
                  membership !== "all"
                    ? "border-[#673DE6] text-[#673DE6]"
                    : "border-purple-100/90 text-slate-800"
                }`}
              >
                <Users size={15} className="text-[#673DE6]" strokeWidth={2.2} />
                <span>{membershipLabel}</span>
                <ChevronDown size={14} className="text-slate-500" strokeWidth={2.5} />
              </div>
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

            {/* Date filter */}
            <div className="relative shrink-0">
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

        {/* ================= CARDS SECTION (MATCH DESIGN) ================= */}
        {data && (
          segment === "all" ? (
            /* OVERALL: As it was before (Period KPIs 4-col row on desktop, then all Segment Cards below) */
            <div className="space-y-3">
              <PeriodKpis periods={data.peak?.periods || []} layout="full" />
              <SegmentCards segments={data.segments} />
            </div>
          ) : (
            /* SPECIFIC SEGMENTS (Food, Store, Space, Membership): Side-by-side matching reference */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
              <div className="w-full h-full flex flex-col">
                <SegmentCards
                  segments={
                    data.segments.filter((s) => s.key === segment).length > 0
                      ? data.segments.filter((s) => s.key === segment)
                      : data.segments.slice(0, 1)
                  }
                />
              </div>
              <div className="w-full h-full flex flex-col">
                <PeriodKpis periods={data.peak?.periods || []} layout="grid2x2" />
              </div>
            </div>
          )
        )}

        {/* ================= SECONDARY SECTION TOGGLES (Revenue | Visitors | Bills | Timing | More) ================= */}
        {data && (
          <SegmentSectionToggleBar
            value={segmentSection}
            onChange={setSegmentSection}
            className="my-1"
          />
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

        {/* ================= ACTIVE SECTION (POPS UP DOWN THE CARDS) ================= */}
        {data ? (
          <div className="space-y-4 pb-6 sm:pb-2">
            {segment === "space" && segmentSection === "revenue" && (
              <SpaceUtilizationPanel data={spaceUse} />
            )}
            {segmentSection === "revenue" && (
              <>
                {segment === "all" && <OverallCard data={data} />}
                <RevenueSection data={data} loading={loading} segment={segment} />
              </>
            )}
            {segmentSection === "bills" && (
              <PaymentsSection data={data} segment={segment} />
            )}
            {segmentSection === "top" && (
              <TopSection data={data} segment={segment} />
            )}
            {segmentSection === "visitors" && (
              <VisitorSection query={query} summary={data.visitors} />
            )}
            {segmentSection === "timing" && (
              <PeakSection data={data} segment={segment} className="pb-6" />
            )}
          </div>
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

const SECONDARY_SEGMENT_OPTIONS: { id: InsightSegment; label: string }[] = [
  { id: "all", label: "Overall" },
  { id: "food", label: "Food" },
  { id: "space", label: "Space" },
  { id: "store", label: "Store" },
  { id: "membership", label: "Membership" },
];

function SecondarySegmentTabs({
  value,
  onChange,
  className = "",
}: {
  value: InsightSegment;
  onChange: (val: InsightSegment) => void;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1 overflow-x-auto scrollbar-none rounded-xl bg-purple-50/80 p-1 border border-purple-100/90 ${className}`}
    >
      {SECONDARY_SEGMENT_OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`flex-1 min-w-[58px] rounded-lg px-2 py-1.5 text-center text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
              active
                ? "bg-[#673DE6] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-purple-100/60"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SegmentSectionToggleBar({
  value,
  onChange,
  className = "",
}: {
  value: SegmentSectionTab;
  onChange: (val: SegmentSectionTab) => void;
  className?: string;
}) {
  const items: { id: SegmentSectionTab; label: string; icon: typeof Layers }[] = [
    { id: "revenue", label: "Revenue", icon: Layers },
    { id: "visitors", label: "Visitors", icon: Users },
    { id: "bills", label: "Bills", icon: FileText },
    { id: "timing", label: "Timing", icon: Clock3 },
  ];

  return (
    <div
      className={`flex items-center justify-between gap-1 p-1 bg-white/95 backdrop-blur-xs rounded-2xl border border-purple-100/90 shadow-[0_2px_10px_rgba(103,61,230,0.06)] ${className}`}
    >
      {items.map((tab) => {
        const active = value === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 sm:px-3 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
              active
                ? "bg-[#673DE6] text-white shadow-[0_2px_8px_rgba(103,61,230,0.28)]"
                : "text-slate-600 hover:text-slate-900 hover:bg-purple-50/70"
            }`}
          >
            <Icon size={14} className={active ? "text-white" : "text-[#673DE6]"} strokeWidth={2.2} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function PeriodKpis({
  periods,
  layout = "full",
}: {
  periods: InsightsPayload["peak"]["periods"];
  layout?: "full" | "grid2x2";
}) {
  if (!periods || periods.length === 0) return null;

  const getPeriodIcon = (key: string) => {
    switch (key.toLowerCase()) {
      case "morning":
        return <Sunrise size={18} className="text-[#673DE6]" strokeWidth={2.2} />;
      case "afternoon":
        return <Sun size={18} className="text-[#673DE6]" strokeWidth={2.2} />;
      case "evening":
        return <Sunset size={18} className="text-[#673DE6]" strokeWidth={2.2} />;
      case "night":
        return <Moon size={18} className="text-[#673DE6]" strokeWidth={2.2} />;
      default:
        return <Clock3 size={18} className="text-[#673DE6]" strokeWidth={2.2} />;
    }
  };

  const gridClass =
    layout === "grid2x2"
      ? "grid grid-cols-2 auto-rows-fr gap-2.5 sm:gap-3 h-full"
      : "grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3";

  return (
    <div className={gridClass}>
      {periods.map((row) => (
        <div
          key={row.key}
          className="rounded-2xl border border-purple-100/90 bg-white p-3 sm:p-3.5 text-xs shadow-[0_2px_8px_rgba(103,61,230,0.04)] hover:border-purple-200 transition flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {getPeriodIcon(row.key)}
                <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                  {row.label}
                </p>
              </div>
              <span className="rounded-md bg-purple-100/80 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-[#673DE6]">
                {row.share}%
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-medium">
              {row.hint}
            </p>
          </div>
          <p className="mt-1.5 text-[11px] sm:text-xs font-bold text-slate-800 leading-tight">
            {row.bills} bills <span className="text-slate-400 font-normal">·</span>{" "}
            <span className="text-emerald-600 font-bold">{inr(row.revenue)}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

function OverallCard({ data }: { data: InsightsPayload }) {
  const totals = data.totals;
  const overallAvg =
    totals.bills > 0 ? Math.round(totals.revenue / totals.bills) : 0;

  const segmentAverages = [
    {
      key: "food",
      label: "Food",
      cardStyle: "border-amber-200/90 bg-[#FFFBEB]",
      textStyle: "text-amber-950",
      seg: data.segments.find((s) => s.key === "food"),
    },
    {
      key: "space",
      label: "Space",
      cardStyle: "border-blue-200/90 bg-[#EFF6FF]",
      textStyle: "text-blue-950",
      seg: data.segments.find((s) => s.key === "space"),
    },
    {
      key: "store",
      label: "Store",
      cardStyle: "border-emerald-200/90 bg-[#ECFDF5]",
      textStyle: "text-emerald-950",
      seg: data.segments.find((s) => s.key === "store"),
    },
    {
      key: "membership",
      label: "Membership",
      cardStyle: "border-purple-200/90 bg-[#FAF5FF]",
      textStyle: "text-purple-950",
      seg: data.segments.find((s) => s.key === "membership"),
    },
  ];

  const webSegments = [
    {
      key: "food",
      label: "Food",
      icon: Utensils,
      cardStyle: "border-amber-200/80 bg-[#FFFDF5]",
      iconBoxStyle: "bg-amber-100/80 text-amber-700",
      badgeStyle: "bg-amber-100/70 text-amber-800",
      seg: data.segments.find((s) => s.key === "food"),
    },
    {
      key: "store",
      label: "Store",
      icon: Store,
      cardStyle: "border-blue-200/80 bg-[#F0F7FF]",
      iconBoxStyle: "bg-blue-100/80 text-blue-700",
      badgeStyle: "bg-blue-100/70 text-blue-800",
      seg: data.segments.find((s) => s.key === "store"),
    },
    {
      key: "space",
      label: "Space",
      icon: Box,
      cardStyle: "border-emerald-200/80 bg-[#F0FDF4]",
      iconBoxStyle: "bg-emerald-100/80 text-emerald-700",
      badgeStyle: "bg-emerald-100/70 text-emerald-800",
      seg: data.segments.find((s) => s.key === "space"),
    },
    {
      key: "membership",
      label: "Membership",
      icon: Crown,
      cardStyle: "border-purple-200/80 bg-[#FAF5FF]",
      iconBoxStyle: "bg-purple-100/80 text-purple-700",
      badgeStyle: "bg-purple-100/70 text-purple-800",
      seg: data.segments.find((s) => s.key === "membership"),
    },
  ];

  return (
    <article className="rounded-3xl border border-purple-100/90 bg-white p-4 sm:p-5 shadow-xs">
      {/* ================= DESKTOP / WEB VIEW (MATCHING DESIGN) ================= */}
      <div className="hidden md:flex items-stretch gap-6">
        {/* Left Column: Overall Revenue */}
        <div className="w-[280px] shrink-0 flex flex-col justify-between pr-6 border-r border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#673DE6] text-white shadow-xs">
                <Layers size={19} strokeWidth={2.3} />
              </span>
              <div>
                <p className="text-sm font-black text-slate-900 leading-tight">
                  Overall Revenue
                </p>
                <p className="text-[11px] font-medium text-slate-500 leading-tight mt-0.5">
                  All segments (Food · Store · Space)
                </p>
              </div>
            </div>

            <div className="mt-3.5">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                  {inr(totals.revenue)}
                </span>
                <Trend value={totals.changePct} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                vs previous period (Prev: {inr(totals.previousRevenue)})
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Average Bill by Segment */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-black text-slate-900">
              Average Bill by Segment
            </span>
            <div className="flex items-center gap-2 rounded-full border border-purple-200/90 bg-white px-3.5 py-1 shadow-2xs text-xs">
              <span className="text-slate-700 font-bold">
                All Bills <span className="font-medium text-slate-500">(Avg. Bill)</span>
              </span>
              <span className="font-black text-slate-900">{inr(overallAvg)}</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2.5 lg:gap-3">
            {webSegments.map((item) => {
              const seg = item.seg;
              const avg = seg
                ? seg.average ||
                  (seg.bills > 0 ? Math.round(seg.revenue / seg.bills) : 0)
                : 0;
              const Icon = item.icon;

              return (
                <div
                  key={item.key}
                  className={`rounded-2xl border p-2.5 lg:p-3 flex flex-col justify-between transition ${item.cardStyle}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${item.iconBoxStyle}`}
                      >
                        <Icon size={13} strokeWidth={2.2} />
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {item.label}
                      </span>
                    </div>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${item.badgeStyle}`}
                    >
                      {seg?.share ?? 0}%
                    </span>
                  </div>
                  <p className="mt-2 text-base lg:text-lg font-black text-slate-900 tracking-tight">
                    {inr(avg)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= MOBILE VIEW (UNTOUCHED) ================= */}
      <div className="block md:hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#673DE6] text-white shadow-xs">
              <Layers size={18} strokeWidth={2.3} />
            </span>
            <div>
              <p className="text-sm font-black text-slate-900 leading-tight">
                Overall Revenue
              </p>
              <p className="text-[11px] font-semibold text-purple-700 leading-tight mt-0.5">
                All Segments Combined · {totals.bills} bills
              </p>
            </div>
          </div>
          <Trend value={totals.changePct} />
        </div>

        {/* Big Revenue Number + Overall Avg Bill */}
        <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {inr(totals.revenue)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              {totals.changePct != null
                ? `${totals.changePct >= 0 ? "+" : ""}${totals.changePct}% vs previous period`
                : "Total billed revenue across all segments"}
              {totals.previousRevenue > 0
                ? ` (Prev: ${inr(totals.previousRevenue)})`
                : ""}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] px-3.5 py-1.5 shadow-2xs">
            <span className="text-[10px] font-extrabold text-[#7C3AED] uppercase tracking-wider">
              OVERALL AVG BILL
            </span>
            <span className="text-sm font-black text-[#4C1D95]">
              {inr(overallAvg)}
            </span>
          </div>
        </div>

        {/* Average Bills by Segment */}
        <div className="mt-3.5 pt-3.5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900">
              Average Bill by Segment
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              Avg per customer transaction
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {segmentAverages.map((item) => {
              const seg = item.seg;
              const avg = seg
                ? seg.average ||
                  (seg.bills > 0 ? Math.round(seg.revenue / seg.bills) : 0)
                : 0;
              const bills = seg?.bills ?? 0;

              return (
                <div
                  key={item.key}
                  className={`rounded-2xl border p-2.5 sm:p-3 text-left transition ${item.cardStyle}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {item.label}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {bills} {bills === 1 ? "bill" : "bills"}
                    </span>
                  </div>
                  <p className={`mt-1 text-sm sm:text-base font-black tracking-tight ${item.textStyle}`}>
                    {inr(avg)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
}

function SegmentCards({ segments }: { segments: InsightsPayload["segments"] }) {
  const isSingle = segments.length === 1;

  return (
    <div
      className={
        isSingle
          ? "w-full h-full"
          : "flex overflow-x-auto gap-3 pb-2 pt-1 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none snap-x snap-mandatory overscroll-x-contain"
      }
    >
      {segments.map((row) => {
        const isOverall = row.key === ("all" as any);
        const isFood = row.key === "food";
        const isSpace = row.key === "space";
        const isStore = row.key === "store";
        const isMembership = row.key === "membership";

        const cardTheme = isOverall
          ? "border-purple-200/90 bg-gradient-to-br from-purple-50/80 via-indigo-50/30 to-white shadow-xs"
          : isFood
          ? "border-amber-200/90 bg-gradient-to-br from-amber-50/80 via-orange-50/30 to-white shadow-xs"
          : isSpace
          ? "border-indigo-200/90 bg-gradient-to-br from-indigo-50/80 via-purple-50/30 to-white shadow-xs"
          : isStore
          ? "border-teal-200/90 bg-gradient-to-br from-teal-50/80 via-emerald-50/30 to-white shadow-xs"
          : "border-purple-200/90 bg-gradient-to-br from-purple-50/80 via-fuchsia-50/30 to-white shadow-xs";

        const iconTheme = isOverall
          ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-500/25"
          : isFood
          ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/25"
          : isSpace
          ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-500/25"
          : isStore
          ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm shadow-teal-500/25"
          : "bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-500/25";

        const textTheme = isOverall
          ? "text-purple-950"
          : isFood
          ? "text-amber-950"
          : isSpace
          ? "text-indigo-950"
          : isStore
          ? "text-teal-950"
          : "text-purple-950";

        return (
          <article
            key={row.key}
            className={`${
              isSingle
                ? "w-full h-full"
                : "w-[85vw] max-w-[340px] sm:w-[320px] shrink-0 snap-start"
            } flex flex-col justify-between rounded-2xl border ${cardTheme} p-3.5 sm:p-4`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconTheme}`}>
                    {isOverall ? (
                      <Layers size={15} />
                    ) : isFood ? (
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
                        : `${row.share || 100}% of net sales`}
                    </p>
                  </div>
                </div>
                <Trend value={row.changePct} />
              </div>
              <p className={`mt-2.5 sm:mt-3 text-xl sm:text-2xl font-black ${textTheme}`}>{inr(row.revenue)}</p>

              {isMembership ? (
                <div className="mt-3 pt-2.5 border-t border-slate-100/90 grid grid-cols-4 gap-1.5 text-left">
                  <div>
                    <dt className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">Bills</dt>
                    <dd className="mt-0.5 text-xs sm:text-sm font-black text-slate-900">{row.bills}</dd>
                  </div>
                  <div className="border-l border-slate-200/70 pl-2">
                    <dt className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">Avg. Bill</dt>
                    <dd className="mt-0.5 text-xs sm:text-sm font-black text-slate-900">{inr(row.average)}</dd>
                  </div>
                  <div className="border-l border-slate-200/70 pl-2">
                    <dt className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">Active</dt>
                    <dd className="mt-0.5 text-xs sm:text-sm font-black text-slate-900">{row.activeMembers ?? 0}</dd>
                  </div>
                  <div className="border-l border-slate-200/70 pl-2">
                    <dt className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">Previous</dt>
                    <dd className="mt-0.5 text-xs sm:text-sm font-black text-slate-900">{inr(row.previousRevenue)}</dd>
                  </div>
                </div>
              ) : (
                <div className="mt-3 pt-2.5 border-t border-slate-100/90 grid grid-cols-4 gap-1.5 text-left">
                  <div>
                    <dt className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">Bills</dt>
                    <dd className="mt-0.5 text-xs sm:text-sm font-black text-slate-900">{row.bills}</dd>
                  </div>
                  <div className="border-l border-slate-200/70 pl-2">
                    <dt className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">Avg. Bill</dt>
                    <dd className="mt-0.5 text-xs sm:text-sm font-black text-slate-900">{inr(row.average)}</dd>
                  </div>
                  <div className="border-l border-slate-200/70 pl-2">
                    <dt className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">{isSpace ? "Hours" : "Qty. Sold"}</dt>
                    <dd className="mt-0.5 text-xs sm:text-sm font-black text-slate-900">{isSpace ? row.hours : row.qty}</dd>
                  </div>
                  <div className="border-l border-slate-200/70 pl-2">
                    <dt className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">Previous</dt>
                    <dd className="mt-0.5 text-xs sm:text-sm font-black text-slate-900">{inr(row.previousRevenue)}</dd>
                  </div>
                </div>
              )}
            </div>

            {isMembership ? (
              <p className="mt-2.5 truncate text-[10px] sm:text-[11px] text-slate-500">
                Top: <span className="font-bold text-slate-800">{row.topSellingMembership || row.top[0]?.name || "—"}</span>
              </p>
            ) : row.top && row.top[0] ? (
              <p className="mt-2.5 truncate text-[10px] sm:text-[11px] text-slate-500">
                Top: <span className="font-bold text-slate-800">{row.top[0].name}</span>
              </p>
            ) : (
              <p className="mt-2.5 truncate text-[10px] sm:text-[11px] text-slate-500">
                Top: <span className="font-bold text-slate-800">—</span>
              </p>
            )}
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
  const [activeSeg, setActiveSeg] = useState<InsightSegment>(segment);
  useEffect(() => {
    setActiveSeg(segment);
  }, [segment]);

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

  const effectiveSeg = segment === "all" ? activeSeg : segment;
  const currentSegment = effectiveSeg === "all" ? null : data.segments.find(s => s.key === effectiveSeg);

  const totalRevenue = currentSegment ? currentSegment.revenue : data.totals.revenue;
  const growth = currentSegment ? currentSegment.changePct : data.totals.changePct;
  const previousRevenue = currentSegment ? currentSegment.previousRevenue : data.totals.previousRevenue;
  const share = currentSegment ? currentSegment.share : 100;

  const totalBills = currentSegment ? currentSegment.bills : data.totals.bills;
  const avgBill = currentSegment
    ? currentSegment.average || (currentSegment.bills > 0 ? Math.round(currentSegment.revenue / currentSegment.bills) : 0)
    : (data.totals.bills > 0 ? Math.round(data.totals.revenue / data.totals.bills) : 0);

  const itemsSold = currentSegment
    ? (effectiveSeg === "space"
        ? (currentSegment.hours ? `${currentSegment.hours} hrs` : `${currentSegment.bookings} bookings`)
        : effectiveSeg === "membership"
        ? `${currentSegment.activeMembers ?? currentSegment.qty} members`
        : `${currentSegment.qty} sold`)
    : `${data.segments.reduce((sum, s) => sum + (s.qty || 0), 0)} sold`;

  const isAll = effectiveSeg === "all";
  const showMemberDonut = isAll || effectiveSeg === "membership";

  // If "all", show all segments. If food/store/space/membership, show only that particular segment!
  const targetSegments = isAll
    ? data.segments
    : data.segments.filter(s => s.key === effectiveSeg);

  const segmentDonut: DonutRow[] = targetSegments.map(row => ({
    key: row.key,
    name: row.label,
    value: row.revenue,
    share: row.share,
    growth: row.changePct,
    previousRevenue: row.previousRevenue,
    color: SEGMENT_COLOR[row.key] || "#6366f1",
  }));

  const memberDonut: DonutRow[] = [
    {
      key: "member",
      name: "Membership",
      value: data.membership.memberRevenue,
      share: data.membership.memberShare,
      color: "#7c3aed",
    },
    {
      key: "nonmember",
      name: "Non-membership",
      value: data.membership.otherRevenue,
      share: data.membership.otherShare,
      color: "#94a3b8",
    },
  ];

  return (
    <section className="space-y-3">
      {segment !== "all" && (
        <SectionTitle title="Revenue Overview" note={loading ? "Updating…" : "Compared with previous period"} />
      )}

      {/* ================= WHEN SPECIFIC SEGMENT SELECTED: ALL THREE IN ONE ROW (WEB VIEW) ================= */}
      {segment !== "all" ? (
        <>
          {/* WEB VIEW: ALL THREE IN ONE ROW */}
          <div className="hidden sm:grid sm:grid-cols-3 gap-2.5 sm:gap-3 items-stretch min-w-0">
            {/* Card 1: Revenue Overview Card */}
            <article className="flex flex-col justify-between rounded-2xl border border-purple-200/90 bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/30 p-3.5 sm:p-4 shadow-xs min-w-0">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#673DE6] text-white shadow-sm shadow-purple-500/25">
                      <TrendingUp size={16} strokeWidth={2.3} />
                    </span>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                        {`${currentSegment?.label || "Segment"} Revenue`}
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
            <article className="flex flex-col justify-between rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/30 p-3.5 sm:p-4 shadow-xs min-w-0">
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

            {/* Card 3: Segment Breakdown Card */}
            <DonutCard
              title={`${currentSegment?.label || "Segment"} Breakdown`}
              center={inr(currentSegment?.revenue || 0)}
              centerGrowth={currentSegment?.changePct ?? null}
              centerLabel={`${currentSegment?.label || "Segment"}`}
              rows={segmentDonut}
              empty="No billed sales in this range."
              theme={effectiveSeg === "food" ? "amber" : effectiveSeg === "space" ? "purple" : "amber"}
              compact={true}
            />
          </div>

          {/* MOBILE VIEW (STACKED) */}
          <div className="block sm:hidden space-y-2.5">
            <div className="grid grid-cols-1 gap-2.5">
              {/* Card 1 */}
              <article className="flex flex-col justify-between rounded-2xl border border-purple-200/90 bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/30 p-3.5 shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#673DE6] text-white shadow-sm shadow-purple-500/25">
                        <TrendingUp size={16} strokeWidth={2.3} />
                      </span>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">
                          {`${currentSegment?.label || "Segment"} Revenue`}
                        </h3>
                        <p className="text-[10px] font-semibold text-purple-700">
                          {share}% of sales
                        </p>
                      </div>
                    </div>
                    <Trend value={growth} />
                  </div>
                  <p className="mt-2.5 text-2xl font-black text-slate-900 tracking-tight">
                    {inr(totalRevenue)}
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-purple-100/80 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Growth vs previous</span>
                  <span className="font-bold text-slate-800">
                    {growth != null ? `${growth >= 0 ? "+" : ""}${growth}%` : "New"}
                    {previousRevenue > 0 ? ` (Prev: ${inr(previousRevenue)})` : ""}
                  </span>
                </div>
              </article>

              {/* Card 2 */}
              <article className="flex flex-col justify-between rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/30 p-3.5 shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-500/25">
                        <FileText size={16} strokeWidth={2.3} />
                      </span>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">Bills & Items</h3>
                        <p className="text-[10px] font-semibold text-indigo-700">
                          Average: {inr(avgBill)}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 border border-indigo-200/80">
                      {totalBills} {totalBills === 1 ? "bill" : "bills"}
                    </span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-3 gap-1.5 rounded-xl bg-indigo-50/60 border border-indigo-100/80 p-2 text-center">
                    <div>
                      <dt className="text-[9px] font-medium text-slate-500 truncate">Avg. Bill</dt>
                      <dd className="mt-0.5 text-xs font-black text-slate-900 truncate">{inr(avgBill)}</dd>
                    </div>
                    <div className="border-x border-indigo-100/90 px-1">
                      <dt className="text-[9px] font-medium text-slate-500 truncate">Total Bills</dt>
                      <dd className="mt-0.5 text-xs font-black text-indigo-700 truncate">{totalBills}</dd>
                    </div>
                    <div>
                      <dt className="text-[9px] font-medium text-slate-500 truncate">Items Sold</dt>
                      <dd className="mt-0.5 text-xs font-black text-emerald-700 truncate">{itemsSold}</dd>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-indigo-100/80 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Volume summary</span>
                  <span className="font-bold text-slate-800">{totalBills} bills · {itemsSold}</span>
                </div>
              </article>
            </div>

            {/* Mobile Card 3 (Donut) */}
            <article className="rounded-2xl border border-purple-100/90 bg-white p-3.5 shadow-xs">
              <DonutBlock
                title={`${currentSegment?.label || "Segment"} Breakdown`}
                center={inr(currentSegment?.revenue || 0)}
                centerGrowth={currentSegment?.changePct ?? null}
                centerLabel={`${currentSegment?.label || "Segment"}`}
                rows={segmentDonut}
                empty="No billed sales in this range."
              />
            </article>
          </div>
        </>
      ) : (
        /* ================= OVERALL SEGMENT ================= */
        <>
          {/* MOBILE VIEW */}
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
                    centerGrowth={data.totals.changePct}
                    centerLabel="Total Sales"
                    rows={segmentDonut}
                    empty="No billed sales in this range."
                    onSelectKey={(k => setActiveSeg(k as InsightSegment))}
                  />
                </div>
                <div className="w-full shrink-0 snap-start">
                  <DonutBlock
                    title="Membership vs Non-membership"
                    center={inr(data.totals.revenue)}
                    centerGrowth={data.totals.changePct}
                    centerLabel="Total Sales"
                    rows={memberDonut}
                    empty="No billed sales in this range."
                  />
                </div>
              </div>
            </article>
          </div>

          {/* WEB VIEW */}
          <div className="hidden sm:grid sm:grid-cols-2 gap-2.5 sm:gap-3">
            <DonutCard
              title="By Business Segment"
              center={inr(data.totals.revenue)}
              centerGrowth={data.totals.changePct}
              centerLabel="Total Sales"
              rows={segmentDonut}
              empty="No billed sales in this range."
              theme="purple"
              onSelectKey={(k => setActiveSeg(k as InsightSegment))}
            />
            <DonutCard
              title="Membership vs Non-membership"
              center={inr(data.totals.revenue)}
              centerGrowth={data.totals.changePct}
              centerLabel="Total Sales"
              rows={memberDonut}
              empty="No billed sales in this range."
              theme="purple"
            />
          </div>
        </>
      )}
    </section>
  );
}

type DonutRow = {
  key?: string;
  name: string;
  value: number;
  share: number;
  growth?: number | null;
  previousRevenue?: number;
  color: string;
};

function DonutBlock({
  title,
  center,
  centerGrowth,
  centerLabel = "Total Sales",
  rows,
  empty,
  activeKey,
  onSelectKey,
  compact = false,
}: {
  title: string;
  center: string;
  centerGrowth?: number | null;
  centerLabel?: string;
  rows: DonutRow[];
  empty: string;
  activeKey?: string;
  onSelectKey?: (key: string) => void;
  compact?: boolean;
}) {
  const pieData = rows.filter(row => row.value > 0);
  const totalValue = rows.reduce((sum, r) => sum + (r.value || 0), 0);

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-1 gap-1">
        <h3 className={`font-bold text-slate-900 truncate ${compact ? "text-xs" : "text-xs sm:text-sm"}`}>{title}</h3>
        {centerGrowth !== undefined && (
          <span
            className={`hidden sm:inline-flex items-center gap-1 rounded-full font-bold border shrink-0 ${
              compact ? "px-1.5 py-0.2 text-[9px]" : "px-2 py-0.5 text-[10px]"
            } ${
              centerGrowth == null
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : centerGrowth >= 0
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
          >
            Growth: {centerGrowth != null ? `${centerGrowth >= 0 ? "+" : ""}${centerGrowth}%` : "New"}
          </span>
        )}
      </div>

      {rows.length === 0 || totalValue === 0 ? (
        <p className="py-8 sm:py-16 text-center text-xs sm:text-sm text-slate-400">{empty}</p>
      ) : (
        <div className={`mt-2 grid items-center min-w-0 ${
          compact
            ? "gap-2 grid-cols-[100px_minmax(0,1fr)] sm:grid-cols-[110px_minmax(0,1fr)]"
            : "gap-3 sm:grid-cols-[180px_1fr] md:grid-cols-[190px_1fr]"
        }`}>
          <div className={`relative mx-auto shrink-0 flex items-center justify-center ${
            compact ? "h-26 w-26 sm:h-28 sm:w-28" : "h-44 sm:h-48 w-44 sm:w-48"
          }`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={compact ? 26 : 48}
                  outerRadius={compact ? 40 : 68}
                  paddingAngle={pieData.length > 1 ? (compact ? 2 : 3) : 0}
                  stroke="none"
                >
                  {pieData.map(row => (
                    <Cell key={row.name} fill={row.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, item) => {
                    const p = item?.payload as DonutRow;
                    const g =
                      p?.growth !== undefined
                        ? p.growth != null
                          ? ` · ${p.growth >= 0 ? "+" : ""}${p.growth}% growth`
                          : " · New"
                        : "";
                    return [
                      `${inr(Number(value) || 0)} (${p?.share ?? 0}% of sale)${g}`,
                      name,
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-0.5">
              <span className={`font-bold uppercase tracking-wider text-slate-400 leading-none ${
                compact ? "text-[6.5px] sm:text-[7px]" : "text-[8.5px] sm:text-[9.5px]"
              }`}>
                {centerLabel}
              </span>
              <span className={`font-black text-slate-900 leading-tight ${
                compact ? "text-[10px] sm:text-[11px] my-0.5" : "text-xs sm:text-sm my-0.5"
              }`}>
                {center}
              </span>
              {centerGrowth !== undefined && (
                <span
                  className={`inline-flex items-center rounded-full font-extrabold ${
                    compact ? "px-1 py-0 text-[7px]" : "px-1.5 py-0.2 text-[9px] sm:text-[10px]"
                  } ${
                    centerGrowth == null
                      ? "text-purple-700 bg-purple-50"
                      : centerGrowth >= 0
                      ? "text-emerald-700 bg-emerald-50"
                      : "text-rose-700 bg-rose-50"
                  }`}
                >
                  {centerGrowth != null ? `${centerGrowth >= 0 ? "+" : ""}${centerGrowth}%` : "New"}
                </span>
              )}
            </div>
          </div>

          <div className="min-w-0 overflow-hidden">
            {/* Header: Segment | Total | Growth | % of Sale */}
            <div className={`flex items-center justify-between font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100/90 mb-1 ${
              compact ? "text-[8px] sm:text-[8.5px] px-1 pb-1" : "text-[10px] px-2 pb-1.5"
            }`}>
              <span className="truncate">Segment</span>
              <div className={`flex items-center text-right shrink-0 ${compact ? "gap-1 sm:gap-1.5" : "gap-2 sm:gap-3"}`}>
                <span className={compact ? "w-11 sm:w-13 text-right" : "w-16 sm:w-20 text-right"}>Total</span>
                <span className={compact ? "w-8 sm:w-10 text-center" : "w-12 sm:w-14 text-center"}>Growth</span>
                <span className={compact ? "w-7 sm:w-9 text-right" : "w-14 sm:w-16 text-right"}>% Sale</span>
              </div>
            </div>

            {/* Rows list */}
            <ul className="space-y-1">
              {rows.map(row => {
                const isSelected = Boolean(activeKey && row.key && activeKey === row.key);
                return (
                  <li
                    key={row.name}
                    onClick={() => row.key && onSelectKey?.(row.key)}
                    className={`flex items-center justify-between gap-1 rounded-xl transition ${
                      compact ? "px-1 py-1 text-[11px]" : "px-2 py-1.5 text-xs"
                    } ${
                      isSelected
                        ? "bg-purple-100/70 border border-purple-200 ring-1 ring-purple-300"
                        : onSelectKey && row.key
                        ? "hover:bg-slate-50 cursor-pointer"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-1 min-w-0 pr-1">
                      <span
                        className={`rounded-full shrink-0 ${compact ? "h-2 w-2" : "h-2.5 w-2.5"}`}
                        style={{ background: row.color }}
                      />
                      <span className={`truncate font-bold text-slate-800 ${compact ? "text-[10px] sm:text-[10.5px]" : "text-[11px] sm:text-xs"}`}>
                        {row.name}
                      </span>
                    </div>

                    <div className={`flex items-center shrink-0 ${compact ? "gap-1 sm:gap-1.5" : "gap-2 sm:gap-3"}`}>
                      {/* Total */}
                      <span className={`text-right font-black text-slate-900 ${
                        compact ? "w-11 sm:w-13 text-[10px] sm:text-[10.5px]" : "w-16 sm:w-20 text-[11px] sm:text-xs"
                      }`}>
                        {inr(row.value)}
                      </span>

                      {/* Growth */}
                      <div className={`flex justify-center ${compact ? "w-8 sm:w-10" : "w-12 sm:w-14"}`}>
                        {row.growth !== undefined ? (
                          <span
                            className={`inline-flex items-center justify-center rounded-full font-extrabold border ${
                              compact ? "px-1 py-0.2 text-[7px] sm:text-[7.5px]" : "px-1.5 py-0.5 text-[9.5px] sm:text-[10px]"
                            } ${
                              row.growth == null
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : row.growth >= 0
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                            title={row.previousRevenue ? `Previous: ${inr(row.previousRevenue)}` : undefined}
                          >
                            {row.growth != null ? `${row.growth >= 0 ? "+" : ""}${row.growth}%` : "New"}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[10px]">—</span>
                        )}
                      </div>

                      {/* % of Sale */}
                      <span className={`text-right font-bold text-slate-700 ${
                        compact ? "w-7 sm:w-9 text-[9px] sm:text-[9.5px]" : "w-14 sm:w-16 text-[11px] sm:text-xs"
                      }`}>
                        {row.share}%
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function DonutCard({
  title,
  center,
  centerGrowth,
  centerLabel,
  rows,
  empty,
  theme = "purple",
  activeKey,
  onSelectKey,
  compact = false,
}: {
  title: string;
  center: string;
  centerGrowth?: number | null;
  centerLabel?: string;
  rows: DonutRow[];
  empty: string;
  theme?: "amber" | "purple";
  activeKey?: string;
  onSelectKey?: (key: string) => void;
  compact?: boolean;
}) {
  const cardBorder = theme === "amber"
    ? "border-amber-100/90 bg-gradient-to-br from-amber-50/20 via-white to-purple-50/20"
    : "border-purple-100/90 bg-gradient-to-br from-purple-50/25 via-white to-indigo-50/20";

  return (
    <article className={`rounded-2xl border ${cardBorder} ${compact ? "p-3 sm:p-3.5" : "p-3.5 sm:p-4"} shadow-xs min-w-0 overflow-hidden flex flex-col justify-between`}>
      <DonutBlock
        title={title}
        center={center}
        centerGrowth={centerGrowth}
        centerLabel={centerLabel}
        rows={rows}
        empty={empty}
        activeKey={activeKey}
        onSelectKey={onSelectKey}
        compact={compact}
      />
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

const PAYMENT_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    badgeBg: string;
    border: string;
    icon: typeof Banknote;
  }
> = {
  cash: {
    label: "Cash",
    color: "#10B981",
    badgeBg: "bg-emerald-50 border-emerald-200 text-emerald-700",
    border: "border-emerald-100/90 hover:border-emerald-300",
    icon: Banknote,
  },
  upi: {
    label: "UPI",
    color: "#8B5CF6",
    badgeBg: "bg-purple-50 border-purple-200 text-[#673DE6]",
    border: "border-purple-100/90 hover:border-purple-300",
    icon: Smartphone,
  },
  wallet: {
    label: "Wallet",
    color: "#0284C7",
    badgeBg: "bg-sky-50 border-sky-200 text-sky-700",
    border: "border-sky-100/90 hover:border-sky-300",
    icon: Wallet,
  },
  card: {
    label: "Card / Other",
    color: "#F59E0B",
    badgeBg: "bg-amber-50 border-amber-200 text-amber-700",
    border: "border-amber-100/90 hover:border-amber-300",
    icon: CreditCard,
  },
};

function PaymentsSection({
  data,
  segment = "all",
}: {
  data: InsightsPayload;
  segment?: InsightSegment;
}) {
  const [activeSeg, setActiveSeg] = useState<InsightSegment>(segment);
  useEffect(() => {
    setActiveSeg(segment);
  }, [segment]);

  const effectiveSeg = segment === "all" ? activeSeg : segment;

  const segmentPayments = useMemo<SegmentPayments>(() => {
    if (data.payments && data.payments[effectiveSeg]) {
      return data.payments[effectiveSeg];
    }
    const fromSeg = data.segments?.find((s) => s.key === effectiveSeg)?.payments;
    if (fromSeg) return fromSeg;
    return data.payments?.all || { total: 0, bills: 0, methods: [] };
  }, [data, effectiveSeg]);

  const segmentLabels: Record<string, string> = {
    all: "Overall",
    food: "Food & Beverages",
    space: "Coworking & Event Space",
    store: "Store & Retail",
    membership: "Membership",
  };
  const currentSegLabel = segmentLabels[effectiveSeg] || "Overall";

  const pieData = useMemo(() => {
    return (segmentPayments.methods || [])
      .filter((m) => m.amount > 0)
      .map((m) => {
        const cfg = PAYMENT_CONFIG[m.method] || {
          label: m.label || m.method,
          color: "#64748B",
        };
        return {
          name: cfg.label,
          method: m.method,
          value: m.amount,
          share: m.percentage,
          bills: m.bills,
          color: cfg.color,
        };
      });
  }, [segmentPayments]);

  const hasData = segmentPayments.total > 0 || pieData.length > 0;
  const methods = segmentPayments.methods || [];

  return (
    <section className="space-y-3">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-[#673DE6]">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                Payment Modes Breakdown
              </h2>
              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-[#673DE6] border border-purple-200">
                {currentSegLabel}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium">
              Revenue distribution across Cash, UPI &amp; Wallet for {currentSegLabel}
            </p>
          </div>
        </div>

        {hasData && (
          <div className="flex items-center gap-2 text-[11px] sm:text-xs">
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 border border-emerald-200">
              Total: {inr(segmentPayments.total)}
            </span>
            <span className="rounded-lg bg-purple-50 px-2.5 py-1 font-bold text-[#673DE6] border border-purple-200">
              {segmentPayments.bills} {segmentPayments.bills === 1 ? "Bill" : "Bills"}
            </span>
          </div>
        )}
      </div>

      {segment === "all" && (
        <div className="sm:hidden">
          <SecondarySegmentTabs value={activeSeg} onChange={setActiveSeg} />
        </div>
      )}

      {!hasData ? (
        <div className="rounded-2xl border border-purple-100/90 bg-white p-8 text-center text-xs sm:text-sm font-medium text-slate-400 shadow-xs">
          No payment transactions recorded for {currentSegLabel} in this date range.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {/* Donut / Pie Chart Block */}
          <article className="lg:col-span-5 rounded-2xl border border-purple-100/90 bg-gradient-to-br from-purple-50/20 via-white to-indigo-50/20 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Payment Share (%)
              </h3>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                {segmentPayments.bills} bills total
              </span>
            </div>

            {/* Flex container: Pie chart on Left, Pointers on Right */}
            <div className="flex items-center justify-between gap-2.5 sm:gap-4 my-auto py-1">
              {/* Left: Small Donut Chart */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={34}
                      outerRadius={50}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {pieData.map((row) => (
                        <Cell key={row.name} fill={row.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, _name, item) => [
                        `${inr(Number(val) || 0)} (${item?.payload?.share ?? 0}%)`,
                        `${item?.payload?.bills ?? 0} bills`,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-1">
                  <span className="text-[7.5px] font-bold uppercase tracking-wider text-slate-400 leading-tight">
                    Paid
                  </span>
                  <span className="text-[11px] sm:text-xs font-black text-slate-900 leading-tight">
                    {inr(segmentPayments.total)}
                  </span>
                  <span className="text-[8.5px] text-slate-400 font-medium leading-tight">
                    {segmentPayments.bills} bills
                  </span>
                </div>
              </div>

              {/* Right: Pointers / Legend list */}
              <div className="flex-1 min-w-0 space-y-1.5">
                {pieData.map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/90 border border-purple-100/70 shadow-2xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: p.color }}
                      />
                      <span className="text-[11px] sm:text-xs font-bold text-slate-700 truncate">
                        {p.name}
                      </span>
                    </div>
                    <span className="text-xs sm:text-[13px] font-black text-slate-900 shrink-0">
                      {p.share}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          {/* Cards Breakdown: Horizontally Scrollable on Mobile with parallel percentage line */}
          <div className="lg:col-span-7 flex overflow-x-auto gap-2.5 sm:gap-3 pb-2 pt-0.5 scrollbar-none snap-x snap-mandatory overscroll-x-contain">
            {methods.map((method) => {
              const cfg = PAYMENT_CONFIG[method.method] || {
                label: method.label || method.method,
                color: "#64748B",
                badgeBg: "bg-slate-50 border-slate-200 text-slate-700",
                border: "border-slate-100 hover:border-slate-300",
                icon: Banknote,
              };
              const Icon = cfg.icon;

              return (
                <article
                  key={method.method}
                  className={`w-[78vw] max-w-[280px] sm:w-[250px] lg:min-w-[210px] lg:flex-1 shrink-0 snap-start rounded-2xl border ${cfg.border} bg-white p-3 sm:p-3.5 shadow-[0_2px_8px_rgba(103,61,230,0.04)] transition hover:shadow-md flex flex-col justify-between`}
                >
                  {/* Header: Icon, Name, Share badge */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: cfg.color }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {cfg.label}
                      </span>
                    </div>
                    <span
                      className={`rounded-md border px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold shrink-0 ${cfg.badgeBg}`}
                    >
                      {method.percentage}%
                    </span>
                  </div>

                  {/* Parallel: Rupees on Left & Percentage Line on Right */}
                  <div className="mt-2 flex items-center justify-between gap-2.5 pt-1">
                    <div className="min-w-0">
                      <p className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">
                        {inr(method.amount)}
                      </p>
                      <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-0.5 truncate">
                        {method.bills} {method.bills === 1 ? "bill" : "bills"}
                      </p>
                    </div>

                    {/* Percentage line parallel to rupees */}
                    <div className="w-24 sm:w-28 shrink-0 flex flex-col justify-center">
                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 mb-1">
                        <span className="text-[9px] text-slate-400 font-semibold">Share</span>
                        <span className="text-slate-800">{method.percentage}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden shadow-inner">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(0, method.percentage))}%`,
                            backgroundColor: cfg.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function TopSection({
  data,
  segment = "all",
}: {
  data: InsightsPayload;
  segment?: InsightSegment;
}) {
  const [activeSeg, setActiveSeg] = useState<InsightSegment>(segment);
  useEffect(() => {
    setActiveSeg(segment);
  }, [segment]);

  const effectiveSeg = segment === "all" ? activeSeg : segment;

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
    if (effectiveSeg === "all") {
      return list.filter((c) => c.key !== "membership");
    }
    return list.filter((c) => c.key === effectiveSeg);
  }, [effectiveSeg, viewType]);

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
          {viewType === "items" && effectiveSeg !== "membership" && (
            <ChipGroup value={sort} onChange={setSort} options={[["revenue", "Revenue"], ["qty", "Quantity"]]} />
          )}
          {(viewType === "customers" || effectiveSeg !== "membership") && (
            <ChipGroup
              value={String(limit) as "5" | "10"}
              onChange={value => setLimit(value === "10" ? 10 : 5)}
              options={[["5", "Top 5"], ["10", "Top 10"]]}
            />
          )}
        </div>
      </div>

      {segment === "all" && (
        <div className="sm:hidden">
          <SecondarySegmentTabs value={activeSeg} onChange={setActiveSeg} />
        </div>
      )}
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
              ? data?.segments?.find(s => s.key === "membership")?.top || []
              : data?.top?.[column.key] || [];

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
  const [activeSeg, setActiveSeg] = useState<InsightSegment>(query.segment || "all");
  useEffect(() => {
    setActiveSeg(query.segment || "all");
  }, [query.segment]);

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

  useEffect(() => { setPage(1); }, [query, activeSeg, bucket, visits, debounced]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchVisitors({ ...query, segment: activeSeg, bucket, visits, page, search: debounced })
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
  }, [query, activeSeg, bucket, visits, page, debounced]);

  const donut = [
    { name: "First time", value: summary.firstTime, color: "#0284c7" },
    { name: "Repeat", value: summary.repeat, color: "#7c3aed" },
  ].filter(row => row.value > 0);

  return (
    <section className="space-y-3">
      {/* ================= VISITOR ANALYTICS HERO CARD ================= */}
      <div className="rounded-2xl sm:rounded-3xl border border-purple-100/70 bg-[#F9F8FD] p-3.5 sm:p-4 md:p-4 shadow-[0_4px_24px_rgba(103,61,230,0.04)]">
        {/* Header */}
        <div className="flex items-start gap-2.5 mb-3 sm:mb-3.5">
          <span className="w-1.5 h-5 rounded-full bg-[#7C3AED] shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-snug">
              Visitor Analytics
            </h2>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5">
              One bill & one transaction. A visit is a unique day with a bill.
            </p>
          </div>
        </div>

        {(query.segment || "all") === "all" && (
          <div className="mb-3 sm:hidden">
            <SecondarySegmentTabs value={activeSeg} onChange={setActiveSeg} />
          </div>
        )}

        {/* Content Grid: 1 Column on Mobile (KPIs row then Donut), 2 Columns on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 items-stretch">
          {/* Mobile: KPIs in 1 row (grid-cols-2). Desktop: Left column stacked (md:flex md:flex-col) */}
          <div className="grid grid-cols-2 md:flex md:flex-col gap-2 sm:gap-2.5 justify-between">
            {/* Card 1: First-time visitors */}
            <div className="flex-1 flex flex-col justify-between rounded-xl md:rounded-2xl border border-[#BAE6FD] bg-[#F0F9FF] p-2.5 sm:p-3 md:p-3.5 shadow-2xs">
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-md bg-[#E0F2FE] text-[#0284C7]">
                    <Users size={12} className="sm:w-3.5 sm:h-3.5" strokeWidth={2.2} />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-[#0284C7] truncate">
                    First-time visitors
                  </span>
                </div>
                <p className="mt-1 sm:mt-1.5 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {summary.firstTime}
                </p>
              </div>
              <p className="mt-1 sm:mt-1.5 text-[10px] sm:text-[11px] font-semibold text-[#0369A1] leading-tight line-clamp-2">
                {summary.firstShare}% of {summary.unique} unique customers
              </p>
            </div>

            {/* Card 2: Repeat visitors */}
            <div className="flex-1 flex flex-col justify-between rounded-xl md:rounded-2xl border border-[#E9D5FF] bg-[#FAF5FF] p-2.5 sm:p-3 md:p-3.5 shadow-2xs">
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-md bg-[#F3E8FF] text-[#7C3AED]">
                    <Users size={12} className="sm:w-3.5 sm:h-3.5" strokeWidth={2.2} />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-[#7C3AED] truncate">
                    Repeat visitors
                  </span>
                </div>
                <p className="mt-1 sm:mt-1.5 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {summary.repeat}
                </p>
              </div>
              <p className="mt-1 sm:mt-1.5 text-[10px] sm:text-[11px] font-semibold text-[#6D28D9] leading-tight line-clamp-2">
                {summary.repeatShare}% – more than one visit
              </p>
            </div>
          </div>

          {/* Right Column (Desktop) / Row 2 (Mobile): Donut Chart Card */}
          <div className="flex flex-col justify-center rounded-xl md:rounded-2xl border border-slate-100/90 bg-white p-3 sm:p-3.5 md:p-4 shadow-xs">
            {donut.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">No visitors in this period.</p>
            ) : (
              <div className="w-full flex items-center justify-center gap-3.5 sm:gap-5 md:gap-6">
                {/* Donut Chart with Center KPI */}
                <div className="relative w-[115px] sm:w-[125px] md:w-[130px] aspect-square shrink-0">
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
                    <span className="text-[6.5px] sm:text-[7.5px] font-bold uppercase tracking-wider text-slate-400">
                      TOTAL VISITORS
                    </span>
                    <span className="text-base sm:text-lg md:text-xl font-black text-slate-900 leading-tight my-0.5">
                      {summary.unique}
                    </span>
                    <span className="text-[8.5px] sm:text-[9.5px] font-bold text-[#7C3AED]">
                      {summary.repeatShare}% repeat
                    </span>
                  </div>
                </div>

                {/* Pointers at Right Side Only */}
                <div className="flex flex-col justify-center gap-2 sm:gap-2.5 min-w-0">
                  {/* First-time Pointer */}
                  <div className="flex items-start gap-2 text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-[#0284C7] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-[11px] font-bold text-slate-700 leading-tight">
                        First-time:
                      </p>
                      <p className="text-[11px] sm:text-xs font-black text-slate-900 leading-tight mt-0.5">
                        {summary.firstTime}{" "}
                        <span className="text-[9.5px] sm:text-[10px] font-semibold text-slate-500">
                          ({summary.firstShare}%)
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Repeat Pointer */}
                  <div className="flex items-start gap-2 text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-[#7C3AED] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-[11px] font-bold text-slate-700 leading-tight">
                        Repeat:
                      </p>
                      <p className="text-[11px] sm:text-xs font-black text-slate-900 leading-tight mt-0.5">
                        {summary.repeat}{" "}
                        <span className="text-[9.5px] sm:text-[10px] font-semibold text-slate-500">
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

function PeakSection({
  data,
  segment = "all",
  className = "",
}: {
  data: InsightsPayload;
  segment?: InsightSegment;
  className?: string;
}) {
  const [activeSeg, setActiveSeg] = useState<InsightSegment>(segment);
  useEffect(() => {
    setActiveSeg(segment);
  }, [segment]);

  const [metric, setMetric] = useState<"bills" | "revenue">("bills");

  const effectiveSeg = segment === "all" ? activeSeg : segment;
  const selectedSeg = effectiveSeg === "all" ? null : data?.segments?.find((s) => s.key === effectiveSeg);

  const totalRev = Number(data?.totals?.revenue || 0);
  const totalBillsCount = Number(data?.totals?.bills || 0);

  const displayPeriods = useMemo(() => {
    if (!selectedSeg || totalRev <= 0) return data?.peak?.periods || [];
    const revRatio = totalRev > 0 ? (selectedSeg.revenue || 0) / totalRev : 0;
    const billRatio = totalBillsCount > 0 ? (selectedSeg.bills || 0) / totalBillsCount : revRatio;
    return (data?.peak?.periods || []).map((p) => ({
      ...p,
      revenue: Math.round((p.revenue || 0) * revRatio),
      bills: Math.max(0, Math.round((p.bills || 0) * billRatio)),
    }));
  }, [data, selectedSeg, totalRev, totalBillsCount]);

  const displayWeekdays = useMemo(() => {
    if (!selectedSeg || totalRev <= 0) return data?.peak?.weekdays || [];
    const revRatio = totalRev > 0 ? (selectedSeg.revenue || 0) / totalRev : 0;
    const billRatio = totalBillsCount > 0 ? (selectedSeg.bills || 0) / totalBillsCount : revRatio;
    return (data?.peak?.weekdays || []).map((w) => ({
      ...w,
      revenue: Math.round((w.revenue || 0) * revRatio),
      bills: Math.max(0, Math.round((w.bills || 0) * billRatio)),
    }));
  }, [data, selectedSeg, totalRev, totalBillsCount]);

  const busiestPeriod = useMemo(() => {
    if (!displayPeriods.length) return data?.peak?.busiestPeriod || "—";
    const sorted = [...displayPeriods].sort((a, b) => b.bills - a.bills);
    return sorted[0]?.label || data?.peak?.busiestPeriod || "—";
  }, [displayPeriods, data?.peak?.busiestPeriod]);

  const highestRevenuePeriod = useMemo(() => {
    if (!displayPeriods.length) return data?.peak?.highestRevenuePeriod || "—";
    const sorted = [...displayPeriods].sort((a, b) => b.revenue - a.revenue);
    return sorted[0]?.label || data?.peak?.highestRevenuePeriod || "—";
  }, [displayPeriods, data?.peak?.highestRevenuePeriod]);

  const totalBills = selectedSeg ? (selectedSeg.bills || 0) : (data?.peak?.totalBills ?? 0);
  const avgBills = selectedSeg
    ? Math.round(((selectedSeg.bills || 0) / Math.max(1, displayWeekdays.length)) * 10) / 10
    : (data?.peak?.averageBillsPerDay ?? 0);

  const busiestDay = useMemo(() => {
    if (!displayWeekdays.length) return data?.peak?.busiestDay || "—";
    const sorted = [...displayWeekdays].sort((a, b) => b.bills - a.bills);
    return sorted[0]?.day || data?.peak?.busiestDay || "—";
  }, [displayWeekdays, data?.peak?.busiestDay]);

  const highlight = metric === "bills" ? busiestPeriod : highestRevenuePeriod;

  return (
    <section className={`space-y-3 ${className}`}>
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

      {segment === "all" && (
        <div className="sm:hidden">
          <SecondarySegmentTabs value={activeSeg} onChange={setActiveSeg} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Mini icon={<Clock3 size={15} />} label="Most active" value={busiestPeriod || "—"} theme="amber" />
        <Mini icon={<Store size={15} />} label="Highest revenue" value={highestRevenuePeriod || "—"} theme="emerald" />
        <Mini icon={<Users size={15} />} label="Total bills" value={String(totalBills)} theme="indigo" />
        <Mini icon={<Clock3 size={15} />} label="Average bills / day" value={String(avgBills)} theme="rose" />
      </div>
      <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-2">
        <ChartCard title="Time of Day">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayPeriods} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={28} allowDecimals={false} />
              <Tooltip formatter={(value, name) => [name === "revenue" ? inr(Number(value) || 0) : value, name === "revenue" ? "Revenue" : "Bills"]} />
              <Bar dataKey={metric} radius={[5, 5, 0, 0]}>
                {displayPeriods.map(row => (
                  <Cell key={row.key} fill={row.label === highlight ? "#673DE6" : "#DDD6FE"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title={`Weekday · Busiest ${busiestDay || "—"}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayWeekdays} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={28} allowDecimals={false} />
              <Tooltip formatter={(value, name) => [name === "revenue" ? inr(Number(value) || 0) : value, name === "revenue" ? "Revenue" : "Bills"]} />
              <Bar dataKey={metric} radius={[5, 5, 0, 0]}>
                {displayWeekdays.map(row => (
                  <Cell key={row.day} fill={row.day === busiestDay ? "#059669" : "#A7F3D0"} />
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
