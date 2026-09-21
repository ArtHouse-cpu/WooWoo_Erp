import React from "react";
import { X, Phone, Mail, Calendar, Tag, FileText, User } from "lucide-react";
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

const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  isOpen,
  onClose,
  lead,
  onEdit,
}) => {
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
          </div>

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
    </div>
  );
};

export default LeadDetailsModal;
