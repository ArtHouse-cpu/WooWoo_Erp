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
  Users,
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
  if (period === "last_month") {
    const first = new Date(startOfToday.getFullYear(), startOfToday.getMonth() - 1, 1);
    const last = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 0);
    return { start: toYmd(first), end: toYmd(last) };
  }
  return { start: "", end: "" };
};

const DATE_PRESETS = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom" },
];

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

const actionLabel = (action: string, failed: boolean) => {
  if (failed) return "Failed";
  const labels: Record<string, string> = {
    CREATE: "Created",
    UPDATE: "Updated",
    DELETE: "Deleted",
    PAYMENT: "Paid",
    LOGIN: "Login",
    LOGOUT: "Logout",
    APPROVE: "Approved",
    CANCEL: "Cancelled",
    REFUND: "Refunded",
  };
  return labels[action] || action;
};

const formatInr = (amount?: number | null) => {
  if (amount == null || !Number.isFinite(Number(amount)) || Number(amount) === 0) return "";
  return `₹${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
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
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    activeUsers: 0,
    created: 0,
    updated: 0,
    payments: 0,
  });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState<"" | "success" | "failure">("");
  const [source, setSource] = useState("");
  const [transactionType, setTransactionType] = useState("");
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
      source,
      transactionType,
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
        setStats(
          summary.stats || {
            total: 0,
            today: 0,
            activeUsers: 0,
            created: 0,
            updated: 0,
            payments: 0,
          },
        );
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
    source,
    transactionType,
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
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6 xl:gap-3">
        <StatCard title="Total" value={stats.total} color="blue" icon={<Activity size={18} />} label="Matching filters" />
        <StatCard title="Today" value={stats.today} color="indigo" icon={<Calendar size={18} />} label="Since midnight" />
        <StatCard title="Active users" value={stats.activeUsers} color="amber" icon={<Users size={18} />} label="Users active today" />
        <StatCard title="Created" value={stats.created} color="emerald" icon={<Plus size={18} />} label="Create actions" />
        <StatCard title="Updated" value={stats.updated} color="blue" icon={<Pencil size={18} />} label="Update actions" />
        <StatCard title="Payments" value={stats.payments} color="rose" icon={<Wallet size={18} />} label="Payment activity" />
      </div>

      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto">
        <FilterSelect value={datePreset} onChange={applyPreset} className="w-32">
          {DATE_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>{preset.label}</option>
          ))}
        </FilterSelect>
        {datePreset === "custom" && (
          <div className="flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5">
            <input
              type="date"
              value={dateRange.start}
              onChange={(event) => {
                setDateRange((current) => ({ ...current, start: event.target.value }));
                setPage(1);
              }}
              className="bg-transparent text-[11px] text-slate-700 outline-none"
            />
            <span className="text-[11px] text-slate-400">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(event) => {
                setDateRange((current) => ({ ...current, end: event.target.value }));
                setPage(1);
              }}
              className="bg-transparent text-[11px] text-slate-700 outline-none"
            />
          </div>
        )}
        <label className="relative w-44 shrink-0">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            className="w-full rounded-md border border-slate-200 bg-white py-1 pl-7 pr-2 text-[11px] outline-none focus:border-indigo-300"
          />
        </label>
        <FilterSelect value={moduleName} onChange={(value) => { setModuleName(value); setPage(1); }}>
          <option value="">All modules</option>
          {modules.map((name) => <option key={name} value={name}>{name}</option>)}
        </FilterSelect>
        <FilterSelect value={userId} onChange={(value) => { setUserId(value); setPage(1); }}>
          <option value="">All users</option>
          {users.map((user) => (
            <option key={user._id} value={user._id}>{user.userName || user.userEmail || "Staff"}</option>
          ))}
        </FilterSelect>
        <FilterSelect value={action} onChange={(value) => { setAction(value); setPage(1); }}>
          <option value="">All actions</option>
          {ACTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
        </FilterSelect>
        <FilterSelect value={status} onChange={(value) => { setStatus(value as "" | "success" | "failure"); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="failure">Failed</option>
        </FilterSelect>
        <FilterSelect value={source} onChange={(value) => { setSource(value); setPage(1); }}>
          <option value="">All sources</option>
          <option value="Web">Web</option>
          <option value="POS">POS</option>
          <option value="Mobile">Mobile</option>
          <option value="Customer Portal">Customer Portal</option>
          <option value="System">System</option>
        </FilterSelect>
        <FilterSelect value={transactionType} onChange={(value) => { setTransactionType(value); setPage(1); }}>
          <option value="">All types</option>
          <option value="payment">Payment</option>
          <option value="refund">Refund</option>
          <option value="wallet">Wallet</option>
          <option value="booking">Booking</option>
          <option value="membership">Membership</option>
          <option value="inventory">Inventory</option>
        </FilterSelect>
        <FilterSelect value={sort} onChange={(value) => { setSort(value as "newest" | "oldest"); setPage(1); }}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </FilterSelect>
        <button
          type="button"
          onClick={() => setReloadToken((token) => token + 1)}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
        <p className="shrink-0 text-[11px] font-medium text-slate-500">{total.toLocaleString()}</p>
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
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{item.userRole || item.actorType}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${actionStyle(item.action, failed)}`}>
                              {actionLabel(item.action, failed)}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                              <ModuleIcon module={item.module} />
                              {item.module}
                            </span>
                          </span>
                          <span className="mt-1 block text-sm text-slate-700">{item.description || `${item.action} ${item.module}`}</span>
                          <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span>{item.resourceName || item.resourceType || "No resource"}</span>
                            {formatInr(item.amount) ? <span className="font-semibold text-slate-700">{formatInr(item.amount)}</span> : null}
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
  value,
  onChange,
  className = "w-28",
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  children: ReactNode;
}) => (
  <select
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className={`${className} shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-800 outline-none`}
  >
    {children}
  </select>
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
              <p className="text-xs text-slate-500">
                {[item.userRole || item.actorType, item.userEmail].filter(Boolean).join(" · ") || "No email"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DetailRow label="Module" value={item.module} />
            <DetailRow label="Action" value={failed ? `${item.action} · Failed` : item.action} />
            <DetailRow label="Date and time" value={formatDateTime(item.createdAt)} />
            <DetailRow label="Role" value={item.userRole || item.actorType} />
            <DetailRow label="Source" value={item.source} />
            <DetailRow label="Resource" value={item.resourceName} />
            <DetailRow label="Resource ID" value={item.resourceId} />
            <DetailRow label="Customer / vendor" value={item.relatedName} />
            <DetailRow label="Amount" value={formatInr(item.amount) || undefined} />
            <DetailRow label="HTTP method" value={item.method} />
            <DetailRow label="IP address" value={item.ipAddress} />
          </div>
          <DetailRow label="API endpoint" value={item.endpoint} />
          <DetailRow label="Request ID" value={item.requestId} />
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
  color: "blue" | "indigo" | "emerald" | "rose" | "amber";
  label: string;
}) => {
  const styles = {
    blue: "border-blue-200 bg-gradient-to-br from-blue-50 via-white to-white text-blue-700",
    indigo: "border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-white text-indigo-700",
    emerald: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white text-emerald-700",
    rose: "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-white text-rose-700",
    amber: "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white text-amber-700",
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
