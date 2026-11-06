import { useMemo, useRef, useState } from "react";
import { Camera, Mail, MapPin, Phone, X, ShoppingBag } from "lucide-react";
import Swal from "sweetalert2";
import {
  customerPayloadToFormData,
  handleUpdateCustomer,
  type CustomerPayload,
} from "@/services/apiClient";
import UpdateCustomerModal from "./UpdateCustomerModal";
import BuyMembershipModal from "./BuyMembershipModal";
import { closeIfConfirmed } from "@/utils/confirmClose";

type CustomerDetails = CustomerPayload & {
  _id?: string;
  createdAt?: string;
  createdBy?: { m_staff_name?: string | null };
  closingBalance?: number;
  walletAmount?: number;
  membershipStartDate?: string;
  membershipEndDate?: string;
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
  const [buyMembershipOpen, setBuyMembershipOpen] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 sm:items-center sm:p-4">
      <div className="relative flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden bg-slate-50 shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl sm:ring-1 sm:ring-slate-900/5">
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:py-5">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <div className="relative shrink-0">
              <div className="h-12 w-12 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-sm ring-2 ring-white sm:h-16 sm:w-16">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={customer.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white sm:text-lg">
                    {initials}
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-700 shadow-md ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:-bottom-2 sm:-right-2 sm:h-9 sm:w-9"
                title="Upload profile photo"
              >
                <Camera size={14} className="sm:h-[18px] sm:w-[18px]" />
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

            <div className="min-w-0">
              <div className="truncate text-base font-bold text-slate-900 sm:text-lg">{customer.name || "-"}</div>
              <div className="truncate text-xs text-slate-500 sm:text-sm">
                {customer.createdAt
                  ? `Created ${new Date(customer.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}`
                  : "Customer details"}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void closeIfConfirmed(onClose)}
            className="shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
            aria-label="Close customer details"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3 text-sm font-semibold text-slate-800">Contact</div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone size={16} className="shrink-0 text-slate-400" />
                    <div className="min-w-0 break-all font-medium">{customer.mobile || "-"}</div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail size={16} className="shrink-0 text-slate-400" />
                    <div className="min-w-0 break-all">{customer.email?.trim() ? customer.email : "-"}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3 text-sm font-semibold text-slate-800">Location</div>
                <div className="space-y-2 text-sm text-slate-700">
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <div className="break-words">
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
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

                {/* Heading */}
                <div className="mb-5">
                  <h2 className="text-base font-semibold text-slate-800">
                    Wallet & Membership
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                  {/* Wallet Card */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Wallet Balance
                    </p>

                    <h3 className="mt-3 text-2xl font-bold text-slate-800 sm:text-3xl">
                      ₹{" "}
                      {Number(
                        customer.walletAmount ?? customer.closingBalance ?? 0
                      ).toLocaleString("en-IN")}
                    </h3>
                  </div>

                  {/* Membership Card */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">

                    {/* Top */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Membership
                      </p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            customer.membershipEndDate &&
                            new Date(customer.membershipEndDate) > new Date()
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {customer.membershipEndDate &&
                          new Date(customer.membershipEndDate) > new Date()
                            ? "Active"
                            : "Expired"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setBuyMembershipOpen(true)}
                          className="flex items-center gap-1 rounded-lg bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-200 transition-colors"
                          title="Buy / upgrade membership"
                        >
                          <ShoppingBag size={12} />
                          Buy
                        </button>
                      </div>
                    </div>

                    {/* Membership Name */}
                    <h3 className="mt-3 break-words text-lg font-semibold capitalize text-slate-800 sm:text-xl">
                      {customer.membershipType?.trim() || "No Membership"}
                    </h3>

                    {/* Dates */}
                    <div className="mt-4 space-y-2 text-sm">

                      {customer.membershipStartDate && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Start Date</span>

                          <span className="font-medium text-slate-800">
                            {new Date(
                              customer.membershipStartDate
                            ).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      )}

                      {customer.membershipEndDate && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Expiry Date</span>

                          <span className="font-medium text-slate-800">
                            {new Date(
                              customer.membershipEndDate
                            ).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={() => void closeIfConfirmed(onClose)}
            className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:w-auto sm:rounded-lg sm:py-2.5"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 sm:w-auto sm:rounded-lg sm:py-2.5"
          >
            Edit customer
          </button>
        </div>
        <UpdateCustomerModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          customer={customer as CustomerPayload}
          onUpdate={handleUpdateCustomerSubmit}
          loading={updatingCustomer}
        />
        <BuyMembershipModal
          open={buyMembershipOpen}
          onClose={() => setBuyMembershipOpen(false)}
          customerId={String(customer._id ?? "")}
          customerName={String(customer.name ?? "")}
          customerEmail={String(customer.email ?? "")}
          customerPhone={String(customer.mobile ?? "")}
          onSuccess={() => {
            setBuyMembershipOpen(false);
            void onUpdated?.();
          }}
        />
      </div>

    </div>
  );
}
