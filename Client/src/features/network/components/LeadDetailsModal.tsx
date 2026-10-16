import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Phone,
  Calendar,
  Tag,
  FileText,
  User,
  Bookmark,
  UserCheck,
  Paperclip,
  Eye,
  File,
  ExternalLink,
  Globe,
  Plus,
  Star,
  CheckCircle2,
  MessageCircle,
  Clock,
  MapPin,
  Handshake,
  CalendarClock,
  Ban,
  Circle,
  Hash,
} from "lucide-react";
import {
  handleAddLeadTimeline,
  type LeadItem,
  type LeadStatus,
  type LeadTimelineEvent,
} from "@/services/apiClient";
import LeadMembershipBadge from "./LeadMembershipBadge";

type LeadDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadItem | null;
  onEdit?: (lead: LeadItem) => void;
  onUpdated?: (lead: LeadItem) => void;
};

const PIPELINE = ["New", "Contacted", "Interested", "Proposal", "Converted"] as const;

const STATUS_CHOICES: Array<{
  value: LeadStatus;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  className: string;
}> = [
  { value: "New", icon: Circle, className: "border-slate-200 bg-white text-slate-700" },
  { value: "Contacted", icon: Phone, className: "border-sky-200 bg-sky-50 text-sky-800" },
  { value: "Interested", icon: Star, className: "border-violet-300 bg-violet-50 text-violet-800" },
  { value: "Contact Tomorrow", icon: Calendar, className: "border-indigo-200 bg-white text-indigo-800" },
  { value: "Contact in 2 Days", icon: CalendarClock, className: "border-indigo-200 bg-white text-indigo-800" },
  { value: "Come for Visit", icon: MapPin, className: "border-slate-200 bg-white text-slate-700" },
  { value: "Shared Quotation", icon: FileText, className: "border-slate-200 bg-white text-slate-700" },
  { value: "Negotiation", icon: Handshake, className: "border-amber-200 bg-amber-50 text-amber-800" },
  { value: "Follow Up (Custom)", icon: Clock, className: "border-amber-200 bg-amber-50 text-amber-800" },
  { value: "Not Interested", icon: Ban, className: "border-rose-200 bg-rose-50 text-rose-700" },
  { value: "Converted", icon: CheckCircle2, className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  { value: "Lost", icon: X, className: "border-rose-200 bg-rose-50 text-rose-700" },
];

const pipelineIndex = (status: string) => {
  if (status === "New") return 0;
  if (
    ["Contacted", "Contact Tomorrow", "Contact in 2 Days", "Come for Visit", "Need to message"].includes(
      status,
    )
  ) {
    return 1;
  }
  if (status === "Interested" || status === "Follow Up (Custom)") return 2;
  if (status === "Shared Quotation" || status === "Negotiation") return 3;
  if (status === "Converted") return 4;
  return -1;
};

const statusTone = (status: string) => {
  if (status === "Converted") return "bg-emerald-100 text-emerald-800";
  if (status === "Interested") return "bg-violet-100 text-violet-800";
  if (status === "Lost" || status === "Not Interested") return "bg-rose-100 text-rose-700";
  if (status === "New") return "bg-violet-100 text-violet-700";
  return "bg-amber-100 text-amber-800";
};

const formatWhen = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDay = (value?: string | null) => {
  if (!value) return "";
  const raw = String(value);
  const date = new Date(raw.includes("T") ? raw : `${raw.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const leadCode = (id?: string) => {
  if (!id) return "";
  if (id.startsWith("LEAD-")) return id;
  return `LEAD-${id.slice(-6).toUpperCase()}`;
};

const visibleEvents = (lead: LeadItem): LeadTimelineEvent[] => {
  const stored = Array.isArray(lead.timeline) ? lead.timeline : [];
  if (stored.length) {
    return [...stored].sort(
      (a, b) => new Date(a.at || 0).getTime() - new Date(b.at || 0).getTime(),
    );
  }
  return [
    {
      type: "created",
      title: "Lead Created",
      status: "New",
      note: lead.source ? `Lead from ${lead.source}` : "",
      at: lead.createdAt || lead.date,
      by: lead.createdBy,
    },
  ];
};

const eventIcon = (event: LeadTimelineEvent) => {
  if (event.type === "created") return { Icon: Plus, wrap: "bg-violet-100 text-violet-600" };
  if (event.status === "Converted") return { Icon: CheckCircle2, wrap: "bg-emerald-100 text-emerald-600" };
  if (event.status === "Contacted" || event.status === "Contact Tomorrow") {
    return { Icon: Phone, wrap: "bg-sky-100 text-sky-600" };
  }
  if (event.status === "Interested") return { Icon: Star, wrap: "bg-amber-100 text-amber-600" };
  return { Icon: MessageCircle, wrap: "bg-emerald-100 text-emerald-600" };
};

const isImageFile = (mimeType?: string, name?: string) => {
  if (mimeType && mimeType.startsWith("image/")) return true;
  if (name && /\.(jpe?g|png|webp|gif|svg|bmp)$/i.test(name)) return true;
  return false;
};

const isVideoFile = (mimeType?: string, name?: string) => {
  if (mimeType && mimeType.startsWith("video/")) return true;
  if (name && /\.(mp4|webm|mov|mkv|avi)$/i.test(name)) return true;
  return false;
};

const isPdfFile = (mimeType?: string, name?: string) => {
  if (mimeType === "application/pdf") return true;
  if (name && /\.pdf$/i.test(name)) return true;
  return false;
};

const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  isOpen,
  onClose,
  lead,
  onEdit,
  onUpdated,
}) => {
  const [panelOpen, setPanelOpen] = useState(false);
  const [choice, setChoice] = useState<LeadStatus>("New");
  const [note, setNote] = useState("");
  const [followDate, setFollowDate] = useState("");
  const [followTime, setFollowTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [viewingMedia, setViewingMedia] = useState<{
    url: string;
    name: string;
    mimeType?: string;
  } | null>(null);

  useEffect(() => {
    setPanelOpen(false);
    setChoice(lead?.status || "New");
    setNote("");
    setFollowDate("");
    setFollowTime("");
    setError("");
  }, [lead?._id, lead?.status]);

  const events = useMemo(() => (lead ? visibleEvents(lead) : []), [lead]);
  const stage = lead ? pipelineIndex(lead.status) : -1;
  const updates = events.filter((event) => event.type !== "created").length;
  const nextFollowUp = [...events].reverse().find((event) => event.followUpAt);

  if (!isOpen || !lead) return null;

  const saveStatus = async () => {
    setSaving(true);
    setError("");
    try {
      const followUpAt =
        followDate && followTime
          ? new Date(`${followDate}T${followTime}`).toISOString()
          : followDate
            ? new Date(`${followDate}T00:00:00`).toISOString()
            : undefined;
      const response = await handleAddLeadTimeline(lead._id, {
        status: choice,
        note: note.trim(),
        followUpAt,
        reminderTime: followTime,
      });
      if (!response?.data) {
        setError(response?.message || "Could not update the lead.");
        return;
      }
      onUpdated?.({
        ...lead,
        ...response.data,
        membership: response.data.membership ?? lead.membership,
      });
      setPanelOpen(false);
      setNote("");
      setFollowDate("");
      setFollowTime("");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "";
      setError(message || "Could not update the lead.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-slate-900/40 p-0 sm:p-4">
      <div className="flex h-dvh w-full max-w-[1400px] flex-col overflow-hidden bg-[#F6F7FB] sm:h-[94vh] sm:rounded-2xl sm:shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <User size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="truncate text-lg font-bold text-slate-900">{lead.name}</h2>
                <span className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700 shadow-2xs">
                  {lead.leadId || leadCode(lead._id)}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusTone(lead.status)}`}>
                  {lead.status}
                </span>
              </div>
              <p className="truncate text-xs text-slate-500">
                Lead ID: <span className="font-mono font-medium text-slate-700">{lead.leadId || leadCode(lead._id)}</span> · Created on {formatWhen(lead.createdAt || lead.date)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 sm:flex">
              <UserCheck size={16} className="text-slate-400" />
              {lead.assignedTo?.m_staff_name || "Unassigned"}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[280px_minmax(0,1fr)_300px] lg:overflow-hidden">
          <section className="space-y-3 lg:overflow-y-auto">
            <article className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Lead Details</h3>
                {onEdit ? (
                  <button
                    type="button"
                    onClick={() => onEdit(lead)}
                    className="text-xs font-semibold text-violet-600"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
              <dl className="space-y-3 text-sm">
                <Detail icon={Hash} label="Lead ID" value={lead.leadId || leadCode(lead._id)} />
                <Detail icon={User} label="Name" value={lead.name} />
                <div className="flex items-start gap-2">
                  <Phone size={15} className="mt-0.5 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <dt className="text-[11px] text-slate-400">Phone</dt>
                    <dd className="flex items-center gap-2 font-semibold text-slate-800">
                      <a href={`tel:${lead.phone}`}>{lead.phone || "—"}</a>
                      {lead.phone ? (
                        <a
                          href={`https://wa.me/91${lead.phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600"
                          aria-label="WhatsApp"
                        >
                          <MessageCircle size={15} />
                        </a>
                      ) : null}
                      <LeadMembershipBadge membership={lead.membership} />
                    </dd>
                  </div>
                </div>
                <Detail icon={Tag} label="Lead Source" value={lead.source || "—"} />
                <Detail icon={Bookmark} label="Purpose" value={lead.purpose || "—"} />
                <Detail icon={Calendar} label="Preferred Date" value={formatDay(lead.deadline) || "—"} />
                <Detail icon={Calendar} label="Created Date" value={formatWhen(lead.createdAt || lead.date) || "—"} />
                <Detail icon={UserCheck} label="Assigned To" value={lead.assignedTo?.m_staff_name || "Unassigned"} />
                {lead.url ? (
                  <div className="flex items-start gap-2">
                    <Globe size={15} className="mt-0.5 text-slate-400" />
                    <div className="min-w-0">
                      <dt className="text-[11px] text-slate-400">Link</dt>
                      <a
                        href={lead.url.startsWith("http") ? lead.url : `https://${lead.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 truncate text-sm font-semibold text-violet-600"
                      >
                        Open <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                ) : null}
              </dl>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Lead Notes</h3>
                {onEdit ? (
                  <button type="button" onClick={() => onEdit(lead)} className="text-xs font-semibold text-violet-600">
                    Edit
                  </button>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                {lead.reasonNote || "No notes recorded for this lead."}
              </p>
            </article>

            {lead.attachments && lead.attachments.length > 0 ? (
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Paperclip size={14} /> Media
                </div>
                <div className="space-y-2">
                  {lead.attachments.map((att, index) => (
                    <button
                      key={`${att.url}-${index}`}
                      type="button"
                      onClick={() =>
                        setViewingMedia({
                          url: att.url,
                          name: att.name || "Attachment",
                          mimeType: att.mimeType,
                        })
                      }
                      className="flex w-full items-center gap-2 rounded-xl border border-slate-100 px-2 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <File size={14} className="text-slate-400" />
                      <span className="truncate">{att.name || "Attachment"}</span>
                      <Eye size={14} className="ml-auto text-slate-400" />
                    </button>
                  ))}
                </div>
              </article>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 lg:overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Timeline</h3>
              <button
                type="button"
                onClick={() => {
                  setChoice(lead.status);
                  setPanelOpen(true);
                }}
                className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700"
              >
                <Plus size={14} /> Add Status
              </button>
            </div>
            <ol className="space-y-0">
              {events.map((event, index) => {
                const { Icon, wrap } = eventIcon(event);
                return (
                  <li key={`${event.at}-${index}`} className="relative flex gap-3 pb-5">
                    {index < events.length - 1 ? (
                      <span className="absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-px bg-slate-200" />
                    ) : null}
                    <span className={`relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${wrap}`}>
                      <Icon size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {event.title || "Status Updated"}
                            {event.status && event.type !== "created" ? (
                              <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone(event.status)}`}>
                                {event.status}
                              </span>
                            ) : null}
                          </p>
                          {event.note ? (
                            <p className="mt-0.5 text-sm text-slate-600">{event.note}</p>
                          ) : null}
                          {event.followUpAt ? (
                            <p className="mt-0.5 text-xs font-medium text-violet-700">
                              Follow up {formatWhen(event.followUpAt)}
                            </p>
                          ) : null}
                          {event.by?.m_staff_name ? (
                            <p className="mt-0.5 text-xs text-slate-400">by {event.by.m_staff_name}</p>
                          ) : null}
                        </div>
                        <time className="shrink-0 text-xs text-slate-400">{formatWhen(event.at)}</time>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <aside className="space-y-3 lg:overflow-y-auto">
            <article className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-bold text-slate-900">Lead Status</h3>
              <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusTone(lead.status)}`}>
                {lead.status}
              </p>
              <div className="mt-4 flex items-center justify-between gap-1">
                {PIPELINE.map((step, index) => {
                  const reached = stage >= index && stage >= 0;
                  return (
                    <div key={step} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                      <span
                        className={`h-3 w-3 rounded-full border-2 ${
                          reached ? "border-violet-600 bg-violet-600" : "border-slate-300 bg-white"
                        }`}
                      />
                      <span className={`text-center text-[10px] font-semibold ${reached ? "text-violet-700" : "text-slate-400"}`}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-bold text-slate-900">Lead Insights</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>{updates} status update{updates === 1 ? "" : "s"} on this lead.</li>
                {nextFollowUp?.followUpAt ? (
                  <li>Next follow up {formatWhen(nextFollowUp.followUpAt)}.</li>
                ) : (
                  <li>No follow up scheduled.</li>
                )}
                {lead.status === "Converted" ? <li>This lead is converted.</li> : null}
              </ul>
            </article>
          </aside>
        </div>
      </div>

      {panelOpen ? (
        <div className="fixed inset-y-0 right-0 z-[90] flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-base font-bold text-slate-900">Update Lead Status</h3>
            <button type="button" onClick={() => setPanelOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Select Status</p>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_CHOICES.map(({ value, icon: Icon, className }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setChoice(value)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold ${className} ${
                    choice === value ? "ring-2 ring-violet-500" : ""
                  }`}
                >
                  <Icon size={16} />
                  {value}
                </button>
              ))}
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Add Note (Optional)
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Add a quick note"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-violet-500"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm font-semibold text-slate-700">
                Next Follow Up
                <input
                  type="date"
                  value={followDate}
                  onChange={(event) => setFollowDate(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-violet-500"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Reminder Time
                <input
                  type="time"
                  value={followTime}
                  onChange={(event) => setFollowTime(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-violet-500"
                />
              </label>
            </div>
            {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
          </div>
          <div className="border-t border-slate-100 p-4">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveStatus()}
              className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Update Status"}
            </button>
          </div>
        </div>
      ) : null}

      {viewingMedia ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="truncate text-sm font-semibold">{viewingMedia.name}</p>
              <button type="button" onClick={() => setViewingMedia(null)} className="rounded-full p-1">
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-1 items-center justify-center p-4">
              {isImageFile(viewingMedia.mimeType, viewingMedia.name) ? (
                <img src={viewingMedia.url} alt="" className="max-h-[75vh] max-w-full object-contain" />
              ) : isVideoFile(viewingMedia.mimeType, viewingMedia.name) ? (
                <video src={viewingMedia.url} controls className="max-h-[75vh] max-w-full" />
              ) : isPdfFile(viewingMedia.mimeType, viewingMedia.name) ? (
                <iframe title={viewingMedia.name} src={viewingMedia.url} className="h-[75vh] w-full" />
              ) : (
                <a href={viewingMedia.url} target="_blank" rel="noopener noreferrer" className="text-violet-600">
                  Open file
                </a>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={15} className="mt-0.5 text-slate-400" />
      <div className="min-w-0">
        <dt className="text-[11px] text-slate-400">{label}</dt>
        <dd className="font-semibold text-slate-800">{value}</dd>
      </div>
    </div>
  );
}

export default LeadDetailsModal;
