import { Crown } from "lucide-react";
import type { LeadMembership } from "@/services/apiClient";

export default function LeadMembershipBadge({
  membership,
  className = "",
}: {
  membership?: LeadMembership | null;
  className?: string;
}) {
  if (!membership?.label) return null;
  const title = membership.customerName
    ? `${membership.customerName} has ${membership.label} membership`
    : `${membership.label} membership`;
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ${className}`}
    >
      <Crown size={11} className="shrink-0" />
      <span className="truncate">{membership.label}</span>
    </span>
  );
}
