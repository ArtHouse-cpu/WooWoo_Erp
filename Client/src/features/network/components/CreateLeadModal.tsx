import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import type { LeadItem, LeadPayload, LeadStatus } from "@/services/apiClient";

type CreateLeadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: LeadPayload, id?: string) => Promise<boolean | void> | void;
  leadToEdit?: LeadItem | null;
  isSubmitting?: boolean;
};

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
    email: "",
    status: "New",
    source: "",
    reasonNote: "",
  });

  const [error, setError] = useState("");

  useEffect(() => {
    if (leadToEdit) {
      setFormData({
        name: leadToEdit.name || "",
        phone: leadToEdit.phone || "",
        email: leadToEdit.email || "",
        status: leadToEdit.status || "New",
        source: leadToEdit.source || "",
        reasonNote: leadToEdit.reasonNote || "",
      });
    } else {
      setFormData({
        name: "",
        phone: "",
        email: "",
        status: "New",
        source: "",
        reasonNote: "",
      });
    }
    setError("");
  }, [leadToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      setError("Name is required.");
      return;
    }

    const phoneTrimmed = formData.phone?.trim() || "";
    const emailTrimmed = formData.email?.trim() || "";

    if (!phoneTrimmed && !emailTrimmed) {
      setError("Please enter either Phone Number or Email.");
      return;
    }

    setError("");
    const payload: LeadPayload = {
      name: formData.name.trim(),
      phone: phoneTrimmed,
      email: emailTrimmed.toLowerCase(),
      status: formData.status || "New",
      source: formData.source?.trim() || "",
      reasonNote: formData.reasonNote?.trim() || "",
    };

    await onSubmit(payload, leadToEdit?._id);
  };

  const handleClose = () => {
    setError("");
    onClose();
  };

  const isEditing = Boolean(leadToEdit);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">
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
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-6">
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
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (error) setError("");
                  }}
                  placeholder="Enter phone number"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (error) setError("");
                }}
                placeholder="Enter email address"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                * Either phone number or email is required.
              </p>
            </div>

            {/* Status + Source */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Interested">Interested</option>
                  <option value="Converted">Converted</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Source
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) =>
                    setFormData({ ...formData, source: e.target.value })
                  }
                  placeholder="e.g. Website, Referral, Walk-in"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Reason / Note */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Reason / Note
              </label>
              <textarea
                value={formData.reasonNote}
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