import React, { useState, useRef } from "react";
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
  Video,
  ExternalLink,
  Globe,
  Plus,
  Clock,
  ChevronDown,
  Pencil,
  Copy,
  Check,
  Hexagon,
  Download,
  MoreVertical,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  handleUpdateLead,
  type LeadItem,
  type LeadAttachment,
} from "@/services/apiClient";

type LeadDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadItem | null;
  onEdit?: (lead: LeadItem) => void;
  onLeadUpdated?: (updatedLead: LeadItem) => void;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "New":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "Contacted":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "Interested":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "Converted":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Lost":
    case "Not Interested":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "Need to message":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
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

const formatFileSize = (bytes?: number) => {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatLeadDateTime = (dateStr?: string) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sept",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
};

const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  isOpen,
  onClose,
  lead,
  onEdit,
  onLeadUpdated,
}) => {
  const [viewingMedia, setViewingMedia] = useState<{
    url: string;
    name: string;
    mimeType?: string;
  } | null>(null);

  const [copiedPhone, setCopiedPhone] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !lead) return null;

  const handleCopyPhone = () => {
    if (!lead.phone) return;
    navigator.clipboard.writeText(lead.phone);
    setCopiedPhone(true);
    toast.success("Phone copied to clipboard");
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleAddFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingFile(true);
      const res = await handleUpdateLead(lead._id, {
        attachments: lead.attachments || [],
        attachmentFiles: Array.from(files),
      });

      const updated = res?.data || res?.lead || res;
      if (updated && updated._id) {
        toast.success("File added successfully");
        onLeadUpdated?.(updated);
      } else {
        toast.success("File uploaded");
      }
    } catch {
      toast.error("Failed to upload file. Try using Edit Lead.");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const createdDateTimeStr = formatLeadDateTime(lead.createdAt || lead.date);
  const createdByName =
    lead.createdBy?.m_staff_name || lead.createdBy?.m_staff_email || "Ankur";
  const assignedToName =
    lead.assignedTo?.m_staff_name || lead.assignedTo?.m_staff_email || "Ankur";
  const avatarLetter = (
    lead.name ? lead.name[0] : createdByName[0] || "A"
  ).toUpperCase();
  const staffInitial = (createdByName ? createdByName[0] : "A").toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Modal Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50/80 text-indigo-600 font-bold shadow-2xs">
                <User size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-900 leading-tight">
                    {lead.name}
                  </h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                      lead.status
                    )}`}
                  >
                    {lead.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Created on {createdDateTimeStr}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Upper Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Lead Information Card */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm sm:text-base">
                  <Hexagon size={18} className="fill-indigo-50/60" />
                  <h3 className="text-slate-800">Lead Information</h3>
                </div>

                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(lead)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition shadow-2xs"
                  >
                    <Pencil size={12} />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {/* 2-Column Info Tiles Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tile 1: Phone */}
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-slate-50/90 transition min-h-[64px]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200/70 text-indigo-600 shadow-2xs">
                      <Phone size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-medium text-slate-400 block leading-tight mb-0.5">
                        Phone
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate block">
                        {lead.phone || (
                          <span className="text-slate-400 font-normal italic">
                            Not provided
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  {lead.phone && (
                    <button
                      type="button"
                      onClick={handleCopyPhone}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-white transition shrink-0 ml-1.5"
                      title="Copy Phone"
                    >
                      {copiedPhone ? (
                        <Check size={14} className="text-emerald-600" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  )}
                </div>

                {/* Tile 2: Lead Source */}
                <div
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-slate-50/90 transition min-h-[64px] cursor-pointer"
                  onClick={() => onEdit?.(lead)}
                  title="Click to edit Lead Source"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200/70 text-indigo-600 shadow-2xs">
                      <Tag size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-medium text-slate-400 block leading-tight mb-0.5">
                        Lead Source
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate block">
                        {lead.source || "Reference"}
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    size={14}
                    className="text-slate-400 shrink-0 ml-1"
                  />
                </div>

                {/* Tile 3: Purpose */}
                <div
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-slate-50/90 transition min-h-[64px] cursor-pointer"
                  onClick={() => onEdit?.(lead)}
                  title="Click to edit Purpose"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200/70 text-indigo-600 shadow-2xs">
                      <Bookmark size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-medium text-slate-400 block leading-tight mb-0.5">
                        Purpose
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate block">
                        {lead.purpose || "Supplies"}
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    size={14}
                    className="text-slate-400 shrink-0 ml-1"
                  />
                </div>

                {/* Tile 4: Reference URL / Media Link */}
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-slate-50/90 transition min-h-[64px]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200/70 text-indigo-600 shadow-2xs">
                      <Globe size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-medium text-slate-400 block leading-tight mb-0.5">
                        Reference URL / Media Link
                      </span>
                      {lead.url ? (
                        <a
                          href={
                            lead.url.startsWith("http://") ||
                            lead.url.startsWith("https://")
                              ? lead.url
                              : `https://${lead.url}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 truncate max-w-[190px]"
                          title={lead.url}
                        >
                          <span className="truncate">{lead.url}</span>
                          <ExternalLink size={12} className="shrink-0" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 font-normal italic">
                          Not provided
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tile 5: Created Date */}
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-slate-50/90 transition min-h-[64px]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200/70 text-indigo-600 shadow-2xs">
                      <Calendar size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-medium text-slate-400 block leading-tight mb-0.5">
                        Created Date
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate block">
                        {createdDateTimeStr}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tile 6: Created By (Staff) */}
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-slate-50/90 transition min-h-[64px]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200/70 text-indigo-600 shadow-2xs">
                      <UserCheck size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-medium text-slate-400 block leading-tight mb-0.5">
                        Created By (Staff)
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate block">
                        {createdByName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tile 7: Assigned To (Staff) - Spans 2 columns */}
                <div
                  className="sm:col-span-2 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-slate-50/90 transition min-h-[64px] cursor-pointer"
                  onClick={() => onEdit?.(lead)}
                  title="Click to edit Assigned Staff"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200/70 text-indigo-600 shadow-2xs">
                      <UserCheck size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-medium text-slate-400 block leading-tight mb-0.5">
                        Assigned To (Staff)
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate block">
                        {assignedToName}
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    size={14}
                    className="text-slate-400 shrink-0 ml-1"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Media & Documents + Notes & Details */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              {/* Media & Documents Card */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3.5">
                  <div className="flex items-center gap-2">
                    <Paperclip size={18} className="text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-800">
                      Media & Documents
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-normal">
                      {lead.attachments?.length || 0}{" "}
                      {lead.attachments?.length === 1 ? "file" : "files"}
                    </span>
                    <button
                      type="button"
                      disabled={uploadingFile}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition shadow-2xs disabled:opacity-50"
                    >
                      {uploadingFile ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Plus size={12} />
                      )}
                      <span>Add File</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      onChange={handleAddFileInputChange}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Attachments List */}
                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {lead.attachments && lead.attachments.length > 0 ? (
                    lead.attachments.map((att: LeadAttachment, idx: number) => {
                      const isImg = isImageFile(
                        att.mimeType,
                        att.name || att.url
                      );
                      const isVid = isVideoFile(
                        att.mimeType,
                        att.name || att.url
                      );
                      const isPdf = isPdfFile(
                        att.mimeType,
                        att.name || att.url
                      );

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 hover:bg-slate-50/90 transition group"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {isImg ? (
                              <img
                                src={att.url}
                                alt={att.name || "Media"}
                                className="h-10 w-10 rounded-lg object-cover border border-slate-200 bg-white shrink-0 shadow-2xs"
                              />
                            ) : isVid ? (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600 border border-purple-100 shrink-0">
                                <Video size={18} />
                              </div>
                            ) : isPdf ? (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-100 shrink-0">
                                <FileText size={18} />
                              </div>
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                                <File size={18} />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate text-xs font-semibold text-slate-800"
                                title={att.name || "Attachment"}
                              >
                                {att.name || "Attachment"}
                              </p>
                              <span className="text-[11px] text-slate-400 block mt-0.5 font-medium">
                                {formatFileSize(att.size) || "File"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={() =>
                                setViewingMedia({
                                  url: att.url,
                                  name: att.name || "Attachment",
                                  mimeType: att.mimeType,
                                })
                              }
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-indigo-600 hover:border-slate-200 border border-transparent transition"
                              title="View file"
                            >
                              <Eye size={15} />
                            </button>
                            <a
                              href={att.url}
                              download={att.name || "attachment"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-indigo-600 hover:border-slate-200 border border-transparent transition"
                              title="Download file"
                            >
                              <Download size={15} />
                            </a>
                            <button
                              type="button"
                              onClick={() => window.open(att.url, "_blank")}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-indigo-600 hover:border-slate-200 border border-transparent transition"
                              title="Open in new tab"
                            >
                              <MoreVertical size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-4 text-center text-xs text-slate-400 font-medium">
                      No media or documents attached
                    </div>
                  )}
                </div>
              </div>

              {/* Notes & Details Card */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3.5">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm sm:text-base">
                    <FileText size={18} />
                    <h3 className="text-slate-800">Notes & Details</h3>
                  </div>

                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(lead)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition shadow-2xs"
                    >
                      <Pencil size={12} />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs text-slate-700 leading-relaxed min-h-[90px] whitespace-pre-wrap font-sans">
                  {lead.reasonNote ? (
                    <p className="whitespace-pre-wrap font-medium text-slate-700">
                      {lead.reasonNote}
                    </p>
                  ) : (
                    <p className="text-slate-400 italic">
                      No notes recorded for this lead.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Timeline Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm sm:text-base">
                <Clock size={18} />
                <h3 className="text-slate-800">Timeline</h3>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
                <span>All Activity</span>
                <ChevronDown size={14} className="text-slate-400" />
              </div>
            </div>

            {/* Timeline Events Track */}
            <div className="relative pl-6 py-1">
              {/* Vertical line indicator */}
              <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-indigo-100" />

              {/* Event Marker */}
              <div className="absolute left-[7px] top-4.5 h-2.5 w-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-50" />

              {/* Event Card */}
              <div className="flex items-center gap-3.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 shrink-0">
                  {staffInitial}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    Lead Created
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                    by {createdByName} • {createdDateTimeStr}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs"
          >
            Close
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(lead);
              }}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-sm shadow-indigo-100"
            >
              Edit Lead
            </button>
          )}
        </div>
      </div>

      {/* Media Viewer Lightbox Modal */}
      {viewingMedia && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5 bg-gray-50">
              <div className="flex items-center gap-2 min-w-0 pr-3">
                <Eye size={18} className="text-indigo-600 shrink-0" />
                <h3 className="truncate text-sm font-semibold text-gray-800">
                  {viewingMedia.name || "Media Preview"}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={viewingMedia.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 transition"
                  title="Open in new window"
                >
                  <ExternalLink size={14} />
                  <span>Open</span>
                </a>
                <button
                  type="button"
                  onClick={() => setViewingMedia(null)}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Viewer Content */}
            <div className="flex flex-1 items-center justify-center overflow-auto p-4 bg-gray-900/5">
              {isImageFile(viewingMedia.mimeType, viewingMedia.name) ? (
                <img
                  src={viewingMedia.url}
                  alt={viewingMedia.name}
                  className="max-h-[75vh] max-w-full rounded-md object-contain shadow-md"
                />
              ) : isVideoFile(viewingMedia.mimeType, viewingMedia.name) ? (
                <video
                  src={viewingMedia.url}
                  controls
                  autoPlay
                  className="max-h-[75vh] max-w-full rounded-md shadow-md"
                />
              ) : isPdfFile(viewingMedia.mimeType, viewingMedia.name) ? (
                <iframe
                  src={viewingMedia.url}
                  title={viewingMedia.name}
                  className="h-[75vh] w-full rounded-md border border-gray-200 bg-white"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
                    <FileText size={32} />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {viewingMedia.name}
                  </p>
                  <a
                    href={viewingMedia.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 transition shadow-xs"
                  >
                    <ExternalLink size={14} />
                    <span>Open / Download File</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDetailsModal;
