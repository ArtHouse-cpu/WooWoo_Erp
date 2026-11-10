import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  LogIn,
  LogOut,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  User,
  Wallet,
  X,
} from "lucide-react";
import {
  handleGetActivityModules,
  handleGetActivityStats,
  handleGetActivityTimeline,
  handleGetActivityUsers,
  type ActivityItem,
  type ActivityQuery,
} from "@/services/apiClient";

const PAGE_SIZE = 30;
const ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "APPROVE",
  "CANCEL",
  "REFUND",
  "PAYMENT",
];

const toYmd = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getPeriodRange = (period: string) => {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (period === "today") return { start: toYmd(startOfToday), end: toYmd(startOfToday) };
  if (period === "yesterday") {
    const day = new Date(startOfToday);
    day.setDate(day.getDate() - 1);
    return { start: toYmd(day), end: toYmd(day) };
  }
  if (period === "this_week") {
    const start = new Date(startOfToday);
    const weekday = start.getDay() || 7;
    start.setDate(start.getDate() - (weekday - 1));
    return { start: toYmd(start), end: toYmd(startOfToday) };
  }
  if (period === "this_month") {
    return {
      start: toYmd(new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1)),
      end: toYmd(startOfToday),
    };
  }
  return { start: "", end: "" };
};

const istBound = (ymd: string, end: boolean) => {
  if (!ymd) return "";
  const time = end ? "T23:59:59.999+05:30" : "T00:00:00+05:30";
  return new Date(`${ymd}${time}`).toISOString();
};

const initials = (name?: string) => {
  const parts = String(name || "System").trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "S";
};

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const displayValue = (value: unknown) => {
  if (value == null || value === "") return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "—";
  }
};

const actionStyle = (action: string, failed: boolean) => {
  if (failed) return "bg-rose-50 text-rose-700 ring-rose-200";
  if (action === "CREATE") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (action === "UPDATE") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (action === "DELETE") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (action === "LOGIN") return "bg-violet-50 text-violet-700 ring-violet-200";
  if (action === "LOGOUT") return "bg-slate-100 text-slate-700 ring-slate-200";
  return "bg-amber-50 text-amber-800 ring-amber-200";
};

const ModuleIcon = ({ module }: { module: string }) => {
  const name = module.toLowerCase();
  const className = "h-4 w-4";
  if (name.includes("logout")) return <LogOut className={className} />;
  if (name.includes("auth")) return <LogIn className={className} />;
  if (name.includes("invoice") || name.includes("quotation")) return <FileText className={className} />;
  if (name.includes("purchase")) return <ShoppingCart className={className} />;
  if (name.includes("wallet") || name.includes("payment")) return <Wallet className={className} />;
  if (name.includes("product") || name.includes("inventory") || name.includes("food")) {
    return <Package className={className} />;
  }
  if (name.includes("customer") || name.includes("vendor")) return <User className={className} />;
  return <Activity className={className} />;
};

const ActivityTimelineScreen = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState<{ date: string; label: string; items: ActivityItem[] }[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0, created: 0, updatedOrDeleted: 0 });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState<"" | "success" | "failure">("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [datePreset, setDatePreset] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [modules, setModules] = useState<string[]>([]);
  const [users, setUsers] = useState<{ _id: string; userName?: string; userEmail?: string }[]>([]);
  const [expandedId, setExpandedId] = useState("");
  const [selected, setSelected] = useState<ActivityItem | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    handleGetActivityModules(controller.signal)
      .then((response) => setModules(response.modules || []))
      .catch(() => setModules([]));
    handleGetActivityUsers(controller.signal)
      .then((response) => setUsers(response.users || []))
      .catch(() => setUsers([]));
    return () => controller.abort();
  }, [reloadToken]);

  useEffect(() => {
    const controller = new AbortController();
    const query: ActivityQuery = {
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch,
      module: moduleName,
      action,
      userId,
      status,
      sort,
      from: istBound(dateRange.start, false),
      to: istBound(dateRange.end, true),
    };
    setLoading(true);
    setError("");
    Promise.all([
      handleGetActivityTimeline(query, controller.signal),
      handleGetActivityStats(query, controller.signal),
    ])
      .then(([timeline, summary]) => {
        setGroups(timeline.groups || []);
        setPages(timeline.pages || 0);
        setTotal(timeline.total || 0);
        setStats(summary.stats || { total: 0, today: 0, created: 0, updatedOrDeleted: 0 });
      })
      .catch((err: { name?: string; response?: { data?: { message?: string } } }) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setGroups([]);
        setError(err?.response?.data?.message || "Could not load the activity timeline.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    page,
    debouncedSearch,
    moduleName,
    action,
    userId,
    status,
    sort,
    dateRange.start,
    dateRange.end,
    reloadToken,
  ]);

  const applyPreset = (preset: string) => {
    setDatePreset(preset);
    setPage(1);
    if (preset !== "custom") setDateRange(getPeriodRange(preset));
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain lg:overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Activity Timeline</h1>
          <p className="mt-1 text-sm text-slate-500">Business actions recorded across the ERP.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-indigo-600" />
            <select
              value={datePreset}
              onChange={(event) => applyPreset(event.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none"
            >
              <option value="all">All dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This week</option>
              <option value="this_month">This month</option>
              <option value="custom">Custom date</option>
            </select>
          </label>
          {datePreset === "custom" && (
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1">
              <input
                type="date"
                value={dateRange.start}
                onChange={(event) => {
                  setDateRange((current) => ({ ...current, start: event.target.value }));
                  setPage(1);
                }}
                className="bg-transparent text-xs text-slate-700 outline-none"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(event) => {
                  setDateRange((current) => ({ ...current, end: event.target.value }));
                  setPage(1);
                }}
                className="bg-transparent text-xs text-slate-700 outline-none"
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
        <StatCard title="Total activities" value={stats.total} color="blue" icon={<Activity size={18} />} label="Matching this filter" />
        <StatCard title="Today" value={stats.today} color="indigo" icon={<Calendar size={18} />} label="Since midnight" />
        <StatCard title="Created" value={stats.created} color="emerald" icon={<Plus size={18} />} label="Create actions" />
        <StatCard title="Updated / deleted" value={stats.updatedOrDeleted} color="rose" icon={<Pencil size={18} />} label="Update and delete" />
      </div>

      <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <label className="relative xl:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search user, resource, or description"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-300"
          />
        </label>
        <FilterSelect label="Module" value={moduleName} onChange={(value) => { setModuleName(value); setPage(1); }}>
          <option value="">All modules</option>
          {modules.map((name) => <option key={name} value={name}>{name}</option>)}
        </FilterSelect>
        <FilterSelect label="User" value={userId} onChange={(value) => { setUserId(value); setPage(1); }}>
          <option value="">All users</option>
          {users.map((user) => (
            <option key={user._id} value={user._id}>{user.userName || user.userEmail || "Staff"}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="Action" value={action} onChange={(value) => { setAction(value); setPage(1); }}>
          <option value="">All actions</option>
          {ACTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
        </FilterSelect>
        <FilterSelect label="Status" value={status} onChange={(value) => { setStatus(value as "" | "success" | "failure"); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="failure">Failed</option>
        </FilterSelect>
      </div>

      <div className="flex shrink-0 items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{total.toLocaleString()} activities</p>
        <FilterSelect label="Sort" value={sort} onChange={(value) => { setSort(value as "newest" | "oldest"); setPage(1); }}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </FilterSelect>
      </div>

      <div className="min-h-0 flex-1 space-y-4 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p>{error}</p>
            <button type="button" onClick={() => setReloadToken((token) => token + 1)} className="mt-1 font-semibold underline">
              Try again
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-16 text-center">
          <Activity className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-700">No activities yet</p>
          <p className="mt-1 text-xs text-slate-500">Create, update, or sign in again. Reads and searches are not recorded.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.date}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{group.label}</h2>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const failed = item.status === "failure";
                  const open = expandedId === item._id;
                  return (
                    <article key={item._id} className="rounded-2xl border border-slate-200 bg-white shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setSelected(item)}
                        className="flex w-full items-start gap-3 px-3 py-3 text-left sm:px-4"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                          {initials(item.userName)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-semibold text-slate-900">{item.userName || item.actorType || "System"}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${actionStyle(item.action, failed)}`}>
                              {failed ? "FAILED" : item.action}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                              <ModuleIcon module={item.module} />
                              {item.module}
                            </span>
                          </span>
                          <span className="mt-1 block text-sm text-slate-700">{item.description || `${item.action} ${item.module}`}</span>
                          <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span>{item.resourceName || item.resourceType || "No resource"}</span>
                            <span>{formatTime(item.createdAt)}</span>
                            <span className={failed ? "font-semibold text-rose-600" : "font-semibold text-emerald-600"}>
                              {failed ? "Failed" : "Success"}
                            </span>
                          </span>
                        </span>
                      </button>
                      {!!item.changes?.length && (
                        <div className="border-t border-slate-100 px-3 py-2 sm:px-4">
                          <button
                            type="button"
                            onClick={() => setExpandedId(open ? "" : item._id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700"
                          >
                            <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
                            {item.changes.length} changed field{item.changes.length === 1 ? "" : "s"}
                          </button>
                          {open && <ChangeTable changes={item.changes} />}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-xs font-medium text-slate-500">Page {page} of {pages}</span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setPage((current) => current + 1)}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      </div>
      {selected && <ActivityDrawer item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

const FilterSelect = ({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) => (
  <label className="block">
    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
    >
      {children}
    </select>
  </label>
);

const ChangeTable = ({ changes }: { changes: ActivityItem["changes"] }) => (
  <div className="mt-2 overflow-x-auto">
    <table className="w-full min-w-[520px] text-left text-xs">
      <thead className="text-slate-400">
        <tr>
          <th className="py-1 pr-3 font-semibold">Field</th>
          <th className="py-1 pr-3 font-semibold">Old</th>
          <th className="py-1 font-semibold">New</th>
        </tr>
      </thead>
      <tbody>
        {(changes || []).map((change) => (
          <tr key={change.field} className="border-t border-slate-100 align-top">
            <td className="py-1.5 pr-3 font-semibold text-slate-700">{change.field}</td>
            <td className="py-1.5 pr-3 text-rose-700">{displayValue(change.oldValue)}</td>
            <td className="py-1.5 text-emerald-700">{displayValue(change.newValue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const DetailRow = ({ label, value }: { label: string; value?: string }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    <p className="mt-0.5 break-all text-sm font-medium text-slate-800">{value || "—"}</p>
  </div>
);

const ActivityDrawer = ({ item, onClose }: { item: ActivityItem; onClose: () => void }) => {
  const failed = item.status === "failure";
  const metadata = Object.entries(item.metadata || {}).filter(([, value]) => value != null && value !== "");
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Activity</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">{item.description || item.action}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
              {initials(item.userName)}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.userName || "System"}</p>
              <p className="text-xs text-slate-500">{item.userEmail || item.actorType || "No email"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DetailRow label="Module" value={item.module} />
            <DetailRow label="Action" value={failed ? `${item.action} · Failed` : item.action} />
            <DetailRow label="Date and time" value={formatDateTime(item.createdAt)} />
            <DetailRow label="Actor" value={item.actorType} />
            <DetailRow label="Resource" value={item.resourceName} />
            <DetailRow label="Resource ID" value={item.resourceId} />
            <DetailRow label="HTTP method" value={item.method} />
            <DetailRow label="IP address" value={item.ipAddress} />
          </div>
          <DetailRow label="API endpoint" value={item.endpoint} />
          {!!item.changes?.length && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Old value vs new value</p>
              <ChangeTable changes={item.changes} />
            </div>
          )}
          {metadata.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Additional metadata</p>
              <div className="space-y-2">
                {metadata.map(([key, value]) => (
                  <DetailRow key={key} label={key} value={displayValue(value)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
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
  value: number;
  icon: React.ReactNode;
  color: "blue" | "indigo" | "emerald" | "rose";
  label: string;
}) => {
  const styles = {
    blue: "border-blue-200 bg-gradient-to-br from-blue-50 via-white to-white text-blue-700",
    indigo: "border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-white text-indigo-700",
    emerald: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white text-emerald-700",
    rose: "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-white text-rose-700",
  };
  return (
    <div className={`rounded-2xl border p-3.5 shadow-2xs sm:p-5 ${styles[color]}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider sm:text-xs">{title}</span>
        <span className="rounded-xl bg-white/80 p-1.5">{icon}</span>
      </div>
      <p className="text-lg font-extrabold tracking-tight text-slate-950 sm:text-2xl">{value.toLocaleString()}</p>
      <p className="mt-1 text-[10px] font-semibold sm:text-[11px]">{label}</p>
    </div>
  );
};

export default ActivityTimelineScreen;
