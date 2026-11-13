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

  const reset = () => {
    setPreset("today");
    setFrom("");
    setTo("");
    setSegment("all");
    setMembership("all");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Insights & Analytics</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Net sales from final bills, split into Food, Space, and Store. Drafts, cancellations, and membership-plan sales are left out.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {data ? `${pretty(data.range.from)} – ${pretty(data.range.to)} · Updated ${new Date(data.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "Select a date range"}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
            <RotateCcw size={14} /> Reset
          </button>
          <button type="button" onClick={() => setReloadKey(key => key + 1)} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </header>

      <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <FilterSelect
          label="Date"
          value={preset}
          onChange={value => setPreset(value as InsightPreset)}
          className="w-40"
        >
          {PRESETS.map(item => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </FilterSelect>
        {preset === "custom" ? (
          <>
            <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              From
              <input type="date" value={from} onChange={event => setFrom(event.target.value)} className="w-36 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              To
              <input type="date" value={to} onChange={event => setTo(event.target.value)} className="w-36 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none" />
            </label>
          </>
        ) : null}
        <FilterSelect
          label="Segment"
          value={segment}
          onChange={value => setSegment(value as InsightSegment)}
          className="w-36"
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
          className="w-44"
        >
          <option value="all">All customers</option>
          <option value="member">Membership</option>
          <option value="nonmember">Non-membership</option>
        </FilterSelect>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}
      {preset === "custom" && !canLoad ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">Choose a start and end date.</div>
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
  className = "w-36",
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
      {label}
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className={`${className} rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none`}
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
    <div className="flex rounded-lg bg-slate-50 p-0.5">
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${value === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
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
      <div className="grid gap-3 lg:grid-cols-2">
        <DonutCard title="By business segment" center={inr(data.totals.revenue)} rows={donut} empty="No billed sales in this range." />
        <DonutCard title="Membership vs non-membership" center={inr(data.totals.revenue)} rows={memberDonut} empty="No billed sales in this range." />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {data.segments.map(row => (
          <article key={row.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: SEGMENT_COLOR[row.key] }}>
                  {row.key === "food" ? <Utensils size={15} /> : row.key === "space" ? <Store size={15} /> : <ShoppingBag size={15} />}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{row.label}</p>
                  <p className="text-[11px] text-slate-400">{row.share}% of net sales</p>
                </div>
              </div>
              <Trend value={row.changePct} />
            </div>
            <p className="mt-3 text-2xl font-black text-slate-900">{inr(row.revenue)}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
              <div><dt>Bills</dt><dd className="font-semibold text-slate-800">{row.bills}</dd></div>
              <div><dt>Average bill</dt><dd className="font-semibold text-slate-800">{inr(row.average)}</dd></div>
              <div><dt>{row.key === "space" ? "Booked hours" : "Quantity sold"}</dt><dd className="font-semibold text-slate-800">{row.key === "space" ? row.hours : row.qty}</dd></div>
              <div><dt>{row.key === "space" ? "Bookings" : "Previous period"}</dt><dd className="font-semibold text-slate-800">{row.key === "space" ? row.bookings : inr(row.previousRevenue)}</dd></div>
            </dl>
            {row.top[0] ? <p className="mt-3 truncate text-[11px] text-slate-500">Top: <span className="font-semibold text-slate-700">{row.top[0].name}</span></p> : null}
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
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">{empty}</p>
      ) : (
        <div className="mt-2 grid items-center gap-2 sm:grid-cols-[220px_1fr]">
          <div className="relative h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={rows} dataKey="value" nameKey="name" innerRadius={62} outerRadius={84} paddingAngle={2} stroke="none">
                  {rows.map(row => <Cell key={row.name} fill={row.color} />)}
                </Pie>
                <Tooltip formatter={(value, _name, item) => [inr(Number(value) || 0), `${item?.payload?.share ?? 0}%`]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Net sales</span>
              <span className="text-sm font-black text-slate-900">{center}</span>
            </div>
          </div>
          <ul className="space-y-2">
            {rows.map(row => (
              <li key={row.name} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />{row.name}</span>
                <span className="font-semibold text-slate-900">{inr(row.value)} · {row.share}%</span>
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle title="Top performing items" note="Completed final bills only" />
        <div className="flex gap-2">
          <ChipGroup value={sort} onChange={setSort} options={[["revenue", "Revenue"], ["qty", "Quantity"]]} />
          <ChipGroup value={String(limit) as "5" | "10"} onChange={value => setLimit(value === "10" ? 10 : 5)} options={[["5", "Top 5"], ["10", "Top 10"]]} />
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {columns.map(column => {
          const rows = [...data.top[column.key]].sort((a, b) => sort === "qty" ? b.qty - a.qty : b.revenue - a.revenue).slice(0, limit);
          return (
            <article key={column.key} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <h3 className="px-1 text-sm font-bold text-slate-900">{column.title}</h3>
              {rows.length === 0 ? <p className="px-1 py-8 text-center text-xs text-slate-400">Nothing sold in this range.</p> : (
                <ol className="mt-2 space-y-2">
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
    <li className="flex items-center gap-2 rounded-xl bg-slate-50 px-2 py-2">
      <span className="w-4 text-center text-[11px] font-bold text-slate-400">{index}</span>
      {row.image ? <img src={row.image} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[10px] font-bold text-slate-400">#{index}</span>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-800">{row.name}</p>
        <p className="truncate text-[10px] text-slate-400">
          {kind === "store" && row.sku ? `${row.sku} · ` : ""}
          {kind === "space" ? `${row.bookings || row.orders} bookings · ${row.hours || 0}h` : `${row.qty} sold · ${row.orders} bills`}
        </p>
      </div>
      <span className="text-xs font-bold text-slate-900">{inr(row.revenue)}</span>
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
      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">First-time visitors</p>
            <p className="mt-1 text-3xl font-black text-slate-900">{summary.firstTime}</p>
            <p className="text-xs text-slate-400">{summary.firstShare}% of {summary.unique} unique customers</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">Repeat visitors</p>
            <p className="mt-1 text-3xl font-black text-slate-900">{summary.repeat}</p>
            <p className="text-xs text-slate-400">{summary.repeatShare}% · more than one visit, or a visit before this period</p>
          </article>
        </div>
        <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          {donut.length === 0 ? <p className="py-10 text-center text-xs text-slate-400">No visitors.</p> : (
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius={36} outerRadius={54} stroke="none">
                    {donut.map(row => <Cell key={row.name} fill={row.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <ChipGroup value={bucket} onChange={setBucket} options={[["day", "Per day"], ["week", "Per week"], ["month", "Per month"]]} />
            <ChipGroup value={visits} onChange={setVisits} options={[["all", "All"], ["1", "1 visit"], ["2", "2 visits"], ["3", "3+ visits"]]} />
          </div>
          <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1">
            <Search size={13} className="text-slate-400" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Name or phone" className="w-36 bg-transparent text-xs outline-none" />
          </label>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
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
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">{row.name}</h3>
            <p className="text-xs text-slate-500">{row.phone || "No phone"} {detail?.customer.member ? "· Membership" : ""}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500"><X size={16} /></button>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        {!detail && !error ? <p className="mt-6 flex justify-center"><Loader2 className="animate-spin text-slate-400" size={18} /></p> : null}
        {detail ? (
          <>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <Stat label="Visits in range" value={String(detail.range.visits)} />
              <Stat label="Bills in range" value={String(detail.range.bills)} />
              <Stat label="Spent in range" value={inr(detail.range.spend)} />
              <Stat label="Average per visit" value={inr(detail.range.average)} />
              <Stat label="First visit ever" value={pretty(detail.lifetime.firstVisit)} />
              <Stat label="Last visit ever" value={pretty(detail.lifetime.lastVisit)} />
            </dl>
            <h4 className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">Bills in this range</h4>
            <ul className="mt-2 space-y-2">
              {detail.range.billsList.map(bill => (
                <li key={bill.invoiceCode} className="rounded-xl border border-slate-100 px-3 py-2 text-xs">
                  <div className="flex justify-between font-semibold text-slate-800"><span>{bill.invoiceCode}</span><span>{inr(bill.amount)}</span></div>
                  <p className="text-slate-400">{pretty(bill.date)} · {bill.items.join(", ") || "Items"}</p>
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
  return <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-slate-400">{label}</dt><dd className="font-semibold text-slate-800">{value}</dd></div>;
}

function PeakSection({ data }: { data: InsightsPayload }) {
  const [metric, setMetric] = useState<"bills" | "revenue">("bills");
  const highlight = metric === "bills" ? data.peak.busiestPeriod : data.peak.highestRevenuePeriod;
  return (
    <section className="space-y-3 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle title="Peak billing hours" note="Time is taken from when the bill was saved, in India time" />
        <ChipGroup value={metric} onChange={setMetric} options={[["bills", "Number of bills"], ["revenue", "Revenue"]]} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Mini icon={<Clock3 size={15} />} label="Most active" value={data.peak.busiestPeriod || "—"} />
        <Mini icon={<Store size={15} />} label="Highest revenue" value={data.peak.highestRevenuePeriod || "—"} />
        <Mini icon={<Users size={15} />} label="Total bills" value={String(data.peak.totalBills)} />
        <Mini icon={<Clock3 size={15} />} label="Average bills / day" value={String(data.peak.averageBillsPerDay)} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Time of day">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.peak.periods}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(value, name) => [name === "revenue" ? inr(Number(value) || 0) : value, name === "revenue" ? "Revenue" : "Bills"]} />
              <Bar dataKey={metric} radius={[6, 6, 0, 0]}>
                {data.peak.periods.map(row => (
                  <Cell key={row.key} fill={row.label === highlight ? "#4f46e5" : "#cbd5e1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title={`Weekday · busiest ${data.peak.busiestDay || "—"}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.peak.weekdays}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(value, name) => [name === "revenue" ? inr(Number(value) || 0) : value, name === "revenue" ? "Revenue" : "Bills"]} />
              <Bar dataKey={metric} radius={[6, 6, 0, 0]}>
                {data.peak.weekdays.map(row => (
                  <Cell key={row.day} fill={row.day === data.peak.busiestDay ? "#0f766e" : "#cbd5e1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <ul className="grid gap-2 sm:grid-cols-4">
        {data.peak.periods.map(row => (
          <li key={row.key} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
            <p className="font-bold text-slate-800">{row.label}</p>
            <p className="text-slate-400">{row.hint}</p>
            <p className="mt-1 font-semibold text-slate-700">{row.bills} bills · {inr(row.revenue)} · {row.share}%</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="mb-2 text-sm font-bold text-slate-900">{title}</h3>
      <div className="h-60">{children}</div>
    </article>
  );
}

function Mini({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{icon}</span>
      <div>
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="text-sm font-bold text-slate-900">{value}</p>
      </div>
    </article>
  );
}

function SectionTitle({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      <p className="text-[11px] text-slate-400">{note}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-40 animate-pulse rounded-2xl bg-slate-200/70" />)}
    </div>
  );
}

export default InsightsAnalyticsScreen;
