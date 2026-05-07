/** Customer-facing WhatsApp copy — WOOWOO ART HOUSE */

export const WOOWOO_GOOGLE_REVIEW_URL =
  "https://search.google.com/local/writereview?placeid=ChIJUybR3a49KToRzviTNfAYVEU";

export type InvoiceWhatsAppSharePayload = {
  customerName: string;
  docLabel: string;
  docCode: string;
  totalFormatted: string;
  paymentStatus: string;
  externalLink?: string;
};
export function normalizeIndianWhatsAppDigits(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const last10 = digits.slice(-10);
  return `91${last10}`;
}

export function buildWoowooInvoiceWhatsAppMessage(
  p: InvoiceWhatsAppSharePayload,
): string {
  const lines: string[] = [
    `Hello *${p.customerName}*,`,
    "",
    "Thank you for being Member of Art House !",
    "",
    `*${p.docLabel}: ${p.docCode}*`,
    `*Total: ${p.totalFormatted}*`,
    `*Payment Status: ${p.paymentStatus}*`,
  ];

  const link = p.externalLink?.trim();
  if (link) {
    lines.push(`*Link:* ${link}`);
  }

  lines.push(
    "",
    "Always a pleasure to have you, see you again.",
    "",
    "Notes:",
    "- Kindly save this number for future communication & updates.",
    "- Enjoy hassle-free, one-day returns & exchanges on select products. T&Cs Apply.",
    "",
    "Thanks",
    "*WOOWOO ART HOUSE_Bhilai*",
    "*8073988123*",
    "Review us on Google here:",
    WOOWOO_GOOGLE_REVIEW_URL,
  );

  return lines.join("\n");
}

export function resolveHostedInvoiceLink(raw: Record<string, unknown>): string {
  const candidates = [
    raw.invoicePdfUrl,
    raw.invoiceViewUrl,
    raw.paymentLink,
    raw.publicInvoiceUrl,
    raw.swipeLink,
    raw.swipeInvoiceUrl,
    raw.shareUrl,
    raw.viewUrl,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c.trim();
  }
  return "";
}
