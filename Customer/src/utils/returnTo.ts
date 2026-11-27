const RETURN_KEY = "customer_return_to";

const AUTH_PATHS = new Set([
  "/login",
  "/signup",
  "/verify-otp",
  "/forgot-password",
  "/reset-password",
  "/otp-login",
]);

/** Only the invoice deep link is restored after login. */
export function isInvoiceReturnPath(path: string) {
  return /^\/activities\/[a-f0-9]{24}\/?$/i.test(path);
}

/** In-app page the customer was on before login. Auth screens are not restored. */
export function isSafeReturnPath(path: string) {
  const raw = String(path || "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return false;
  let url: URL;
  try {
    url = new URL(raw, "http://local");
  } catch {
    return false;
  }
  if (url.origin !== "http://local") return false;
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  if (pathname === "/" || AUTH_PATHS.has(pathname)) return false;
  if (pathname.startsWith("/onboarding")) return false;
  return true;
}

function isRestorablePath(path: string) {
  return isSafeReturnPath(path);
}

export function rememberReturnTo(path: string) {
  if (isRestorablePath(path)) {
    sessionStorage.setItem(RETURN_KEY, path);
  }
}

export function readReturnTo(state?: unknown): string | null {
  const bag = (state || {}) as {
    from?: { pathname?: string; search?: string };
    returnTo?: string;
  };
  const fromLocation = `${bag.from?.pathname || ""}${bag.from?.search || ""}`;
  const candidates = [bag.returnTo || "", fromLocation, sessionStorage.getItem(RETURN_KEY) || ""];
  return candidates.find((path) => isRestorablePath(path)) || null;
}

export function consumeReturnTo(state?: unknown): string | null {
  const path = readReturnTo(state);
  sessionStorage.removeItem(RETURN_KEY);
  return path;
}
