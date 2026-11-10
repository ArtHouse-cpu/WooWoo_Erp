import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Globe,
  LayoutGrid,
  Link2,
  List,
  Loader2,
  Mail,
  Phone,
  Search,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import Swal from "sweetalert2";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import ApproveHapModal from "../components/ApproveHapModal";
import {
  handleDeleteHapApplication,
  handleGetHapApplications,
  handleReviewHapApplication,
  type HapApplicationRecord,
} from "@/services/apiClient";

type StatusFilter = "under_review" | "approved" | "rejected";

type ApplicationRow = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  profession: string;
  networkSize: string;
  payoutDetail: string;
  presence: string;
  status: StatusFilter;
  avatarInitials: string;
  avatarBg: string;
  avatarText: string;
  avatarBorder: string;
  submittedAt: string;
};

const PALETTES = [
  { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
  { bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-200" },
  { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
];

const REJECTION_REASONS = [
  "Incomplete application details",
  "Profession or network size could not be verified",
  "Invalid UPI ID or account number",
  "Website or social profile is not accessible",
  "Duplicate application",
  "Other",
];

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "under_review", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || "H").slice(0, 2).toUpperCase();
}

function mapRow(row: HapApplicationRecord, index: number): ApplicationRow {
  const name = row.customerName || "Applicant";
  const palette = PALETTES[index % PALETTES.length];
  const created = row.createdAt ? new Date(row.createdAt) : null;
  return {
    id: row._id,
    name,
    email: row.email || "",
    phoneNumber: row.mobile || "",
    profession: row.profession || "",
    networkSize: row.networkSize ? String(row.networkSize) : "",
    payoutDetail: row.payoutDetail || "",
    presence: row.presence || "",
    status:
      row.status === "approved" || row.status === "rejected"
        ? row.status
        : "under_review",
    avatarInitials: initials(name),
    avatarBg: palette.bg,
    avatarText: palette.text,
    avatarBorder: palette.border,
    submittedAt:
      created && !Number.isNaN(created.getTime())
        ? created.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "",
  };
}

export default function HapScreen() {
  const [status, setStatus] = useState<StatusFilter>("under_review");
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [approveTarget, setApproveTarget] = useState<ApplicationRow | null>(null);
  const [rejectApp, setRejectApp] = useState<ApplicationRow | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async (next = status) => {
    setLoading(true);
    try {
      const res = await handleGetHapApplications(next);
      const list = Array.isArray(res.applications) ? res.applications : [];
      setRows(list.map(mapRow));
    } catch (error) {
      console.error("Failed to load HAP applications:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.name, row.email, row.phoneNumber, row.profession, row.payoutDetail, row.presence]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [rows, search]);

  const approve = async () => {
    if (!approveTarget) return;
    setBusy(true);
    try {
      await handleReviewHapApplication(approveTarget.id, { status: "approved" });
      setApproveTarget(null);
      await load();
      await Swal.fire({
        icon: "success",
        title: "Approved",
        text: `${approveTarget.name} is now a House Affiliate.`,
        confirmButtonColor: "#7C3AED",
      });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not approve this application.";
      await Swal.fire({ icon: "error", title: "Not approved", text: message });
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!rejectApp || !reason) return;
    const rejectionReason = notes.trim() ? `${reason}. ${notes.trim()}` : reason;
    setBusy(true);
    try {
      await handleReviewHapApplication(rejectApp.id, {
        status: "rejected",
        rejectionReason,
      });
      setRejectApp(null);
      setReason("");
      setNotes("");
      await load();
      await Swal.fire({
        icon: "success",
        title: "Application rejected",
        confirmButtonColor: "#7C3AED",
      });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not reject this application.";
      await Swal.fire({ icon: "error", title: "Not rejected", text: message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: ApplicationRow) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete this application?",
      text: `${row.name} will be removed from HAP applications.`,
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#e11d48",
    });
    if (!result.isConfirmed) return;
    try {
      await handleDeleteHapApplication(row.id);
      await load();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not delete this application.";
      await Swal.fire({ icon: "error", title: "Not deleted", text: message });
    }
  };

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">House Affiliate Program</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or details"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-500"
            />
          </div>
          <div className="hidden sm:flex items-center rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                viewMode === "cards"
                  ? "bg-violet-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Cards View"
            >
              <LayoutGrid size={14} />
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                viewMode === "table"
                  ? "bg-violet-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Table View"
            >
              <List size={14} />
              Table
            </button>
          </div>
        </div>
      </div>

      <div className="mb-3 flex gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setStatus(item.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer ${
              status === item.id
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Cards View (default on desktop, always on mobile) */}
      {(viewMode === "cards" || !loading) && (
        <div className={viewMode === "cards" ? "block" : "block md:hidden"}>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl border border-slate-200/80 bg-white p-4"
                />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center text-slate-400">
              <Users className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-600">
                No applications found
              </p>
              <p className="mt-0.5 text-xs">
                {search
                  ? "Try clearing your search."
                  : "No HAP applications in this list."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {visible.map((app, index) => (
                <div
                  key={app.id}
                  onClick={() => setApproveTarget(app)}
                  className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs transition hover:shadow-md hover:border-violet-300 active:scale-[0.99] flex flex-col justify-between gap-3.5"
                >
                  {/* Card Top: Avatar, Name, Email, Status Badge, Index */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-xs font-black shadow-2xs ${app.avatarBg} ${app.avatarText} ${app.avatarBorder}`}
                      >
                        {app.avatarInitials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="truncate text-sm sm:text-base font-bold text-slate-900">
                            {app.name}
                          </h3>
                          <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-500">
                            #{index + 1}
                          </span>
                        </div>
                        {app.email ? (
                          <p className="flex items-center gap-1 text-xs text-slate-500 truncate mt-0.5">
                            <Mail size={12} className="shrink-0 text-slate-400" />
                            <span className="truncate">{app.email}</span>
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5">No email provided</p>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                        app.status === "approved"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : app.status === "rejected"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          app.status === "approved"
                            ? "bg-emerald-500"
                            : app.status === "rejected"
                              ? "bg-rose-500"
                              : "bg-amber-500"
                        }`}
                      />
                      {app.status === "under_review" ? "Pending" : app.status}
                    </span>
                  </div>

                  {/* Details Grid (Table Details in Card Form) */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Phone */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <Phone size={11} className="text-slate-400" />
                        Phone
                      </div>
                      <span className="font-semibold text-slate-800 truncate block mt-1">
                        {app.phoneNumber || "—"}
                      </span>
                    </div>

                    {/* Profession */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <Briefcase size={11} className="text-slate-400" />
                        Profession
                      </div>
                      <span className="font-semibold text-slate-800 truncate block mt-1">
                        {app.profession || "—"}
                      </span>
                    </div>

                    {/* Network Size */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <Users size={11} className="text-slate-400" />
                        Network Size
                      </div>
                      <span className="font-semibold text-slate-800 truncate block mt-1">
                        {app.networkSize ? `${app.networkSize} connections` : "—"}
                      </span>
                    </div>

                    {/* UPI / Payout */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <CreditCard size={11} className="text-slate-400" />
                        UPI / Account
                      </div>
                      <span className="font-semibold text-slate-800 truncate block mt-1" title={app.payoutDetail}>
                        {app.payoutDetail || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Website / Social Presence */}
                  {app.presence && (
                    <div className="flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-2 text-xs">
                      <Globe size={13} className="text-violet-600 shrink-0" />
                      <span className="text-slate-500 font-medium shrink-0">Website / Social:</span>
                      <a
                        href={app.presence.startsWith("http") ? app.presence : `https://${app.presence}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-violet-700 hover:underline truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {app.presence}
                      </a>
                    </div>
                  )}

                  {/* Card Bottom: Submitted Date & Actions */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
                      {app.submittedAt ? `Applied ${app.submittedAt}` : "—"}
                    </div>

                    <Can
                      anyOf={[
                        PERMISSIONS.AFFILIATE_MANAGE,
                        PERMISSIONS.CUSTOMER_UPDATE,
                        PERMISSIONS.CSP_WRITE,
                      ]}
                    >
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {app.status === "under_review" && (
                          <>
                            <button
                              type="button"
                              onClick={() => setApproveTarget(app)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-2xs active:scale-95 cursor-pointer"
                            >
                              <CheckCircle2 size={13} />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectApp(app);
                                setReason("");
                                setNotes("");
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 transition shadow-2xs active:scale-95 cursor-pointer"
                            >
                              <XCircle size={13} />
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => void remove(app)}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition active:scale-95 cursor-pointer"
                          title="Delete application"
                          aria-label="Delete application"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Can>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table View (When Table view is toggled, hidden on mobile) */}
      {viewMode === "table" && (
        <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-600">
                  <th className="w-12 px-4 py-3.5 text-center">#</th>
                  <th className="px-4 py-3.5">Name</th>
                  <th className="px-4 py-3.5">Phone</th>
                  <th className="px-4 py-3.5">Profession</th>
                  <th className="px-4 py-3.5">Network</th>
                  <th className="px-4 py-3.5">UPI / account</th>
                  <th className="px-4 py-3.5">Website / social</th>
                  <th className="px-4 py-3.5 text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-400">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-500" />
                    </td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-400">
                      <Users className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-2 text-sm font-semibold text-slate-600">
                        No applications found
                      </p>
                      <p className="mt-0.5 text-xs">
                        {search
                          ? "Try clearing your search."
                          : "No HAP applications in this list."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  visible.map((app, index) => (
                    <tr key={app.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3.5 text-center text-xs text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${app.avatarBg} ${app.avatarText} ${app.avatarBorder}`}
                          >
                            {app.avatarInitials}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{app.name}</div>
                            <div className="text-xs text-slate-400">{app.email || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">
                        {app.phoneNumber || "—"}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">{app.profession}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">{app.networkSize}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">{app.payoutDetail}</td>
                      <td className="max-w-[180px] truncate px-4 py-3.5 font-medium text-violet-700">
                        {app.presence}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Can
                          anyOf={[
                            PERMISSIONS.AFFILIATE_MANAGE,
                            PERMISSIONS.CUSTOMER_UPDATE,
                            PERMISSIONS.CSP_WRITE,
                          ]}
                        >
                          <div className="inline-flex items-center gap-2">
                            {app.status === "under_review" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setApproveTarget(app)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectApp(app);
                                    setReason("");
                                    setNotes("");
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Reject
                                </button>
                              </>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => void remove(app)}
                              className="inline-flex items-center rounded-lg border border-slate-200 px-2 py-1.5 text-slate-500 hover:bg-slate-50"
                              aria-label="Delete application"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </Can>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ApproveHapModal
        isOpen={Boolean(approveTarget)}
        application={approveTarget}
        onClose={() => setApproveTarget(null)}
        onApprove={() => void approve()}
        onReject={() => {
          if (!approveTarget) return;
          setRejectApp(approveTarget);
          setApproveTarget(null);
          setReason("");
          setNotes("");
        }}
      />

      {rejectApp ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-100 bg-rose-50 text-rose-500">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reject Application</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    A reason is saved on the customer application.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectApp(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">{rejectApp.name}</div>
                <div className="text-xs text-slate-500">{rejectApp.profession}</div>
              </div>
              <span className="inline-flex max-w-[46%] items-center gap-1 truncate text-xs font-medium text-violet-700">
                <Link2 className="h-3 w-3 shrink-0" />
                {rejectApp.presence}
              </span>
            </div>

            <label className="mt-4 block text-xs font-semibold text-slate-700">
              Reason for rejection
            </label>
            <div className="relative mt-1.5">
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-10 text-sm"
              >
                <option value="">Select a reason</option>
                {REJECTION_REASONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            <label className="mt-3 block text-xs font-semibold text-slate-700">
              Additional notes
            </label>
            <textarea
              maxLength={200}
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm"
              placeholder="Optional details"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectApp(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reason || busy}
                onClick={() => void reject()}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Reject Application
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
