import { useMemo, useRef, useState } from "react";
import { Camera, Mail, MapPin, Phone, X } from "lucide-react";
import Swal from "sweetalert2";
import {
  customerPayloadToFormData,
  handleUpdateCustomer,
  type CustomerPayload,
} from "@/services/apiClient";
import UpdateCustomerModal from "./UpdateCustomerModal";

type CustomerDetails = CustomerPayload & {
  _id?: string;
  createdAt?: string;
  createdBy?: { m_staff_name?: string | null };
  closingBalance?: number;
  walletAmount?: number;
};

type Props = {
  open: boolean;
  customer: CustomerDetails | null;
  onClose: () => void;
  onUpdated?: () => Promise<void> | void;
};

function getInitials(name?: string) {
  const cleaned = String(name ?? "").trim();
  if (!cleaned) return "C";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "C";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + second).toUpperCase();
}

function toAssetUrl(path?: string) {
  const p = String(path ?? "").trim();
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  return new URL(p, import.meta.env.VITE_API_URL || "https://woo-woo-erp.vercel.app/").toString();
}

export default function CustomerDetailsModal({
  open,
  customer,
  onClose,
  onUpdated,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [updatingCustomer, setUpdatingCustomer] = useState(false);

  const avatarUrl = useMemo(() => toAssetUrl(customer?.profileImage), [customer?.profileImage]);
  const initials = useMemo(() => getInitials(customer?.name), [customer?.name]);

  if (!open || !customer) return null;

  const uploadImage = async (file: File) => {
    const id = customer?._id;
    if (!id) {
      Swal.fire("Upload failed", "Customer id not found.", "error");
      return;
    }

    try {
      setUploading(true);
      const fd = customerPayloadToFormData({}, file);
      await handleUpdateCustomer(id, fd);
      await onUpdated?.();
      Swal.fire("Updated", "Profile photo updated successfully.", "success");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Upload failed",
        err?.response?.data?.message ?? "Could not upload image. Try again.",
        "error",
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleUpdateCustomerSubmit = async (args: {
    payload: CustomerPayload;
    profileImageFile?: File | null;
  }) => {
    const id = customer?._id;
    if (!id) return;
    try {
      setUpdatingCustomer(true);
      const formData = customerPayloadToFormData(args.payload, args.profileImageFile);
      await handleUpdateCustomer(id, formData);
      setEditOpen(false);
      await onUpdated?.();
      Swal.fire({
        icon: "success",
        title: "Updated",
        text: "Customer information updated successfully.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error: any) {
      console.error(error);
      Swal.fire(
        "Update failed",
        error?.response?.data?.message ?? "Could not update customer. Try again.",
        "error",
      );
    } finally {
      setUpdatingCustomer(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-full w-full max-w-3xl overflow-hidden rounded-2xl bg-slate-50 shadow-2xl ring-1 ring-slate-900/5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 ring-2 ring-white shadow-sm">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={customer.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-white">
                    {initials}
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-2 -right-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-md ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                title="Upload profile photo"
              >
                <Camera size={18} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadImage(f);
                }}
              />
            </div>

            <div>
              <div className="text-lg font-bold text-slate-900">{customer.name || "-"}</div>
              <div className="text-sm text-slate-500">Created At:
                {
                  customer.createdAt
                    ? new Date(customer.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                    : ""
                }
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[75vh] overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 text-sm font-semibold text-slate-800">Contact</div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone size={16} className="text-slate-400" />
                    <div className="font-medium">{customer.mobile || "-"}</div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail size={16} className="text-slate-400" />
                    <div className="truncate">{customer.email?.trim() ? customer.email : "-"}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 text-sm font-semibold text-slate-800">Location</div>
                <div className="space-y-2 text-sm text-slate-700">
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="mt-0.5 text-slate-400" />
                    <div className="min-w-0">
                      <div className="truncate">
                        {customer.address?.trim() ? customer.address : "-"}
                      </div>
                      <div className="text-slate-500">
                        {[customer.city, customer.state, customer.pincode]
                          .map((v) => String(v ?? "").trim())
                          .filter(Boolean)
                          .join(", ") || ""}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-12">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 text-sm font-semibold text-slate-800">Wallet</div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-green-700">
                      Available Balance
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-green-800">
                      ₹{" "}
                      {Number(
                        customer.walletAmount ?? customer.closingBalance ?? 0,
                      ).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Membership
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-800">
                      {customer.membershipType?.trim() || "General"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Last Updated
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-800">
                      {customer.createdAt
                        ? new Date(customer.createdAt).toLocaleDateString("en-IN")
                        : "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-5">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            Close
          </button>
        </div>
        <UpdateCustomerModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          customer={customer as CustomerPayload}
          onUpdate={handleUpdateCustomerSubmit}
          loading={updatingCustomer}
        />
      </div>
      
    </div>
  );
}
