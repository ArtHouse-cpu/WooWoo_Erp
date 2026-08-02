import type { MembershipPlanPayload } from "@/services/apiClient";
import {
  getMembershipBadgeClassName,
  getMembershipBadgeLabel,
  isEmptyMembership,
} from "../../utils/membershipInvoiceUtils";

type Props = {
  membershipType?: string | null;
  membershipPlanId?: string | null;
  membershipPlans?: MembershipPlanPayload[];
  className?: string;
  /** When true, still render a NONE badge for empty membership. */
  showNone?: boolean;
};

/** Dynamic membership badge — label/colors come from Manage Plans API data. */
export default function MembershipBadge({
  membershipType,
  membershipPlanId,
  membershipPlans = [],
  className = "",
  showNone = true,
}: Props) {
  if (!showNone && isEmptyMembership(membershipType)) return null;

  const label = getMembershipBadgeLabel(
    membershipPlans,
    membershipType,
    membershipPlanId,
  );
  const colorClass = getMembershipBadgeClassName(
    membershipPlans,
    membershipType,
    membershipPlanId,
  );

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${colorClass} ${className}`}
      title={label}
    >
      {label}
    </span>
  );
}
