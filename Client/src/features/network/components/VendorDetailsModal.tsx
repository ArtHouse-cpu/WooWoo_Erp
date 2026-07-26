import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  FileText,
  Mail,
  MapPin,
  Phone,
  Wallet,
  X,
} from "lucide-react";
import { handleGetVendorById, type VendorPayload } from "@/services/apiClient";

export type VendorDetails = VendorPayload & {
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
};

type Props = {
  open: boolean;
  vendor: VendorDetails | null;
  onClose: () => void;
};

function getInitials(name?: string) {
  const cleaned = String(name ?? "").trim();
  if (!cleaned) return "V";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "V";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + second).toUpperCase();
}

function money(value?: number | null) {
  return `₹ ${Number(value ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  const text =
    value === undefined || value === null || String(value).trim() === ""
      ? "—"
      : String(value);
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-medium text-slate-800">
        {text}
      </div>
    </div>
  );
}

export default function VendorDetailsModal({ open, vendor, onClose }: Props) {
  const [details, setDetails] = useState<VendorDetails | null>(vendor);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !vendor?._id) {
      setDetails(vendor);
      return;
    }

    let cancelled = false;
    setDetails(vendor);
    setLoading(true);

    void handleGetVendorById(vendor._id)
      .then((res) => {
        if (cancelled) return;
        if (res?.vendor) setDetails(res.vendor);
      })
      .catch(() => {
        // keep list-row data if detail fetch fails
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, vendor]);

  const initials = useMemo(
    () => getInitials(details?.name || details?.companyName),
    [details?.name, details?.companyName],
  );

  if (!open || !details) return null;

  const addressLines = [
    details.billingAddress1,
    details.billingAddress2,
    details.address,
  ]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);
  const uniqueAddress = [...new Set(addressLines)];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl ring-1 ring-slate-900/5">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-semibold text-white shadow-sm ring-2 ring-white">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {details.name || details.companyName || "Vendor"}
              </h2>
              <p className="text-sm text-slate-500">
                {details.companyName && details.companyName !== details.name
                  ? details.companyName
                  : "Vendor details"}
                {loading ? " · Refreshing…" : ""}
              </p>
              {details.createdAt ? (
                <p className="mt-0.5 text-xs text-slate-400">
                  Created{" "}
                  {new Date(details.createdAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-1">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Phone size={16} className="text-slate-400" />
                Contact
              </div>
              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-400" />
                  {details.mobile || "—"}
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-slate-400" />
                  <span className="truncate">{details.email || "—"}</span>
                </div>
                {details.whatsappNumber ? (
                  <div className="text-slate-500">
                    WhatsApp: {details.whatsappNumber}
                  </div>
                ) : null}
                {details.AlternateMobile ? (
                  <div className="text-slate-500">
                    Alternate: {details.AlternateMobile}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-2">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <MapPin size={16} className="text-slate-400" />
                Billing Address
              </div>
              <div className="text-sm text-slate-700">
                {uniqueAddress.length ? (
                  uniqueAddress.map((line) => <div key={line}>{line}</div>)
                ) : (
                  <div>—</div>
                )}
                <div className="mt-1 text-slate-500">
                  {[details.city, details.state, details.pincode, details.country]
                    .map((v) => String(v ?? "").trim())
                    .filter(Boolean)
                    .join(", ") || ""}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-emerald-700/70">
                <Wallet size={13} />
                Net Balance
              </div>
              <div className="mt-2 text-xl font-bold text-emerald-900">
                {money(details.netBalance ?? details.closingBalance)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Opening Balance
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-800">
                {money(details.openingBalance)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Debit Limit
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-800">
                {money(details.debitLimit)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Default Due Days
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-800">
                {details.defaultDueDays ?? -1}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Building2 size={16} className="text-slate-400" />
              Business & Identity
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Company" value={details.companyName} />
              <Field label="GSTIN" value={details.gstin} />
              <Field label="PAN" value={details.panNumber} />
              <Field label="Aadhar" value={details.adharNumber} />
              <Field label="Gender" value={details.gender} />
              <Field
                label="Status"
                value={details.isActive === false ? "Inactive" : "Active"}
              />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <FileText size={16} className="text-slate-400" />
              Bank & Notes
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Bank Name" value={details.bankName} />
              <Field label="Branch" value={details.branchName} />
              <Field label="Account Holder" value={details.accountHolderName} />
              <Field label="Account Number" value={details.accountNumber} />
              <Field label="IFSC" value={details.IFSCcode} />
              <Field label="UPI ID" value={details.UPIID} />
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Notes" value={details.notes} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-white px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
