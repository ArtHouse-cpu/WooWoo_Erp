import { useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  Camera,
  ChevronDown,
  Clock,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShoppingBag,
  Wallet,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  customerPayloadToFormData,
  handleUpdateCustomer,
  type CustomerPayload,
} from "@/services/apiClient";
import UpdateCustomerModal from "./UpdateCustomerModal";
import BuyMembershipModal from "./BuyMembershipModal";
import { closeIfConfirmed } from "@/utils/confirmClose";

export type CustomerDetails = CustomerPayload & {
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
  onEdit?: (customer: CustomerDetails) => void;
  onViewLedger?: (customer: CustomerDetails) => void;
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
  return new URL(
    p,
    import.meta.env.VITE_API_URL || "https://woo-woo-erp.vercel.app/",
  ).toString();
}

export default function CustomerDetailsModal({
  open,
  customer,
  onClose,
  onUpdated,
  onEdit,
  onViewLedger,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [updatingCustomer, setUpdatingCustomer] = useState(false);
  const [buyMembershipOpen, setBuyMembershipOpen] = useState(false);

  // Accordion state for compact cards
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const toggleCard = (id: string) => {
    setExpandedCard((prev) => (prev === id ? null : id));
  };

  // Lock background scroll when modal is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const avatarUrl = useMemo(
    () => toAssetUrl(customer?.profileImage),
    [customer?.profileImage],
  );
  const initials = useMemo(
    () => getInitials(customer?.name),
    [customer?.name],
  );

  const createdDateText = useMemo(() => {
    if (!customer?.createdAt) return "Customer details";
    try {
      const d = new Date(customer.createdAt);
      if (isNaN(d.getTime())) return "Customer details";
      const day = String(d.getDate()).padStart(2, "0");
      const month = d.toLocaleString("en-IN", { month: "short" });
      const year = d.getFullYear();
      const time = d
        .toLocaleString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
        .toLowerCase();
      return `Created ${day} ${month} ${year}, ${time}`;
    } catch {
      return "Customer details";
    }
  }, [customer?.createdAt]);

  const isMembershipActive = useMemo(() => {
    if (!customer?.membershipEndDate) return false;
    return new Date(customer.membershipEndDate) > new Date();
  }, [customer?.membershipEndDate]);

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
      const formData = customerPayloadToFormData(
        args.payload,
        args.profileImageFile,
      );
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
        error?.response?.data?.message ??
          "Could not update customer. Try again.",
        "error",
      );
    } finally {
      setUpdatingCustomer(false);
    }
  };

  const fullAddress = [
    customer.address,
    customer.city,
    customer.state,
    customer.pincode,
  ]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .join(", ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex w-full max-w-md sm:max-w-lg flex-col overflow-hidden rounded-[28px] bg-slate-50/95 shadow-2xl ring-1 ring-slate-900/5 max-h-[92dvh] sm:max-h-[90vh]">
        {/* Customer Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* Avatar with Camera Icon */}
            <div className="relative shrink-0">
              <div className="flex h-13 w-13 sm:h-15 sm:w-15 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-lg sm:text-xl shadow-xs ring-2 ring-white">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={customer.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-0.5 -right-0.5 inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-white text-slate-700 shadow-md ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                title="Upload profile photo"
              >
                <Camera size={13} className="text-slate-600" />
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

            {/* Name and Created Timestamp */}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base sm:text-lg font-bold text-slate-900">
                {customer.name || "-"}
              </h2>
              <div className="mt-0.5 flex items-center gap-1 text-[11px] sm:text-xs text-slate-500">
                <Clock size={12} className="shrink-0 text-slate-400" />
                <span className="truncate">{createdDateText}</span>
              </div>
            </div>
          </div>

          {/* Top-Right Circular Close Button */}
          <button
            type="button"
            onClick={() => void closeIfConfirmed(onClose)}
            className="shrink-0 rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
            aria-label="Close customer details"
          >
            <X size={18} />
          </button>
        </div>

        {/* Compact Information Cards (Single Vertical Stack) */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-2.5 sm:space-y-3 custom-scrollbar">
          {/* 1. Contact Card */}
          <div
            onClick={() => toggleCard("contact")}
            className="cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-3.5 shadow-2xs transition hover:border-slate-300"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-2xs">
                  <Phone size={18} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                    Contact
                  </span>
                  <span className="block truncate text-sm font-bold text-slate-900">
                    {customer.mobile || "-"}
                  </span>
                </div>
              </div>
              <ChevronDown
                size={18}
                className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                  expandedCard === "contact" ? "rotate-180" : ""
                }`}
              />
            </div>

            {/* Expanded details */}
            {expandedCard === "contact" && (
              <div className="mt-3 border-t border-slate-100 pt-2.5 space-y-2 text-xs text-slate-600 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="shrink-0 text-slate-400" />
                  <span className="truncate">
                    {customer.email?.trim() ? customer.email : "No email added"}
                  </span>
                </div>
                {customer.whatsappNumber && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-400 text-[10px] uppercase">
                      WhatsApp:
                    </span>
                    <span>{customer.whatsappNumber}</span>
                  </div>
                )}
                {customer.AlternateMobile && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-400 text-[10px] uppercase">
                      Alternate:
                    </span>
                    <span>{customer.AlternateMobile}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Location Card */}
          <div
            onClick={() => toggleCard("location")}
            className="cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-3.5 shadow-2xs transition hover:border-slate-300"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-2xs">
                  <MapPin size={18} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                    Location
                  </span>
                  <span className="block truncate text-sm font-bold text-slate-900">
                    {customer.city || customer.address || "-"}
                  </span>
                </div>
              </div>
              <ChevronDown
                size={18}
                className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                  expandedCard === "location" ? "rotate-180" : ""
                }`}
              />
            </div>

            {/* Expanded details */}
            {expandedCard === "location" && (
              <div className="mt-3 border-t border-slate-100 pt-2.5 text-xs text-slate-600 animate-in fade-in duration-150">
                <p className="break-words">
                  {fullAddress || "No detailed address provided."}
                </p>
              </div>
            )}
          </div>

          {/* 3. Wallet Balance Card */}
          <div
            onClick={() => toggleCard("wallet")}
            className="cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-3.5 shadow-2xs transition hover:border-slate-300"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-2xs">
                  <Wallet size={18} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                    Wallet Balance
                  </span>
                  <span className="block truncate text-base font-extrabold text-slate-900 tabular-nums">
                    ₹{" "}
                    {Number(
                      customer.walletAmount ?? customer.closingBalance ?? 0,
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {onViewLedger && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                      onViewLedger(customer);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-blue-50 hover:bg-blue-100 ring-1 ring-blue-200/80 px-2.5 py-1 text-xs font-semibold text-blue-700 transition cursor-pointer"
                    title="View Ledger"
                  >
                    <FileText size={12} />
                    <span>View Ledger</span>
                  </button>
                )}
                <ChevronDown
                  size={18}
                  className={`text-slate-400 transition-transform duration-200 ${
                    expandedCard === "wallet" ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>

            {/* Expanded details */}
            {expandedCard === "wallet" && (
              <div className="mt-3 border-t border-slate-100 pt-2.5 flex items-center justify-between text-xs text-slate-600 animate-in fade-in duration-150">
                <span>Current usable balance</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-700">
                    ₹{" "}
                    {Number(
                      customer.walletAmount ?? customer.closingBalance ?? 0,
                    ).toLocaleString("en-IN")}
                  </span>
                  {onViewLedger && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                        onViewLedger(customer);
                      }}
                      className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      View Ledger →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 4. Membership Card */}
          <div
            onClick={() => toggleCard("membership")}
            className="cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-3.5 shadow-2xs transition hover:border-slate-300"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-2xs">
                  <Briefcase size={18} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                    Membership
                  </span>
                  <span className="block truncate text-sm font-bold text-slate-900 capitalize">
                    {customer.membershipType?.trim() || "None"}
                  </span>
                </div>
              </div>

              {/* Status Badge + Buy Button + Chevron */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isMembershipActive ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200/80">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 ring-1 ring-inset ring-rose-200/80">
                    ✕ Expired
                  </span>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBuyMembershipOpen(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-violet-50 hover:bg-violet-100 ring-1 ring-violet-200/80 px-2.5 py-1 text-xs font-semibold text-violet-700 transition"
                  title="Buy membership"
                >
                  <ShoppingBag size={12} />
                  <span>Buy</span>
                </button>

                <ChevronDown
                  size={18}
                  className={`text-slate-400 transition-transform duration-200 ${
                    expandedCard === "membership" ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>

            {/* Expanded details */}
            {expandedCard === "membership" && (
              <div className="mt-3 border-t border-slate-100 pt-2.5 space-y-1.5 text-xs text-slate-600 animate-in fade-in duration-150">
                {customer.membershipStartDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Start Date:</span>
                    <span className="font-medium text-slate-800">
                      {new Date(
                        customer.membershipStartDate,
                      ).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
                {customer.membershipEndDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Expiry Date:</span>
                    <span className="font-medium text-slate-800">
                      {new Date(customer.membershipEndDate).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </span>
                  </div>
                )}
                {!customer.membershipStartDate && !customer.membershipEndDate && (
                  <p className="text-slate-400 italic">
                    No active membership plan attached.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions (Fixed / Sticky Footer) */}
        <div className="border-t border-slate-100 bg-white p-3 sm:p-4 space-y-2">
          {/* Prominent Edit Customer Button */}
          <button
            type="button"
            onClick={() => {
              if (onEdit && customer) {
                onClose();
                onEdit(customer);
              } else {
                setEditOpen(true);
              }
            }}
            className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] py-3 text-sm font-bold text-white shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Pencil size={15} />
            <span>Edit Customer</span>
          </button>

          {/* Secondary Close Button */}
          <button
            type="button"
            onClick={() => void closeIfConfirmed(onClose)}
            className="w-full rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.99] py-2.5 text-sm font-semibold text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <X size={15} />
            <span>Close</span>
          </button>
        </div>

        {/* Fallback internal Edit modal when onEdit is not supplied */}
        {!onEdit && (
          <UpdateCustomerModal
            open={editOpen}
            onClose={() => setEditOpen(false)}
            customer={customer as CustomerPayload}
            onUpdate={handleUpdateCustomerSubmit}
            loading={updatingCustomer}
          />
        )}

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
