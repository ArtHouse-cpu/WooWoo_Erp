import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Loader2,
  Paperclip,
  UploadCloud,
  Eye,
  Trash2,
  FileText,
  File,
  Video,
  ExternalLink,
  Globe,
} from "lucide-react";
import {
  type LeadItem,
  type LeadPayload,
  type LeadStatus,
  type LeadAttachment,
  handleGetAccessStaff,
} from "@/services/apiClient";

type StaffOption = {
  _id: string;
  m_staff_id: string;
  fullName: string;
  email?: string;
};

type CreateLeadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: LeadPayload, id?: string) => Promise<boolean | void> | void;
  leadToEdit?: LeadItem | null;
  isSubmitting?: boolean;
};

// Valid backend status values (from Server/src/models/lead.model.js)
const BACKEND_STATUS_OPTIONS: LeadStatus[] = [
  "New",
  "Contacted",
  "Interested",
  "Not Interested",
  "Need to message",
];

// Common lead sources
const COMMON_SOURCES = [
  "Instagram",
  "WhatsApp",
  "Walk-in",
  "Reference",
  "Member",
  "Events",
  "Website",
  "Other",
];

// Lead purposes
const PURPOSE_OPTIONS = [
  "Events",
  "Supplies",
  "Space Booking (Exhibition)",
  "Space Booking (Corporate Booking)",
  "Framing",
  "Private Booking",
  "Birthday Party",
  "Membership",
  "Volunteering",
  "CSP",
  "Customer Art Work",
  "Co-Working",
  "Handmade Gift",
  "Saler Program",
];

const CreateLeadModal: React.FC<CreateLeadModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  leadToEdit = null,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState<LeadPayload>({
    name: "",
    phone: "",
    status: "New",
    source: "",
    purpose: "",
    reasonNote: "",
    url: "",
  });

  const [customSource, setCustomSource] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [error, setError] = useState("");

  // Media / Document upload states
  const [existingAttachments, setExistingAttachments] = useState<LeadAttachment[]>([]);
  const [newFiles, setNewFiles] = useState<
    {
      id: string;
      file: File;
      previewUrl: string;
      name: string;
      size: number;
      mimeType: string;
    }[]
  >([]);
  const [isDragging, setIsDragging] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<{
    url: string;
    name: string;
    mimeType?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(leadToEdit);

  // Fetch staff list from user/access API
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    const fetchStaff = async () => {
      try {
        setLoadingStaff(true);
        const res = await handleGetAccessStaff("", controller.signal);
        const list = Array.isArray(res?.staff) ? res.staff : [];
        const mapped: StaffOption[] = list
          .map((item: any) => ({
            _id: String(item?._id ?? ""),
            m_staff_id: String(item?.m_staff_id ?? item?._id ?? "").trim(),
            fullName: String(item?.fullName ?? item?.name ?? "").trim(),
            email: String(item?.email ?? "").trim(),
          }))
          .filter((item: StaffOption) => Boolean(item.fullName));
        setStaffOptions(mapped);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Failed to load staff list:", err);
          setStaffOptions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingStaff(false);
        }
      }
    };
    fetchStaff();
    return () => controller.abort();
  }, [isOpen]);

  useEffect(() => {
    // Revoke previous blob URLs when modal opens or leadToEdit changes
    newFiles.forEach((f) => {
      if (f.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(f.previewUrl);
      }
    });
    setNewFiles([]);
    setViewingMedia(null);
    setIsDragging(false);

    if (leadToEdit) {
      const sourceVal = leadToEdit.source || "";
      const isPredefined = COMMON_SOURCES.includes(sourceVal);
      setFormData({
        name: leadToEdit.name || "",
        phone: leadToEdit.phone || "",
        status: (leadToEdit.status as LeadStatus) || "New",
        source: sourceVal,
        purpose: leadToEdit.purpose || "",
        reasonNote: leadToEdit.reasonNote || "",
        url: leadToEdit.url || "",
      });

      setExistingAttachments(
        Array.isArray(leadToEdit.attachments) ? leadToEdit.attachments : []
      );

      const assigned = leadToEdit.assignedTo;
      if (assigned?.m_staff_id || assigned?.m_staff_name) {
        setSelectedStaffId(assigned.m_staff_id || assigned.m_staff_name || "");
      } else {
        setSelectedStaffId("");
      }

      if (sourceVal && !isPredefined) {
        setCustomSource(sourceVal);
      } else {
        setCustomSource("");
      }
    } else {
      setFormData({
        name: "",
        phone: "",
        status: "New",
        source: "",
        purpose: "",
        reasonNote: "",
        url: "",
      });
      setExistingAttachments([]);
      setSelectedStaffId("");
      setCustomSource("");
    }
    setError("");
  }, [leadToEdit, isOpen]);

  // Clean up object URLs on component unmount
  useEffect(() => {
    return () => {
      newFiles.forEach((f) => {
        if (f.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(f.previewUrl);
        }
      });
    };
  }, [newFiles]);

  if (!isOpen) return null;

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  const handleFilesAdded = (incomingFiles: FileList | File[] | null) => {
    if (!incomingFiles || incomingFiles.length === 0) return;
    const filesArray = Array.from(incomingFiles);
    const mapped = filesArray.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      mimeType: file.type,
    }));
    setNewFiles((prev) => [...prev, ...mapped]);
  };

  const handleRemoveNewFile = (id: string) => {
    setNewFiles((prev) => {
      const found = prev.find((f) => f.id === id);
      if (found && found.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(found.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleRemoveExistingAttachment = (index: number) => {
    setExistingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === "Other") {
      setFormData((prev) => ({ ...prev, source: customSource || "Other" }));
    } else {
      setFormData((prev) => ({ ...prev, source: selected }));
      setCustomSource("");
    }
  };

  const handleCustomSourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomSource(value);
    setFormData((prev) => ({ ...prev, source: value.trim() || "Other" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      setError("Name is required.");
      return;
    }

    const phoneTrimmed = formData.phone?.trim() || "";

    if (!phoneTrimmed) {
      setError("Phone number is required.");
      return;
    }

    if (!/^\d{10}$/.test(phoneTrimmed)) {
      setError("Phone number must be a valid 10-digit number.");
      return;
    }

    setError("");

    const chosenStaff = staffOptions.find(
      (s) =>
        s.m_staff_id === selectedStaffId ||
        s._id === selectedStaffId ||
        s.fullName === selectedStaffId
    );

    const assignedTo = chosenStaff
      ? {
          m_staff_id: chosenStaff.m_staff_id || chosenStaff._id,
          m_staff_name: chosenStaff.fullName,
          m_staff_email: chosenStaff.email || "",
        }
      : selectedStaffId
      ? {
          m_staff_id: leadToEdit?.assignedTo?.m_staff_id || selectedStaffId,
          m_staff_name: leadToEdit?.assignedTo?.m_staff_name || selectedStaffId,
          m_staff_email: leadToEdit?.assignedTo?.m_staff_email || "",
        }
      : null;

    const payload: LeadPayload = {
      name: formData.name.trim(),
      phone: phoneTrimmed,
      status: formData.status || "New",
      source: formData.source?.trim() || "",
      purpose: formData.purpose?.trim() || "",
      reasonNote: formData.reasonNote?.trim() || "",
      url: formData.url?.trim() || "",
      assignedTo,
      attachments: existingAttachments,
      attachmentFiles: newFiles.map((f) => f.file),
    };

    await onSubmit(payload, leadToEdit?._id);
  };

  const handleClose = () => {
    setError("");
    setSelectedStaffId("");
    setCustomSource("");
    newFiles.forEach((f) => {
      if (f.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(f.previewUrl);
      }
    });
    setNewFiles([]);
    setViewingMedia(null);
    setIsDragging(false);
    onClose();
  };

  const isOtherSelected =
    formData.source === "Other" ||
    (Boolean(formData.source) && !COMMON_SOURCES.includes(formData.source || ""));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEditing ? "Update Lead" : "Create Lead"}
          </h2>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="space-y-4 overflow-y-auto p-6">
            {/* Name + Phone Number */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (error) setError("");
                  }}
                  placeholder="Enter lead / company name"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
                  required
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={formData.phone || ""}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setFormData({ ...formData, phone: digitsOnly });
                    if (error) setError("");
                  }}
                  placeholder="Enter 10-digit phone number"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Status + Source */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Status */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as LeadStatus,
                    })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
                >
                  {BACKEND_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Source
                </label>
                <select
                  value={
                    formData.source && COMMON_SOURCES.includes(formData.source)
                      ? formData.source
                      : isOtherSelected
                      ? "Other"
                      : ""
                  }
                  onChange={handleSourceChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
                >
                  <option value="">Select source (optional)</option>
                  {COMMON_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>



                {/* Custom Source Input when "Other" is active */}
                {isOtherSelected && (
                  <input
                    type="text"
                    value={customSource}
                    onChange={handleCustomSourceChange}
                    placeholder="Specify other source"
                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs outline-none transition focus:border-indigo-500"
                  />
                )}
              </div>
            </div>

            {/* Purpose & Assign To (Staff) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Purpose */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Purpose
                </label>
                <select
                  value={formData.purpose || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, purpose: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
                >
                  <option value="">Select purpose (optional)</option>
                  {PURPOSE_OPTIONS.map((purpose) => (
                    <option key={purpose} value={purpose}>
                      {purpose}
                    </option>
                  ))}
                  {formData.purpose &&
                    !PURPOSE_OPTIONS.includes(formData.purpose) && (
                      <option value={formData.purpose}>{formData.purpose}</option>
                    )}
                </select>
              </div>

              {/* Assign To (Staff) */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Assign To
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  disabled={loadingStaff}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">
                    {loadingStaff ? "Loading staff..." : "Unassigned"}
                  </option>
                  {/* Keep pre-selected staff if editing and not in list */}
                  {selectedStaffId &&
                    !staffOptions.some(
                      (s) =>
                        s.m_staff_id === selectedStaffId ||
                        s._id === selectedStaffId ||
                        s.fullName === selectedStaffId
                    ) && (
                      <option value={selectedStaffId}>
                        {leadToEdit?.assignedTo?.m_staff_name || selectedStaffId}
                      </option>
                    )}
                  {staffOptions.map((staff) => {
                    const val = staff.m_staff_id || staff._id;
                    return (
                      <option key={staff._id || staff.m_staff_id} value={val}>
                        {staff.fullName}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Media / Document Uploadation - just above Reason / Note */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Paperclip size={15} className="text-indigo-600" />
                  <span>Media / Documents</span>
                </label>
                <span className="text-[11px] text-gray-400">
                  Images, PDF, Docs, Video (Max 15MB)
                </span>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFilesAdded(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition text-center ${
                  isDragging
                    ? "border-indigo-500 bg-indigo-50/60"
                    : "border-gray-200 bg-gray-50/50 hover:border-indigo-300 hover:bg-indigo-50/30"
                }`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-xs text-indigo-500 group-hover:scale-105 transition">
                  <UploadCloud size={20} />
                </div>
                <p className="mt-2 text-xs font-semibold text-gray-700">
                  Click to upload media / document or drag & drop
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Supports JPG, PNG, PDF, DOCX, MP4, and more
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,video/*"
                className="hidden"
                onChange={(e) => {
                  handleFilesAdded(e.target.files);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />

              {/* Uploaded Files & Media List with View Icon */}
              {(existingAttachments.length > 0 || newFiles.length > 0) && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {/* Existing Attachments */}
                  {existingAttachments.map((att, idx) => {
                    const isImg = isImageFile(att.mimeType, att.name || att.url);
                    const isVid = isVideoFile(att.mimeType, att.name || att.url);
                    const isPdf = isPdfFile(att.mimeType, att.name || att.url);

                    return (
                      <div
                        key={`existing-${idx}`}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-2 shadow-xs transition hover:border-gray-300"
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
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5">
                              <span className="rounded bg-gray-100 px-1 py-0.2">Uploaded</span>
                              {att.size ? <span>{formatFileSize(att.size)}</span> : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          {/* View Icon to see media */}
                          <button
                            type="button"
                            onClick={() =>
                              setViewingMedia({
                                url: att.url,
                                name: att.name || "Attachment",
                                mimeType: att.mimeType,
                              })
                            }
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
                            title="View media"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingAttachment(idx)}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                            title="Remove attachment"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Newly selected files */}
                  {newFiles.map((item) => {
                    const isImg = isImageFile(item.mimeType, item.name);
                    const isVid = isVideoFile(item.mimeType, item.name);
                    const isPdf = isPdfFile(item.mimeType, item.name);

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50/20 p-2 shadow-xs transition hover:border-indigo-200"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {isImg ? (
                            <img
                              src={item.previewUrl}
                              alt={item.name}
                              className="h-9 w-9 rounded-md object-cover border border-indigo-200 shrink-0"
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
                              title={item.name}
                            >
                              {item.name}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
                              <span className="rounded bg-indigo-100/70 text-indigo-700 px-1 py-0.2 font-medium">New</span>
                              <span>{formatFileSize(item.size)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          {/* View Icon to see media */}
                          <button
                            type="button"
                            onClick={() =>
                              setViewingMedia({
                                url: item.previewUrl,
                                name: item.name,
                                mimeType: item.mimeType,
                              })
                            }
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
                            title="View media"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveNewFile(item.id)}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                            title="Remove file"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Media URL / Reference Link (Below Media Uploadation) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Globe size={15} className="text-indigo-600" />
                  <span>Media URL / Reference Link</span>
                </label>
                <span className="text-[11px] text-gray-400">
                  (Optional - Drive, Portfolio, Social)
                </span>
              </div>
              <div className="relative">
                <input
                  type="url"
                  value={formData.url || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  placeholder="https://drive.google.com/... or portfolio / website link"
                  className="w-full rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm outline-none transition focus:border-indigo-500"
                />
                {formData.url && (
                  <a
                    href={
                      formData.url.startsWith("http://") ||
                      formData.url.startsWith("https://")
                        ? formData.url
                        : `https://${formData.url}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition"
                    title="Open link in new tab"
                  >
                    <ExternalLink size={15} />
                  </a>
                )}
              </div>
            </div>

            {/* Reason / Note */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Reason / Note
              </label>
              <textarea
                value={formData.reasonNote || ""}
                onChange={(e) =>
                  setFormData({ ...formData, reasonNote: e.target.value })
                }
                placeholder="Add any notes, requirements, or follow-up details..."
                rows={3}
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
              />
            </div>

            {/* Validation message */}
            {error && (
              <div className="rounded-md bg-red-50 p-2.5 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isEditing ? "Update Lead" : "Create Lead"}
            </button>
          </div>
        </form>
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
                  <p className="text-xs text-gray-500 mt-1 max-w-sm">
                    This file format cannot be directly previewed in this modal.
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

export default CreateLeadModal;