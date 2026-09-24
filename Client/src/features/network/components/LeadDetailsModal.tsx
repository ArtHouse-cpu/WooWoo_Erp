import React, { useState } from "react";
import {
  X,
  Phone,
  Mail,
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
} from "lucide-react";
import type { LeadItem } from "@/services/apiClient";

type LeadDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadItem | null;
  onEdit?: (lead: LeadItem) => void;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "New":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Contacted":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "Interested":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "Converted":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Lost":
      return "bg-rose-100 text-rose-800 border-rose-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
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

const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  isOpen,
  onClose,
  lead,
  onEdit,
}) => {
  const [viewingMedia, setViewingMedia] = useState<{
    url: string;
    name: string;
    mimeType?: string;
  } | null>(null);

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-semibold">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {lead.name}
              </h2>
              <span
                className={`inline-block mt-0.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(
                  lead.status
                )}`}
              >
                {lead.status}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-6 text-sm text-gray-600">
          {/* Contact Details */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-indigo-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-xs text-gray-400 block">Phone</span>
                {lead.phone ? (
                  <a
                    href={`tel:${lead.phone}`}
                    className="font-medium text-gray-800 hover:text-indigo-600"
                  >
                    {lead.phone}
                  </a>
                ) : (
                  <span className="text-gray-400 italic">Not provided</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail size={16} className="text-indigo-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-xs text-gray-400 block">Email</span>
                {lead.email ? (
                  <a
                    href={`mailto:${lead.email}`}
                    className="font-medium text-gray-800 hover:text-indigo-600"
                  >
                    {lead.email}
                  </a>
                ) : (
                  <span className="text-gray-400 italic">Not provided</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Tag size={16} className="text-indigo-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-xs text-gray-400 block">Lead Source</span>
                <span className="font-medium text-gray-800">
                  {lead.source || <span className="text-gray-400 italic">Direct / Unknown</span>}
                </span>
              </div>
            </div>

            {lead.purpose && (
              <div className="flex items-center gap-3">
                <Bookmark size={16} className="text-indigo-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-gray-400 block">Purpose</span>
                  <span className="font-medium text-gray-800">
                    {lead.purpose}
                  </span>
                </div>
              </div>
            )}

            {lead.url && (
              <div className="flex items-center gap-3">
                <Globe size={16} className="text-indigo-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-gray-400 block">Reference URL / Media Link</span>
                  <a
                    href={
                      lead.url.startsWith("http://") || lead.url.startsWith("https://")
                        ? lead.url
                        : `https://${lead.url}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1 text-xs truncate max-w-full"
                  >
                    <span className="truncate">{lead.url}</span>
                    <ExternalLink size={12} className="shrink-0" />
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-indigo-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-xs text-gray-400 block">Created Date</span>
                <span className="font-medium text-gray-800">
                  {lead.createdAt
                    ? new Date(lead.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : lead.date
                    ? new Date(lead.date).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            </div>

            {lead.createdBy?.m_staff_name && (
              <div className="flex items-center gap-3">
                <UserCheck size={16} className="text-indigo-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-gray-400 block">Created By (Staff)</span>
                  <span className="font-medium text-gray-800">
                    {lead.createdBy.m_staff_name}
                  </span>
                </div>
              </div>
            )}

            {lead.assignedTo?.m_staff_name && (
              <div className="flex items-center gap-3">
                <UserCheck size={16} className="text-indigo-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-gray-400 block">Assigned To (Staff)</span>
                  <span className="font-medium text-indigo-700">
                    {lead.assignedTo.m_staff_name}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Media / Documents */}
          {lead.attachments && lead.attachments.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5 font-medium text-gray-700">
                <div className="flex items-center gap-2">
                  <Paperclip size={16} className="text-indigo-500" />
                  <span>Media & Documents</span>
                </div>
                <span className="text-xs text-gray-400 font-normal">
                  {lead.attachments.length} {lead.attachments.length === 1 ? "file" : "files"}
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {lead.attachments.map((att, idx) => {
                  const isImg = isImageFile(att.mimeType, att.name || att.url);
                  const isVid = isVideoFile(att.mimeType, att.name || att.url);
                  const isPdf = isPdfFile(att.mimeType, att.name || att.url);

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-2.5 transition hover:shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {isImg ? (
                          <img
                            src={att.url}
                            alt={att.name || "Media"}
                            className="h-9 w-9 rounded-md object-cover border border-gray-200 shrink-0"
                          />
                        ) : isVid ? (
                          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-50 text-purple-600 shrink-0">
                            <Video size={18} />
                          </div>
                        ) : isPdf ? (
                          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-rose-50 text-rose-600 shrink-0">
                            <FileText size={18} />
                          </div>
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600 shrink-0">
                            <File size={18} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-xs font-medium text-gray-800"
                            title={att.name || "Attachment"}
                          >
                            {att.name || "Attachment"}
                          </p>
                          {att.size ? (
                            <span className="text-[10px] text-gray-400 mt-0.5 block">
                              {formatFileSize(att.size)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setViewingMedia({
                            url: att.url,
                            name: att.name || "Attachment",
                            mimeType: att.mimeType,
                          })
                        }
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
                        title="View Media"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reason / Notes */}
          <div>
            <div className="flex items-center gap-2 mb-1.5 font-medium text-gray-700">
              <FileText size={16} className="text-indigo-500" />
              <span>Notes & Details</span>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-3.5 text-gray-700 text-sm leading-relaxed min-h-[70px]">
              {lead.reasonNote ? (
                <p className="whitespace-pre-wrap">{lead.reasonNote}</p>
              ) : (
                <p className="text-gray-400 italic">No notes recorded for this lead.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
          {onEdit && (
            <button
              onClick={() => {
                onClose();
                onEdit(lead);
              }}
              className="rounded-lg bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-100 transition"
            >
              Edit Lead
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* Media Viewer Modal Lightbox */}
      {viewingMedia && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 bg-gray-50">
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
