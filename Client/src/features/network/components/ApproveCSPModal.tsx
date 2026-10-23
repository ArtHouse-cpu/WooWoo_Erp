import type { ReactNode } from "react";
import {
  BarChart3,
  Calendar,
  Check,
  Crown,
  ExternalLink,
  FileText,
  Link2,
  Phone,
  Store,
  User,
  X,
} from "lucide-react";

export type CspApplicationDetails = {
  name: string;
  brandName: string;
  phoneNumber: string;
  prositeUrl: string;
  avatarInitials: string;
  avatarBg?: string;
  avatarText?: string;
  avatarBorder?: string;
  sellingBefore?: string;
  sellingNote?: string;
  membershipLabel?: string;
  membershipStatus?: string;
  activatedAt?: string;
  customerSince?: string;
  submittedAt?: string;
};

type Props = {
  isOpen: boolean;
  application?: CspApplicationDetails | null;
  onClose: () => void;
  onApprove?: () => void;
  onReject?: () => void;
};

function DetailRow({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400">
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-sm text-slate-500">{label}</span>
      <span className="max-w-[55%] text-right text-sm font-semibold text-slate-800">
        {value || "—"}
        {hint ? (
          <span className="mt-0.5 block text-xs font-normal text-slate-400">
            {hint}
          </span>
        ) : null}
      </span>
    </div>
  );
}

const ApproveCSPModal = ({
  isOpen,
  application,
  onClose,
  onApprove,
  onReject,
}: Props) => {
  if (!isOpen || !application) return null;

  const prosite = String(application.prositeUrl || "").replace(/^https?:\/\//, "");
  const prositeHref = prosite ? `https://${prosite}` : "";
  const membershipActive =
    String(application.membershipStatus || "").toLowerCase() === "active";

  const handleApprove = () => {
    onApprove?.();
    onClose();
  };

  const handleReject = () => {
    onReject?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-details-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2
              id="application-details-title"
              className="text-base font-bold text-slate-900"
            >
              Application Details
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Review the details submitted by the applicant before approving or
              rejecting.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                application.avatarBg || "bg-rose-100"
              } ${application.avatarText || "text-rose-600"}`}
            >
              {application.avatarInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-slate-900">
                {application.name}
              </div>
              <div className="truncate text-xs text-slate-500">
                {application.brandName}
              </div>
            </div>
            {prositeHref ? (
              <a
                href={prositeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="max-w-[140px] truncate">{prosite}</span>
              </a>
            ) : null}
          </div>

          <h3 className="mb-2 mt-5 text-sm font-bold text-slate-900">
            Contact Information
          </h3>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
            <DetailRow
              icon={<User className="h-4 w-4" />}
              label="Name"
              value={application.name}
            />
            <DetailRow
              icon={<Phone className="h-4 w-4" />}
              label="Phone Number"
              value={application.phoneNumber}
            />
            <DetailRow
              icon={<Store className="h-4 w-4" />}
              label="Brand Name"
              value={application.brandName}
            />
            <DetailRow
              icon={<BarChart3 className="h-4 w-4" />}
              label="Selling Before?"
              value={application.sellingBefore || "—"}
              hint={application.sellingNote}
            />
            <DetailRow
              icon={<Link2 className="h-4 w-4" />}
              label="Atives Prosite URL"
              value={
                prositeHref ? (
                  <a
                    href={prositeHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-end gap-1 text-blue-600 hover:text-blue-800"
                  >
                    <span className="truncate">{prosite}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                ) : (
                  "—"
                )
              }
            />
          </div>

          <h3 className="mb-2 mt-5 text-sm font-bold text-slate-900">
            Premium Membership
          </h3>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-indigo-500 shadow-sm">
              <Crown className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-800">
                {application.membershipLabel || "Premium Membership"}
              </div>
              <div className="text-xs text-slate-400">Activation Date & Time</div>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  membershipActive
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {application.membershipStatus || "—"}
              </span>
              <div className="mt-1 text-xs font-medium text-slate-600">
                {application.activatedAt || "—"}
              </div>
            </div>
          </div>

          <h3 className="mb-2 mt-5 text-sm font-bold text-slate-900">
            Account Timeline
          </h3>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
            <DetailRow
              icon={<Calendar className="h-4 w-4" />}
              label="Customer Since"
              value={application.customerSince || "—"}
            />
            <DetailRow
              icon={<FileText className="h-4 w-4" />}
              label="Application Submitted"
              value={application.submittedAt || "—"}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleReject}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100"
          >
            <X className="h-4 w-4" />
            Reject
          </button>
          <button
            type="button"
            onClick={handleApprove}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Check className="h-4 w-4" />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApproveCSPModal;
