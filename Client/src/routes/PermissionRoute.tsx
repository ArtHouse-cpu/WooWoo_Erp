import { Outlet, useLocation } from "react-router-dom";
import { usePermission } from "@/hooks/usePermission";
import {
  getRequiredPermissionForPath,
  normalizeAppPath,
} from "@/utils/rbac";
import ForbiddenScreen from "@/features/common/pages/ForbiddenScreen";
export default function PermissionRoute() {
  const location = useLocation();
  const { canPath } = usePermission();
  const path = normalizeAppPath(location.pathname);
  const required = getRequiredPermissionForPath(path);

  if (!canPath(path)) {
    return (
      <ForbiddenScreen
        path={path}
        requiredPermission={required ?? null}
      />
    );
  }

  return <Outlet />;
}
