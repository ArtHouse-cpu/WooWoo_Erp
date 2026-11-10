import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
} from "material-react-table";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Megaphone,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
} from "lucide-react";
import Swal from "sweetalert2";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import { handleGetAnnouncements } from "@/services/apiClient";
import SendAnnouncementModal from "./components/SendAnnouncementModal";

type AnnouncementStatus = "completed" | "pending" | "failed" | "sending";
type AnnouncementType = "Selected" | "All" | "Exhibition";

type AnnouncementRow = {
  id: string;
  templateName: string;
  type: AnnouncementType;
  status: AnnouncementStatus;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  completedAt: string | null;
  createdAt: string;
  lastError?: string;
};

const STATUS_FILTERS = [
  "All",
  "completed",
  "pending",
  "failed",
  "sending",
] as const;

function mapAudienceType(value: unknown): AnnouncementType {
  const type = String(value ?? "").toLowerCase();
  if (type === "selected") return "Selected";
  if (type === "exhibition") return "Exhibition";
  return "All";
}

function mapStatus(value: unknown): AnnouncementStatus {
  const s = String(value ?? "pending").toLowerCase();
  if (s === "completed" || s === "failed" || s === "sending" || s === "pending") {
    return s;
  }
  return "pending";
}

function mapAnnouncement(doc: Record<string, unknown>): AnnouncementRow {
  return {
    id: String(doc._id ?? doc.id ?? ""),
    templateName: String(doc.templateName ?? "—"),
    type: mapAudienceType(doc.audienceType),
    status: mapStatus(doc.status),
    totalRecipients: Number(doc.totalRecipients ?? 0) || 0,
    sentCount: Number(doc.sentCount ?? 0) || 0,
    failedCount: Number(doc.failedCount ?? 0) || 0,
    completedAt: doc.completedAt ? String(doc.completedAt) : null,
    createdAt: String(doc.createdAt ?? ""),
    lastError: doc.lastError ? String(doc.lastError) : "",
  };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function StatusPill({ status }: { status: AnnouncementStatus }) {
  const map: Record<
    AnnouncementStatus,
    { label: string; className: string; dot: string }
  > = {
    completed: {
      label: "Completed",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      dot: "bg-emerald-500",
    },
    pending: {
      label: "Pending",
      className: "bg-amber-50 text-amber-700 ring-amber-100",
      dot: "bg-amber-500",
    },
    failed: {
      label: "Failed",
      className: "bg-rose-50 text-rose-700 ring-rose-100",
      dot: "bg-rose-500",
    },
    sending: {
      label: "Sending",
      className: "bg-sky-50 text-sky-700 ring-sky-100",
      dot: "bg-sky-500",
    },
  };
  const style = map[status] ?? map.pending;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${style.className}`}
    >
      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

function TypePill({ type }: { type: AnnouncementType }) {
  const map: Record<AnnouncementType, string> = {
    All: "bg-green-50 text-green-700 ring-green-100",
    Selected: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    Exhibition: "bg-amber-50 text-amber-700 ring-amber-100",
  };
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${map[type]}`}
    >
      {type}
    </span>
  );
}

function ProgressCell({ row }: { row: AnnouncementRow }) {
  const total = Math.max(0, Number(row.totalRecipients) || 0);
  const sent = Math.max(0, Number(row.sentCount) || 0);
  const failed = Math.max(0, Number(row.failedCount) || 0);
  const processed = Math.min(total, sent + failed);
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
  const sentPercent = total > 0 ? Math.round((sent / total) * 100) : 0;
  const failedPercent = total > 0 ? Math.round((failed / total) * 100) : 0;

  const barColor =
    row.status === "failed"
      ? "bg-rose-500"
      : row.status === "pending"
        ? "bg-amber-400"
        : row.status === "sending"
          ? "bg-sky-500"
          : "bg-emerald-500";

  return (
    <div className="min-w-[160px] py-1">
      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-600">
        <span>
          {sent}/{total} sent
        </span>
        <span className="font-semibold text-slate-800">{percent}%</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${sentPercent}%` }}
        />
        {failedPercent > 0 ? (
          <div
            className="h-full bg-rose-400 transition-all"
            style={{ width: `${failedPercent}%` }}
          />
        ) : null}
      </div>
      <div className="mt-1 flex justify-between text-[11px]">
        <span className="text-emerald-600">{sentPercent}% delivered</span>
        {failed > 0 ? (
          <span className="text-rose-600">{failed} failed</span>
        ) : (
          <span className="text-slate-400">0 failed</span>
        )}
      </div>
    </div>
  );
}

export default function AnnouncementScreen() {
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>("All");
  const [loading, setLoading] = useState(false);
  const [openSendModal, setOpenSendModal] = useState(false);

  const completedCount = useMemo(
    () => rows.filter((r) => r.status === "completed").length,
    [rows],
  );
  const pendingCount = useMemo(
    () => rows.filter((r) => r.status === "pending").length,
    [rows],
  );
  const failedCount = useMemo(
    () => rows.filter((r) => r.status === "failed").length,
    [rows],
  );
  const sendingCount = useMemo(
    () => rows.filter((r) => r.status === "sending").length,
    [rows],
  );

  const handleToggleKpi = (status: AnnouncementStatus) => {
    setStatusFilter((prev) => (prev === status ? "All" : status));
  };

  const fetchAnnouncements = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const res = await handleGetAnnouncements(signal);
      const list = Array.isArray(res?.announcements) ? res.announcements : [];
      setRows(list.map((item: Record<string, unknown>) => mapAnnouncement(item)));
    } catch {
      if (!signal?.aborted) setRows([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchAnnouncements(controller.signal);
    return () => controller.abort();
  }, [fetchAnnouncements]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const statusOk = statusFilter === "All" || row.status === statusFilter;
      if (!statusOk) return false;
      if (!q) return true;
      return (
        row.templateName.toLowerCase().includes(q) ||
        row.type.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  const viewDetails = (row: AnnouncementRow) => {
    Swal.fire({
      title: row.templateName,
      html: `
        <div style="text-align:left;font-size:13px;line-height:1.6">
          <div><b>Type:</b> ${row.type}</div>
          <div><b>Status:</b> ${row.status}</div>
          <div><b>Recipients:</b> ${row.totalRecipients}</div>
          <div><b>Sent:</b> ${row.sentCount}</div>
          <div><b>Failed:</b> ${row.failedCount}</div>
          <div><b>Completed:</b> ${formatDateTime(row.completedAt)}</div>
          <div><b>Created:</b> ${formatDateTime(row.createdAt)}</div>
          ${row.lastError ? `<div><b>Last error:</b> ${row.lastError}</div>` : ""}
        </div>
      `,
      confirmButtonText: "Close",
    });
  };

  const retrySend = async (row: AnnouncementRow) => {
    const result = await Swal.fire({
      title: "Retry failed send?",
      text: `Retry "${row.templateName}" for failed recipients.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Retry",
    });
    if (!result.isConfirmed) return;
    Swal.fire("Coming soon", "Retry API is not wired yet.", "info");
  };

  const columns = useMemo<MRT_ColumnDef<AnnouncementRow>[]>(
    () => [
      {
        accessorKey: "templateName",
        header: "Template Name",
        size: 220,
        Cell: ({ row }: { row: MRT_Row<AnnouncementRow> }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900">
              {row.original.templateName}
            </span>
            <span className="text-[11px] text-slate-400">{row.original.id}</span>
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        size: 120,
        Cell: ({ row }: { row: MRT_Row<AnnouncementRow> }) => (
          <TypePill type={row.original.type} />
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 130,
        filterVariant: "select",
        filterSelectOptions: ["completed", "pending", "failed", "sending"],
        Cell: ({ row }: { row: MRT_Row<AnnouncementRow> }) => (
          <StatusPill status={row.original.status} />
        ),
      },
      {
        id: "progress",
        header: "Progress",
        size: 220,
        enableSorting: false,
        accessorFn: (row) => {
          const total = Math.max(1, row.totalRecipients);
          return ((row.sentCount + row.failedCount) / total) * 100;
        },
        Cell: ({ row }: { row: MRT_Row<AnnouncementRow> }) => (
          <ProgressCell row={row.original} />
        ),
      },
      {
        id: "completedAt",
        header: "Sent At",
        size: 200,
        accessorFn: (row) => row.completedAt || row.createdAt,
        Cell: ({ row }: { row: MRT_Row<AnnouncementRow> }) => {
          const label =
            row.original.status === "failed"
              ? "Failed"
              : row.original.status === "completed"
                ? "Sent"
                : row.original.status === "sending"
                  ? "In progress"
                  : "Scheduled";
          const value =
            row.original.completedAt ||
            (row.original.status === "pending" ||
            row.original.status === "sending"
              ? row.original.createdAt
              : null);
          return (
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-500">
                {label}
              </span>
              <span className="text-sm text-slate-800">
                {formatDateTime(value)}
              </span>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Action",
        size: 140,
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }: { row: MRT_Row<AnnouncementRow> }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              title="View details"
              onClick={() => viewDetails(row.original)}
              className="rounded-lg bg-indigo-50 p-2 text-indigo-700 hover:bg-indigo-100"
            >
              <Eye size={16} />
            </button>
            {(row.original.status === "failed" ||
              row.original.failedCount > 0) && (
              <button
                type="button"
                title="Retry failed"
                onClick={() => void retrySend(row.original)}
                className="rounded-lg bg-amber-50 p-2 text-amber-700 hover:bg-amber-100"
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  const table = useMaterialReactTable<AnnouncementRow>({
    columns,
    data: filteredRows,
    state: { isLoading: loading },
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    initialState: {
      density: "comfortable",
      sorting: [{ id: "completedAt", desc: true }],
    },
    muiTablePaperProps: {
      elevation: 0,
      style: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        overflow: "hidden",
      },
    },
  });

  return (
    <div className="space-y-4 p-2 sm:p-3">
      {/* Header: Title on left, + Create button parallel in the same line on right */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900">
          Announcements
        </h1>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void fetchAnnouncements()}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-blue-600" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Can permission={PERMISSIONS.ANNOUNCEMENT_CREATE}>
            <button
              type="button"
              onClick={() => setOpenSendModal(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
            >
              <Plus size={15} />
              <span>+ Create</span>
            </button>
          </Can>
        </div>
      </div>

      {/* KPI Cards: Completed, Pending, Failed, Sending */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Completed Card */}
        <button
          type="button"
          onClick={() => handleToggleKpi("completed")}
          className={`flex items-center gap-2.5 sm:gap-3.5 rounded-2xl border p-2.5 sm:p-3 text-left transition-all duration-200 cursor-pointer ${
            statusFilter === "completed"
              ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-400/30 shadow-xs"
              : "border-slate-200/90 bg-white hover:border-emerald-200 hover:bg-emerald-50/30 hover:shadow-xs"
          }`}
        >
          <div
            className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
              statusFilter === "completed"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-600"
            }`}
          >
            <CheckCircle2 size={18} className="sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base sm:text-lg font-bold tracking-tight text-emerald-950 leading-none">
              {loading && rows.length === 0
                ? "..."
                : completedCount.toLocaleString("en-IN")}
            </div>
            <div className="mt-1 text-[11px] sm:text-xs font-semibold text-emerald-700/80 truncate">
              Completed
            </div>
          </div>
        </button>

        {/* Pending Card */}
        <button
          type="button"
          onClick={() => handleToggleKpi("pending")}
          className={`flex items-center gap-2.5 sm:gap-3.5 rounded-2xl border p-2.5 sm:p-3 text-left transition-all duration-200 cursor-pointer ${
            statusFilter === "pending"
              ? "border-amber-500 bg-amber-50/80 ring-2 ring-amber-400/30 shadow-xs"
              : "border-slate-200/90 bg-white hover:border-amber-200 hover:bg-amber-50/30 hover:shadow-xs"
          }`}
        >
          <div
            className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
              statusFilter === "pending"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-600"
            }`}
          >
            <Clock size={18} className="sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base sm:text-lg font-bold tracking-tight text-amber-950 leading-none">
              {loading && rows.length === 0
                ? "..."
                : pendingCount.toLocaleString("en-IN")}
            </div>
            <div className="mt-1 text-[11px] sm:text-xs font-semibold text-amber-700/80 truncate">
              Pending
            </div>
          </div>
        </button>

        {/* Failed Card */}
        <button
          type="button"
          onClick={() => handleToggleKpi("failed")}
          className={`flex items-center gap-2.5 sm:gap-3.5 rounded-2xl border p-2.5 sm:p-3 text-left transition-all duration-200 cursor-pointer ${
            statusFilter === "failed"
              ? "border-rose-500 bg-rose-50/80 ring-2 ring-rose-400/30 shadow-xs"
              : "border-slate-200/90 bg-white hover:border-rose-200 hover:bg-rose-50/30 hover:shadow-xs"
          }`}
        >
          <div
            className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
              statusFilter === "failed"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-50 text-rose-600"
            }`}
          >
            <AlertCircle size={18} className="sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base sm:text-lg font-bold tracking-tight text-rose-950 leading-none">
              {loading && rows.length === 0
                ? "..."
                : failedCount.toLocaleString("en-IN")}
            </div>
            <div className="mt-1 text-[11px] sm:text-xs font-semibold text-rose-700/80 truncate">
              Failed
            </div>
          </div>
        </button>

        {/* Sending Card */}
        <button
          type="button"
          onClick={() => handleToggleKpi("sending")}
          className={`flex items-center gap-2.5 sm:gap-3.5 rounded-2xl border p-2.5 sm:p-3 text-left transition-all duration-200 cursor-pointer ${
            statusFilter === "sending"
              ? "border-blue-500 bg-blue-50/80 ring-2 ring-blue-400/30 shadow-xs"
              : "border-slate-200/90 bg-white hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-xs"
          }`}
        >
          <div
            className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
              statusFilter === "sending"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-blue-50 text-blue-600"
            }`}
          >
            <Send size={18} className="sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-none">
              {loading && rows.length === 0
                ? "..."
                : sendingCount.toLocaleString("en-IN")}
            </div>
            <div className="mt-1 text-[11px] sm:text-xs font-semibold text-slate-500 truncate">
              Sending
            </div>
          </div>
        </button>
      </div>

      {/* Search and Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative min-w-0 w-full flex-1 sm:max-w-sm">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search template, type, status..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs sm:text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {STATUS_FILTERS.map((status) => {
            const active = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize whitespace-nowrap transition cursor-pointer ${
                  active
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop View: Table Form only */}
      <div className="hidden md:block">
        <MaterialReactTable table={table} />
      </div>

      {/* Mobile View: Card Form only */}
      <div className="block md:hidden space-y-2.5">
        {loading && rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-2 text-xs font-semibold">Loading announcements...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <Megaphone className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-xs font-semibold text-slate-700">No announcements found</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {search || statusFilter !== "All"
                ? "Try adjusting your search or filters"
                : "Create your first announcement to get started"}
            </p>
          </div>
        ) : (
          filteredRows.map((row) => {
            const total = Math.max(0, Number(row.totalRecipients) || 0);
            const sent = Math.max(0, Number(row.sentCount) || 0);
            const failed = Math.max(0, Number(row.failedCount) || 0);
            const processed = Math.min(total, sent + failed);
            const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
            const sentPercent = total > 0 ? Math.round((sent / total) * 100) : 0;
            const failedPercent = total > 0 ? Math.round((failed / total) * 100) : 0;

            const barColor =
              row.status === "failed"
                ? "bg-rose-500"
                : row.status === "pending"
                ? "bg-amber-400"
                : row.status === "sending"
                ? "bg-sky-500"
                : "bg-emerald-500";

            return (
              <div
                key={row.id}
                onClick={() => viewDetails(row)}
                className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs space-y-2.5 transition hover:border-slate-300 cursor-pointer"
              >
                {/* Top Row: Template Name + Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 leading-snug truncate">
                      {row.templateName}
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5 truncate">
                      {row.id}
                    </span>
                  </div>
                  <div className="shrink-0">
                    <StatusPill status={row.status} />
                  </div>
                </div>

                {/* Second Row: Type badge + Action buttons */}
                <div className="flex items-center justify-between gap-2">
                  <TypePill type={row.type} />

                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      title="View details"
                      onClick={() => viewDetails(row)}
                      className="rounded-lg bg-indigo-50 p-1.5 text-indigo-700 hover:bg-indigo-100 transition"
                    >
                      <Eye size={15} />
                    </button>
                    {(row.status === "failed" || row.failedCount > 0) && (
                      <button
                        type="button"
                        title="Retry failed"
                        onClick={() => void retrySend(row)}
                        className="rounded-lg bg-amber-50 p-1.5 text-amber-700 hover:bg-amber-100 transition"
                      >
                        <RotateCcw size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Delivery Progress Box */}
                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-700 mb-1.5">
                    <span className="font-semibold">Delivery Progress</span>
                    <span className="font-bold tabular-nums text-slate-900">{percent}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="flex h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full ${barColor} transition-all`}
                      style={{ width: `${sentPercent}%` }}
                    />
                    {failedPercent > 0 && (
                      <div
                        className="h-full bg-rose-400 transition-all"
                        style={{ width: `${failedPercent}%` }}
                      />
                    )}
                  </div>

                  {/* Sent vs Failed count details */}
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-600">
                    <span className="font-medium text-emerald-700">
                      ✓ {sent}/{total} sent
                    </span>
                    {failed > 0 ? (
                      <span className="font-medium text-rose-600">
                        ✕ {failed} failed
                      </span>
                    ) : (
                      <span className="text-slate-400">0 failed</span>
                    )}
                  </div>
                </div>

                {/* Footer: Sent / Created Date */}
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 pt-0.5">
                  <span className="text-slate-400 uppercase font-semibold text-[9px]">
                    {row.status === "failed"
                      ? "Failed At"
                      : row.status === "completed"
                      ? "Sent At"
                      : "Created At"}
                  </span>
                  <span className="font-medium text-slate-700">
                    {formatDateTime(row.completedAt || row.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <SendAnnouncementModal
        open={openSendModal}
        onClose={() => setOpenSendModal(false)}
        onSent={() => void fetchAnnouncements()}
      />
    </div>
  );
}
