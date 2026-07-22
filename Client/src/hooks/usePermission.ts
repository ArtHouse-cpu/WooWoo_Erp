import { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { useAuthStore } from "@/store/authStore";
import type { Permission } from "@/constants/permissions";
import {
  canAccessPath,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  normalizeAccessModules,
} from "@/utils/rbac";

/**
 * Hook to read the logged-in staff permissions.
 * Prefers Redux access_module; falls back to persisted Zustand auth user
 * so refresh still works before Redux is re-hydrated.
 */
export function usePermission() {
  const accessModule = useAppSelector((s) => s.user.access_module);
  const role = useAppSelector((s) => s.user.m_staff_role);
  const authUser = useAuthStore((s) => s.user);

  return useMemo(() => {
    const fromRedux = Array.isArray(accessModule) ? accessModule : [];
    const fromAuth = normalizeAccessModules(
      authUser?.access_module ?? authUser?.permissions,
    );
    const permissions = fromRedux.length > 0 ? fromRedux : fromAuth;
    const effectiveRole =
      role || authUser?.rbacRole?.slug || authUser?.role || null;

    return {
      role: effectiveRole,
      permissions,
      can: (permission: Permission | string) =>
        hasPermission(permissions, permission),
      canAny: (list: Array<Permission | string>) =>
        hasAnyPermission(permissions, list),
      canAll: (list: Array<Permission | string>) =>
        hasAllPermissions(permissions, list),
      canPath: (path: string) => canAccessPath(permissions, path),
    };
  }, [accessModule, role, authUser]);
}
