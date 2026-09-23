import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import {
  type LeadItem,
  type LeadPayload,
  type LeadStatus,
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
  });

  const [customSource, setCustomSource] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [error, setError] = useState("");

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
      });

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
      });
      setSelectedStaffId("");
      setCustomSource("");
    }
    setError("");
  }, [leadToEdit, isOpen]);

  if (!isOpen) return null;



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
      assignedTo,
    };

    await onSubmit(payload, leadToEdit?._id);
  };

  const handleClose = () => {
    setError("");
    setSelectedStaffId("");
    setCustomSource("");
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
    </div>
  );
};

export default CreateLeadModal;