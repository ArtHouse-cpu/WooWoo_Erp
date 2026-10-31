import type { ReactNode } from "react";
import {
  Briefcase,
  Check,
  Link2,
  Phone,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { closeIfConfirmed } from "@/utils/confirmClose";

export type HapApplicationDetails = {
  name: string;
  email: string;
  phoneNumber: string;
  profession: string;
  networkSize: string;
  payoutDetail: string;
  presence: string;
  avatarInitials: string;
  avatarBg?: string;
  avatarText?: string;
  avatarBorder?: string;
  submittedAt?: string;
};

type Props = {
  isOpen: boolean;
  application?: HapApplicationDetails | null;
  onClose: () => void;
  onApprove?: () => void;
  onReject?: () => void;
};

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400">
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-sm text-slate-500">{label}</span>
      <span className="max-w-[55%] break-all text-right text-sm font-semibold text-slate-800">
        {value || "—"}
      </span>
    </div>
  );
}

const ApproveHapModal = ({
  isOpen,
  application,
  onClose,
  onApprove,
  onReject,
}: Props) => {
  if (!isOpen || !application) return null;
  const presence = application.presence || "";
  const href = /^https?:\/\//i.test(presence) ? presence : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={() => void closeIfConfirmed(onClose)}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hap-application-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="hap-application-title" className="text-base font-bold text-slate-900">
              Application Details
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Review the House Affiliate details before approving or rejecting.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void closeIfConfirmed(onClose)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-bold ${application.avatarBg} ${application.avatarText} ${application.avatarBorder}`}
            >
              {application.avatarInitials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{application.name}</p>
              <p className="truncate text-xs text-slate-500">{application.email || "No email"}</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone" value={application.phoneNumber} />
            <DetailRow icon={<Briefcase className="h-4 w-4" />} label="Profession" value={application.profession} />
            <DetailRow icon={<Users className="h-4 w-4" />} label="Network size" value={application.networkSize} />
            <DetailRow icon={<Wallet className="h-4 w-4" />} label="UPI / account" value={application.payoutDetail} />
            <DetailRow
              icon={<Link2 className="h-4 w-4" />}
              label="Website / social"
              value={
                href ? (
                  <a href={href} target="_blank" rel="noreferrer" className="text-violet-700 hover:underline">
                    {presence}
                  </a>
                ) : (
                  presence
                )
              }
            />
            <DetailRow icon={<User className="h-4 w-4" />} label="Submitted" value={application.submittedAt || "—"} />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={() => {
              onReject?.();
              onClose();
            }}
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => {
              onApprove?.();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
          >
            <Check className="h-3.5 w-3.5" />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApproveHapModal;
