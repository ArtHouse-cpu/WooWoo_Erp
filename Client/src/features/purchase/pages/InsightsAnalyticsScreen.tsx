import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Clock3,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  Store,
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

const SEGMENT_COLOR = { food: "#d97706", space: "#4f46e5", store: "#0f766e" };
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
  const [preset, setPreset] = useState<InsightPreset>("today");
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
    setPreset("today");
    setFrom("");
    setTo("");
    setSegment("all");
    setMembership("all");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5 px-3 py-3 sm:px-6 sm:py-5">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Insights & Analytics</h1>
          <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-slate-400">
            {data ? `${pretty(data.range.from)} – ${pretty(data.range.to)} · Updated ${new Date(data.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "Select a date range"}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-end gap-2 w-full sm:w-auto">
          <FilterSelect
            label="Date"
            value={preset}
            onChange={value => setPreset(value as InsightPreset)}
            className="w-full sm:w-36"
          >
            {PRESETS.map(item => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </FilterSelect>
          {preset === "custom" ? (
            <>
              <label className="flex flex-col gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-400 w-full sm:w-auto">
                From
                <input type="date" value={from} onChange={event => setFrom(event.target.value)} className="w-full sm:w-36 h-9 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-400 w-full sm:w-auto">
                To
                <input type="date" value={to} onChange={event => setTo(event.target.value)} className="w-full sm:w-36 h-9 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none" />
              </label>
            </>
          ) : null}
          <FilterSelect
            label="Segment"
            value={segment}
            onChange={value => setSegment(value as InsightSegment)}
            className="w-full sm:w-36"
          >
            <option value="all">All segments</option>
            <option value="food">Food</option>
            <option value="space">Space</option>
            <option value="store">Store</option>
          </FilterSelect>
          <FilterSelect
            label="Membership"
            value={membership}
            onChange={value => setMembership(value as InsightMembership)}
            className="w-full sm:w-40 col-span-2 sm:col-span-1"
          >
            <option value="all">All customers</option>
            <option value="member">Membership</option>
            <option value="nonmember">Non-membership</option>
          </FilterSelect>
          <div className="col-span-2 sm:col-span-1 flex items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0">
            <button type="button" onClick={reset} className="flex-1 sm:flex-initial inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition active:scale-95">
              <RotateCcw size={14} /> Reset
            </button>
            <button type="button" onClick={() => setReloadKey(key => key + 1)} className="flex-1 sm:flex-initial inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white transition active:scale-95">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>
      </header>
      <section className="space-y-2">
        <h2 className="text-xs sm:text-sm font-bold text-slate-900">Space booking utilization</h2>
        <SpaceUtilizationPanel data={spaceUse} />
      </section>

      {error ? (
        <div className="rounded-xl sm:rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-rose-700">{error}</div>
      ) : null}
      {preset === "custom" && !canLoad ? (
        <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-xs sm:text-sm text-slate-500">Choose a start and end date.</div>
      ) : null}

      {loading && !data ? <Skeleton /> : null}
      {data ? (
        <>
          <RevenueSection data={data} loading={loading} />
          <TopSection data={data} />
          <VisitorSection query={query} summary={data.visitors} />
          <PeakSection data={data} />
        </>
      ) : null}
    </div>
  );
};

function FilterSelect({
  label,
  value,
  onChange,
  className = "w-full sm:w-36",
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-400">
      {label}
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className={`${className} h-9 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none`}
      >
        {children}
      </select>
    </label>
  );
}

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
    <div className="flex rounded-lg bg-slate-100 p-0.5">
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`rounded-md px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold transition ${
            value === id ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
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
      <SectionTitle title="Revenue overview" note={loading ? "Updating…" : "Compared with the previous period of the same length"} />
      <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-2">
        <DonutCard title="By business segment" center={inr(data.totals.revenue)} rows={donut} empty="No billed sales in this range." />
        <DonutCard title="Membership vs non-membership" center={inr(data.totals.revenue)} rows={memberDonut} empty="No billed sales in this range." />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {data.segments.map((row, idx) => (
          <article
            key={row.key}
            className={`rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs ${
              idx === data.segments.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: SEGMENT_COLOR[row.key] }}>
                  {row.key === "food" ? <Utensils size={14} /> : row.key === "space" ? <Store size={14} /> : <ShoppingBag size={14} />}
                </span>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900">{row.label}</p>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">{row.share}% of net sales</p>
                </div>
              </div>
              <Trend value={row.changePct} />
            </div>
            <p className="mt-2 sm:mt-3 text-xl sm:text-2xl font-black text-slate-900">{inr(row.revenue)}</p>
            <dl className="mt-2 sm:mt-3 grid grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-slate-500">
              <div><dt>Bills</dt><dd className="font-semibold text-slate-800">{row.bills}</dd></div>
              <div><dt>Average bill</dt><dd className="font-semibold text-slate-800">{inr(row.average)}</dd></div>
              <div><dt>{row.key === "space" ? "Booked hours" : "Quantity sold"}</dt><dd className="font-semibold text-slate-800">{row.key === "space" ? row.hours : row.qty}</dd></div>
              <div><dt>{row.key === "space" ? "Bookings" : "Previous period"}</dt><dd className="font-semibold text-slate-800">{row.key === "space" ? row.bookings : inr(row.previousRevenue)}</dd></div>
            </dl>
            {row.top[0] ? <p className="mt-2.5 sm:mt-3 truncate text-[10px] sm:text-[11px] text-slate-500">Top: <span className="font-semibold text-slate-700">{row.top[0].name}</span></p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function DonutCard({
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
    <article className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs">
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
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-slate-400">Net sales</span>
              <span className="text-xs sm:text-sm font-black text-slate-900">{center}</span>
            </div>
          </div>
          <ul className="space-y-1.5 sm:space-y-2">
            {rows.map(row => (
              <li key={row.name} className="flex items-center justify-between gap-2 sm:gap-3 text-[11px] sm:text-xs">
                <span className="flex items-center gap-1.5 sm:gap-2 text-slate-600 truncate">
                  <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full shrink-0" style={{ background: row.color }} />
                  <span className="truncate">{row.name}</span>
                </span>
                <span className="font-semibold text-slate-900 shrink-0">{inr(row.value)} · {row.share}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function Trend({ value }: { value: number | null }) {
  if (value == null) return <span className="text-[11px] font-semibold text-indigo-600">New</span>;
  const up = value >= 0;
  return <span className={`text-[11px] font-semibold ${up ? "text-emerald-600" : "text-rose-600"}`}>{up ? "+" : ""}{value}%</span>;
}

function TopSection({ data }: { data: InsightsPayload }) {
  const [limit, setLimit] = useState<5 | 10>(5);
  const [sort, setSort] = useState<"revenue" | "qty">("revenue");
  const columns: { key: "food" | "store" | "space"; title: string }[] = [
    { key: "food", title: "Most selling food" },
    { key: "store", title: "Most selling store products" },
    { key: "space", title: "Most popular spaces" },
  ];
  return (
    <section className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <SectionTitle title="Top performing items" note="Completed final bills only" />
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ChipGroup value={sort} onChange={setSort} options={[["revenue", "Revenue"], ["qty", "Quantity"]]} />
          <ChipGroup value={String(limit) as "5" | "10"} onChange={value => setLimit(value === "10" ? 10 : 5)} options={[["5", "Top 5"], ["10", "Top 10"]]} />
        </div>
      </div>
      <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-3">
        {columns.map(column => {
          const rows = [...data.top[column.key]].sort((a, b) => sort === "qty" ? b.qty - a.qty : b.revenue - a.revenue).slice(0, limit);
          return (
            <article key={column.key} className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-xs">
              <h3 className="px-1 text-xs sm:text-sm font-bold text-slate-900">{column.title}</h3>
              {rows.length === 0 ? <p className="px-1 py-8 text-center text-xs text-slate-400">Nothing sold in this range.</p> : (
                <ol className="mt-2 space-y-1.5 sm:space-y-2">
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
  return (
    <li className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-slate-50 px-2 py-1.5 sm:py-2">
      <span className="w-3.5 sm:w-4 text-center text-[10px] sm:text-[11px] font-bold text-slate-400 shrink-0">{index}</span>
      {row.image ? (
        <img src={row.image} alt="" className="h-8 w-8 sm:h-9 sm:w-9 rounded-md sm:rounded-lg object-cover shrink-0" />
      ) : (
        <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-md sm:rounded-lg bg-white text-[9px] sm:text-[10px] font-bold text-slate-400 shrink-0">
          #{index}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-800">{row.name}</p>
        <p className="truncate text-[10px] text-slate-400">
          {kind === "store" && row.sku ? `${row.sku} · ` : ""}
          {kind === "space" ? `${row.bookings || row.orders} bookings · ${row.hours || 0}h` : `${row.qty} sold · ${row.orders} bills`}
        </p>
      </div>
      <span className="text-xs font-bold text-slate-900 shrink-0">{inr(row.revenue)}</span>
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
      <SectionTitle title="Visitor analytics" note="One bill is one transaction. A visit is a unique day with a bill." />
      <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-[1fr_280px]">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <article className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-4 shadow-xs">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 truncate">First-time visitors</p>
            <p className="mt-0.5 sm:mt-1 text-xl sm:text-3xl font-black text-slate-900">{summary.firstTime}</p>
            <p className="mt-0.5 text-[9px] sm:text-xs text-slate-400 line-clamp-2 leading-tight">
              {summary.firstShare}% of {summary.unique} unique customers
            </p>
          </article>
          <article className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-4 shadow-xs">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 truncate">Repeat visitors</p>
            <p className="mt-0.5 sm:mt-1 text-xl sm:text-3xl font-black text-slate-900">{summary.repeat}</p>
            <p className="mt-0.5 text-[9px] sm:text-xs text-slate-400 line-clamp-2 leading-tight">
              {summary.repeatShare}% · more than one visit
            </p>
          </article>
        </div>
        <article className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-xs">
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

      <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <ChipGroup value={bucket} onChange={setBucket} options={[["day", "Per day"], ["week", "Per week"], ["month", "Per month"]]} />
            <ChipGroup value={visits} onChange={setVisits} options={[["all", "All"], ["1", "1 visit"], ["2", "2 visits"], ["3", "3+ visits"]]} />
          </div>
          <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 w-full sm:w-auto">
            <Search size={13} className="text-slate-400 shrink-0" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Name or phone" className="w-full sm:w-36 bg-transparent text-xs outline-none" />
          </label>
        </div>
        <div className="mt-3 overflow-x-auto -mx-1 sm:mx-0">
          <table className="min-w-[620px] sm:min-w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wide text-slate-400">
              <tr>
                {["Customer", "Phone", "Visits", "Bills", "First visit", "Last visit", "Spending", "Type"].map(heading => (
                  <th key={heading} className="px-2 py-2 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.key} onClick={() => setSelected(row)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-2 py-2 font-semibold text-slate-800">{row.name}</td>
                  <td className="px-2 py-2 text-slate-500">{row.phone || "—"}</td>
                  <td className="px-2 py-2">{row.visits}</td>
                  <td className="px-2 py-2">{row.bills}</td>
                  <td className="px-2 py-2">{pretty(row.firstVisit)}</td>
                  <td className="px-2 py-2">{pretty(row.lastVisit)}</td>
                  <td className="px-2 py-2 font-semibold">{inr(row.spend)}</td>
                  <td className="px-2 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${row.visitType === "Repeat" ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700"}`}>{row.visitType}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 ? <p className="py-8 text-center text-xs text-slate-400">No customers match this frequency.</p> : null}
          {loading ? <p className="flex items-center justify-center gap-2 py-4 text-xs text-slate-400"><Loader2 size={14} className="animate-spin" /> Loading visitors</p> : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>{total} customers</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40">Previous</button>
            <span>{page} / {pages}</span>
            <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40">Next</button>
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-2 sm:p-3 sm:items-center">
      <div className="max-h-[90vh] sm:max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-3.5 sm:p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">{row.name}</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">{row.phone || "No phone"} {detail?.customer.member ? "· Membership" : ""}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 shrink-0"><X size={16} /></button>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        {!detail && !error ? <p className="mt-6 flex justify-center"><Loader2 className="animate-spin text-slate-400" size={18} /></p> : null}
        {detail ? (
          <>
            <dl className="mt-3 sm:mt-4 grid grid-cols-2 gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
              <Stat label="Visits in range" value={String(detail.range.visits)} />
              <Stat label="Bills in range" value={String(detail.range.bills)} />
              <Stat label="Spent in range" value={inr(detail.range.spend)} />
              <Stat label="Average per visit" value={inr(detail.range.average)} />
              <Stat label="First visit ever" value={pretty(detail.lifetime.firstVisit)} />
              <Stat label="Last visit ever" value={pretty(detail.lifetime.lastVisit)} />
            </dl>
            <h4 className="mt-3 sm:mt-4 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-slate-400">Bills in this range</h4>
            <ul className="mt-2 space-y-1.5 sm:space-y-2">
              {detail.range.billsList.map(bill => (
                <li key={bill.invoiceCode} className="rounded-xl border border-slate-100 p-2 sm:px-3 sm:py-2 text-[11px] sm:text-xs">
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span className="truncate">{bill.invoiceCode}</span>
                    <span className="shrink-0">{inr(bill.amount)}</span>
                  </div>
                  <p className="text-slate-400 truncate">{pretty(bill.date)} · {bill.items.join(", ") || "Items"}</p>
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
    <div className="rounded-xl bg-slate-50 p-2 sm:px-3 sm:py-2">
      <dt className="text-[10px] sm:text-xs text-slate-400">{label}</dt>
      <dd className="font-semibold text-slate-800 text-xs sm:text-sm">{value}</dd>
    </div>
  );
}

function PeakSection({ data }: { data: InsightsPayload }) {
  const [metric, setMetric] = useState<"bills" | "revenue">("bills");
  const highlight = metric === "bills" ? data.peak.busiestPeriod : data.peak.highestRevenuePeriod;
  return (
    <section className="space-y-3 pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <SectionTitle title="Peak billing hours" note="Time is taken from when the bill was saved, in India time" />
        <ChipGroup value={metric} onChange={setMetric} options={[["bills", "Number of bills"], ["revenue", "Revenue"]]} />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Mini icon={<Clock3 size={15} />} label="Most active" value={data.peak.busiestPeriod || "—"} />
        <Mini icon={<Store size={15} />} label="Highest revenue" value={data.peak.highestRevenuePeriod || "—"} />
        <Mini icon={<Users size={15} />} label="Total bills" value={String(data.peak.totalBills)} />
        <Mini icon={<Clock3 size={15} />} label="Average bills / day" value={String(data.peak.averageBillsPerDay)} />
      </div>
      <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-2">
        <ChartCard title="Time of day">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.peak.periods} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} />
              <YAxis tick={{ fontSize: 10 }} width={28} allowDecimals={false} />
              <Tooltip formatter={(value, name) => [name === "revenue" ? inr(Number(value) || 0) : value, name === "revenue" ? "Revenue" : "Bills"]} />
              <Bar dataKey={metric} radius={[5, 5, 0, 0]}>
                {data.peak.periods.map(row => (
                  <Cell key={row.key} fill={row.label === highlight ? "#4f46e5" : "#cbd5e1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title={`Weekday · busiest ${data.peak.busiestDay || "—"}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.peak.weekdays} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={0} />
              <YAxis tick={{ fontSize: 10 }} width={28} allowDecimals={false} />
              <Tooltip formatter={(value, name) => [name === "revenue" ? inr(Number(value) || 0) : value, name === "revenue" ? "Revenue" : "Bills"]} />
              <Bar dataKey={metric} radius={[5, 5, 0, 0]}>
                {data.peak.weekdays.map(row => (
                  <Cell key={row.day} fill={row.day === data.peak.busiestDay ? "#0f766e" : "#cbd5e1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {data.peak.periods.map(row => (
          <li key={row.key} className="rounded-xl border border-slate-200 bg-white p-2.5 sm:px-3 sm:py-2 text-xs">
            <p className="font-bold text-slate-800 text-xs sm:text-sm">{row.label}</p>
            <p className="text-[10px] sm:text-xs text-slate-400">{row.hint}</p>
            <p className="mt-1 font-semibold text-slate-700 text-[10px] sm:text-xs leading-tight">
              {row.bills} bills · {inr(row.revenue)}
            </p>
            <p className="text-[10px] sm:text-xs font-bold text-indigo-600">{row.share}%</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-xs">
      <h3 className="mb-2 text-xs sm:text-sm font-bold text-slate-900">{title}</h3>
      <div className="h-48 sm:h-60">{children}</div>
    </article>
  );
}

function Mini({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-2.5 sm:px-3 sm:py-3 shadow-xs">
      <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] sm:text-[11px] text-slate-400">{label}</p>
        <p className="truncate text-xs sm:text-sm font-bold text-slate-900">{value}</p>
      </div>
    </article>
  );
}

function SectionTitle({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <h2 className="text-xs sm:text-sm font-bold text-slate-900">{title}</h2>
      <p className="text-[10px] sm:text-[11px] text-slate-400">{note}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 sm:h-40 animate-pulse rounded-xl sm:rounded-2xl bg-slate-200/70" />)}
    </div>
  );
}

export default InsightsAnalyticsScreen;
