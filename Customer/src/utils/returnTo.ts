const RETURN_KEY = "customer_return_to";

/** Only the invoice deep link is restored after login. */
export function isInvoiceReturnPath(path: string) {
  return /^\/activities\/[a-f0-9]{24}\/?$/i.test(path);
}

export function rememberReturnTo(path: string) {
  if (isInvoiceReturnPath(path)) {
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
  return candidates.find((path) => isInvoiceReturnPath(path)) || null;
}

export function consumeReturnTo(state?: unknown): string | null {
  const path = readReturnTo(state);
  sessionStorage.removeItem(RETURN_KEY);
  return path;
}
