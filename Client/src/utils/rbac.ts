import {
  type Permission,
  isValidPermission,
  MENU_PERMISSION_MAP,
  resolveMenuPermissions,
} from "@/constants/permissions";

/**
 * Pure RBAC helpers for the Admin Client.
 * These check against the user's access_module string[] from Redux.
 *
 * Important: Frontend checks are for UX only.
 * Backend must still enforce the same permissions on APIs.
 */

export function normalizeAccessModules(value: unknown): Permission[] {
  if (!value) return [];

  let raw: unknown[] = [];
  if (Array.isArray(value)) {
    raw = value;
  } else if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      raw = Array.isArray(parsed) ? parsed : [];
    } catch {
      raw = [];
    }
  }

  return [
    ...new Set(
      raw
        .map((v) => String(v || "").trim())
        .filter((v): v is Permission => isValidPermission(v)),
    ),
  ];
}

export function hasPermission(
  userPermissions: string[] | null | undefined,
  required?: Permission | string | null,
): boolean {
  if (!required) return true;
  const list = Array.isArray(userPermissions) ? userPermissions : [];
  return list.includes(required);
}

export function hasAnyPermission(
  userPermissions: string[] | null | undefined,
  requiredList: Array<Permission | string> = [],
): boolean {
  if (!requiredList.length) return true;
  return requiredList.some((p) => hasPermission(userPermissions, p));
}

export function hasAllPermissions(
  userPermissions: string[] | null | undefined,
  requiredList: Array<Permission | string> = [],
): boolean {
  if (!requiredList.length) return true;
  return requiredList.every((p) => hasPermission(userPermissions, p));
}

/** Normalize pathname for MENU_PERMISSION_MAP lookups. */
export function normalizeAppPath(path: string): string {
  if (!path) return "/";
  const cleaned = path.split("?")[0].split("#")[0].trim();
  if (!cleaned || cleaned === "/") return "/";
  return cleaned.endsWith("/") ? cleaned.slice(0, -1) : cleaned;
}

/** Permission(s) required to open a path, if mapped. */
export function getRequiredPermissionForPath(
  path: string,
): Permission | Permission[] | undefined {
  return MENU_PERMISSION_MAP[normalizeAppPath(path)];
}

/** Can the user open this path based on MENU_PERMISSION_MAP? (ANY of listed). */
export function canAccessPath(
  userPermissions: string[] | null | undefined,
  path: string,
): boolean {
  const required = getRequiredPermissionForPath(path);
  // Unmapped paths: allow (tighten when every screen is in the map)
  if (!required) return true;
  return hasAnyPermission(userPermissions, resolveMenuPermissions(required));
}
