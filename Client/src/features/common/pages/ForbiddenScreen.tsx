import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import { useAuthStore } from "@/store/authStore";
import { useAppDispatch } from "@/store/hooks";
import { logout as logoutUser } from "@/store/slices/userSlice";

type ForbiddenScreenProps = {
  /** Permission key that was required for this path */
  requiredPermission?: string | null;
  path?: string;
};

/**
 * Shown when the user is logged in but lacks permission for the current route.
 * Frontend UX only — APIs still enforce independently (Step 6).
 */
export default function ForbiddenScreen({
  requiredPermission,
  path,
}: ForbiddenScreenProps) {
  const { canPath } = usePermission();
  const logoutAuth = useAuthStore((s) => s.logout);
  const dispatch = useAppDispatch();

  const handleLogout = () => {
    logoutAuth();
    dispatch(logoutUser());
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <ShieldOff className="h-14 w-14 text-gray-400 mb-4" aria-hidden />
      <h1 className="text-2xl font-semibold text-black mb-2">Access denied</h1>
      <p className="text-gray-500 max-w-md mb-2">
        You are signed in, but your role does not include permission for this page.
      </p>
      {path ? (
        <p className="text-sm text-gray-400 mb-1">
          Path: <span className="font-mono text-gray-600">{path}</span>
        </p>
      ) : null}
      {requiredPermission ? (
        <p className="text-sm text-gray-400 mb-6">
          Required:{" "}
          <span className="font-mono text-gray-700">{requiredPermission}</span>
        </p>
      ) : (
        <div className="mb-6" />
      )}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {canPath("/") ? (
          <Link
            to="/"
            className="bg-black text-white py-3 px-6 rounded-xl text-sm font-semibold"
          >
            Go to dashboard
          </Link>
        ) : null}
        <button
          type="button"
          onClick={handleLogout}
          className="border border-gray-300 text-gray-800 py-3 px-6 rounded-xl text-sm font-semibold"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
