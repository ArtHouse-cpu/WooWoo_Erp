import React, { useState, useEffect } from "react";
import { X, Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import {
  handleVerifyStaffPin,
  type LeadItem,
  type LeadPayload,
  type LeadStatus,
  type VerifiedStaff,
} from "@/services/apiClient";

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
  const [error, setError] = useState("");

  // Staff PIN state (required when creating lead)
  const [staffPin, setStaffPin] = useState("");
  const [verifiedStaff, setVerifiedStaff] = useState<VerifiedStaff | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [pinError, setPinError] = useState("");

  const isEditing = Boolean(leadToEdit);

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
      setCustomSource("");
    }
    setStaffPin("");
    setVerifiedStaff(null);
    setIsVerifyingPin(false);
    setPinError("");
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

  const handleStaffPinChange = async (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 6);
    setStaffPin(cleaned);
    setPinError("");
    if (error) setError("");

    if (cleaned.length !== 6) {
      setVerifiedStaff(null);
      return;
    }

    try {
      setIsVerifyingPin(true);
      const res = await handleVerifyStaffPin(cleaned);
      if (res?.success && res.staff) {
        setVerifiedStaff(res.staff);
        setPinError("");
      } else {
        setVerifiedStaff(null);
        setPinError(res?.message || "Invalid Staff PIN.");
      }
    } catch (err: any) {
      setVerifiedStaff(null);
      setPinError(err?.response?.data?.message || "Invalid Staff PIN.");
    } finally {
      setIsVerifyingPin(false);
    }
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

    let activeStaff = verifiedStaff;
    if (!isEditing) {
      const pinTrimmed = staffPin.trim();
      if (!pinTrimmed) {
        setPinError("Staff PIN is required.");
        setError("Staff PIN is required.");
        return;
      }
      if (pinTrimmed.length !== 6) {
        setPinError("Staff PIN must be a 6-digit number.");
        setError("Staff PIN must be a 6-digit number.");
        return;
      }

      if (!activeStaff) {
        try {
          setIsVerifyingPin(true);
          const res = await handleVerifyStaffPin(pinTrimmed);
          if (res?.success && res.staff) {
            activeStaff = res.staff;
            setVerifiedStaff(res.staff);
            setPinError("");
          } else {
            const msg = res?.message || "Invalid Staff PIN.";
            setPinError(msg);
            setError(msg);
            return;
          }
        } catch (err: any) {
          const msg = err?.response?.data?.message || "Invalid Staff PIN.";
          setPinError(msg);
          setError(msg);
          return;
        } finally {
          setIsVerifyingPin(false);
        }
      }
    }

    setError("");
    setPinError("");
    const payload: LeadPayload = {
      name: formData.name.trim(),
      phone: phoneTrimmed,
      status: formData.status || "New",
      source: formData.source?.trim() || "",
      purpose: formData.purpose?.trim() || "",
      reasonNote: formData.reasonNote?.trim() || "",
      ...(activeStaff
        ? {
            createdBy: {
              m_staff_id:
                activeStaff.m_staff_id ||
                activeStaff.staffId ||
                activeStaff._id ||
                "",
              m_staff_name:
                activeStaff.staffName || activeStaff.name || "",
              m_staff_email: activeStaff.email || "",
            },
          }
        : {}),
    };

    await onSubmit(payload, leadToEdit?._id);
  };

  const handleClose = () => {
    setError("");
    setPinError("");
    setStaffPin("");
    setVerifiedStaff(null);
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

            {/* Purpose & Staff PIN */}
            <div className={!isEditing ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : ""}>
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

              {/* Staff PIN (Required while creating lead) */}
              {!isEditing && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Staff PIN <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <KeyRound size={16} />
                    </div>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={staffPin}
                      onChange={(e) => handleStaffPinChange(e.target.value)}
                      placeholder="6-digit PIN"
                      className={`w-full rounded-md border pl-9 pr-9 py-2 text-sm tracking-widest outline-none transition focus:border-indigo-500 ${
                        pinError
                          ? "border-red-300 focus:border-red-500"
                          : verifiedStaff
                          ? "border-emerald-300 focus:border-emerald-500"
                          : "border-gray-300"
                      }`}
                      required
                    />
                    {isVerifyingPin ? (
                      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-indigo-600">
                        <Loader2 size={16} className="animate-spin" />
                      </div>
                    ) : verifiedStaff ? (
                      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-emerald-600">
                        <CheckCircle2 size={16} />
                      </div>
                    ) : null}
                  </div>
                  {verifiedStaff && (
                    <p className="mt-1 text-xs font-medium text-emerald-600 truncate">
                      ✓ Verified: {verifiedStaff.staffName || verifiedStaff.name}
                    </p>
                  )}
                  {pinError && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      {pinError}
                    </p>
                  )}
                </div>
              )}
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