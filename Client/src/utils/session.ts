import Swal from "sweetalert2";
import { useAuthStore } from "@/store/authStore";
import { store } from "@/store/redux";
import { logout as logoutUser } from "@/store/slices/userSlice";

const AUTH_STORAGE_KEY = "auth-storage";
const REDUX_USER_KEY = "wooerp-redux-user";

let logoutInFlight = false;

/** Public auth endpoints — 401 here is a normal failed login/OTP, not session expiry. */
const PUBLIC_AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/request-otp",
  "/auth/request-email-otp",
  "/auth/verify-otp",
  "/auth/forgot-password",
];

/**
 * Authenticated business checks that may return 401/400 for a wrong secondary
 * credential (e.g. Staff PIN). Must NOT force-logout the ERP session.
 */
const NON_SESSION_401_PATHS = ["/access/staff/verify-pin"];

export function isPublicAuthRequest(url = ""): boolean {
  const path = url.split("?")[0];
  return PUBLIC_AUTH_PATHS.some((p) => path.includes(p));
}

export function isNonSessionAuthFailure(url = ""): boolean {
  const path = url.split("?")[0];
  return NON_SESSION_401_PATHS.some((p) => path.includes(p));
}

/** Read JWT `exp` (ms). Returns null if missing/invalid. */
export function getTokenExpiryMs(token: string | null | undefined): number | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string | null | undefined): boolean {
  const exp = getTokenExpiryMs(token);
  if (exp == null) return false;
  // small skew so we logout slightly before hard expiry
  return Date.now() >= exp - 5_000;
}

type ForceLogoutOptions = {
  reason?: "expired" | "unauthorized" | "manual";
  silent?: boolean;
  redirectTo?: string;
};

/**
 * Clear client auth state and send user to login.
 * Safe to call many times — only runs once until navigation completes.
 */
export function forceLogout(options: ForceLogoutOptions = {}) {
  const {
    reason = "unauthorized",
    silent = false,
    redirectTo = "/login",
  } = options;

  if (logoutInFlight) return;
  logoutInFlight = true;

  useAuthStore.getState().logout();
  store.dispatch(logoutUser());

  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(REDUX_USER_KEY);
  } catch {
    console.error("Failed to logout");
    toast.error("Failed to logout");
  }

  const alreadyOnAuthPage =
    typeof window !== "undefined" &&
    ["/login", "/signup", "/otp"].some((p) =>
      window.location.pathname.startsWith(p),
    );

  const finish = () => {
    if (!alreadyOnAuthPage && typeof window !== "undefined") {
      window.location.assign(redirectTo);
    } else {
      logoutInFlight = false;
    }
  };

  if (silent || alreadyOnAuthPage) {
    finish();
    return;
  }

  const text =
    reason === "expired"
      ? "Your session has expired. Please sign in again."
      : "Your session is no longer valid. Please sign in again.";

  void Swal.fire({
    icon: "warning",
    title: "Session expired",
    text,
    confirmButtonText: "Sign in",
    confirmButtonColor: "#141210",
    allowOutsideClick: false,
  }).then(() => finish());
}
