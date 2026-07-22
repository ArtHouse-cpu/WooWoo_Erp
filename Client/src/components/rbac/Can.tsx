import type { ReactNode } from "react";
import type { Permission } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";

type CanProps = {
  /** Single permission required */
  permission?: Permission | string;
  /** Pass if ANY of these permissions is enough */
  anyOf?: Array<Permission | string>;
  /** Pass if ALL of these permissions are required */
  allOf?: Array<Permission | string>;
  children: ReactNode;
  /** Optional fallback when not allowed (default: render nothing) */
  fallback?: ReactNode;
};

/**
 * Conditionally render UI by permission.
 *
 * Examples:
 *   <Can permission={PERMISSIONS.INVOICE_CREATE}><button>Create</button></Can>
 *   <Can anyOf={[PERMISSIONS.AFFILIATE_READ, PERMISSIONS.AFFILIATE_MANAGE]}>...</Can>
 *
 * Note: This only hides UI. Backend APIs must still enforce permissions.
 */
export default function Can({
  permission,
  anyOf,
  allOf,
  children,
  fallback = null,
}: CanProps) {
  const { can, canAny, canAll } = usePermission();

  let allowed = true;
  if (permission) allowed = can(permission);
  if (allowed && anyOf?.length) allowed = canAny(anyOf);
  if (allowed && allOf?.length) allowed = canAll(allOf);

  return <>{allowed ? children : fallback}</>;
}
