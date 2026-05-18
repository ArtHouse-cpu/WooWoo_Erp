import React from "react";
import logo from "@/assets/images/logo/woo_woo_art_house_logo.png";
import {
  PDF_INLINE_IMAGE_PLACEHOLDER,
  type InvoicePdfInput,
  type InvoicePdfItem,
} from "@/features/sales/components/invoice/types";

type Props = {
  invoice: InvoicePdfInput | null | undefined;
  documentType?: string;
};

/** Reference-style accent (invoice totals / highlights) */
const ACCENT_ORANGE = "#FF9900";
const BAR_GREY = "#e7e9ec";
const BORDER = "#111827";
const TEXT_MUTED = "#6b7280";
const TITLE_GREY = "#d1d5db";

const SELLER_LEGAL_NAME = "WOOWOO ART HOUSE";
const SELLER_ADDRESS_LINES = [
  "#20 Commercial Complex, Nehru Nagar East",
  "Bhilai, Durg, Chhattisgarh — 490020",
];
const SELLER_CONTACT = "+91 8073988123 • myyarthouse@gmail.com";

const FONT_STACK =
  'Arial, Helvetica, "Segoe UI", Roboto, "Noto Sans", sans-serif';

const BELOW_20 = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function twoDigitsWords(n: number): string {
  if (n < 20) return BELOW_20[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return TENS[t] + (u ? " " + BELOW_20[u] : "");
}

function threeDigitsWords(n: number): string {
  const h = Math.floor(n / 100);
  const rem = n % 100;
  let s = "";
  if (h) s += BELOW_20[h] + " Hundred";
  if (rem) s += (s ? " " : "") + twoDigitsWords(rem);
  return s || "";
}

function rupeesToWords(num: number): string {
  let n = Math.floor(Math.abs(num));
  if (n === 0) return "Zero";

  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;

  if (crore) parts.push(threeDigitsWords(crore) + " Crore");
  if (lakh) parts.push(threeDigitsWords(lakh) + " Lakh");
  if (thousand) parts.push(threeDigitsWords(thousand) + " Thousand");
  if (n) parts.push(threeDigitsWords(n));

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function formatRupee(n: number): string {
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function safeParseDateDisplay(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalizeCustomerAddress(
  addr: InvoicePdfInput["customerAddress"],
): string[] {
  if (!addr) return [];
  if (Array.isArray(addr)) return addr.map((s) => String(s).trim()).filter(Boolean);
  return String(addr)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type ComputedLine = {
  idx: number;
  descriptionLines: string[];
  unitPrice: number;
  qty: number;
  netAmount: number;
  taxPercent: number | null;
  taxType: string;
  taxAmount: number;
  totalAmount: number;
};

function computeInvoiceLines(
  items: InvoicePdfItem[],
  defaultTaxPct: number | null,
): ComputedLine[] {
  return items.map((item, idx) => {
    const qty = Number(item.qty ?? 0);
    const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
    const discount = Number(item.discount ?? 0);
    const netRaw = qty * unitPrice - discount;
    const netAmount = Math.max(0, Math.round(netRaw * 100) / 100);

    let taxPct: number | null =
      typeof item.taxPercent === "number"
        ? item.taxPercent
        : typeof item.taxRate === "number"
          ? item.taxRate
          : defaultTaxPct;

    if (taxPct !== null && Number.isNaN(taxPct)) taxPct = null;

    const taxType = String(item.taxType || "GST").trim() || "GST";

    const taxAmount =
      typeof item.taxAmount === "number" && !Number.isNaN(item.taxAmount)
        ? Math.round(item.taxAmount * 100) / 100
        : taxPct !== null
          ? Math.round(netAmount * (taxPct / 100) * 100) / 100
          : 0;

    const totalAmount =
      typeof item.totalAmount === "number" && !Number.isNaN(item.totalAmount)
        ? Math.round(item.totalAmount * 100) / 100
        : Math.round((netAmount + taxAmount) * 100) / 100;

    const title =
      item.description?.trim() ||
      item.productName?.trim() ||
      item.name?.trim() ||
      "Item";

    const sku = item.productCode || item.sku;
    const hsn = item.hsnCode || item.hsn;

    const descriptionLines = [
      title,
      ...(sku ? [`Model / SKU: ${sku}`] : []),
      ...(hsn ? [`HSN/SAC: ${hsn}`] : []),
    ];

    return {
      idx: idx + 1,
      descriptionLines,
      unitPrice,
      qty,
      netAmount,
      taxPercent: taxPct,
      taxType,
      taxAmount,
      totalAmount,
    };
  });
}

export const A4InvoiceTemplate: React.FC<Props> = ({ invoice: raw, documentType = "INVOICE" }) => {
  const invoice = raw ?? {};

  const invoiceNo =
    invoice.invoiceCode ??
    invoice.returnCode ??
    invoice.subscriptionCode ??
    (invoice.invoiceNumber != null ? String(invoice.invoiceNumber): "—");

  const billNumber = invoice.billNumber??invoice.subscriptionCode??invoiceNo?? "—";
  const customerName = (invoice.customerName || "Walk-in Customer").toUpperCase();
  const customerPhone = invoice.customerPhone || "—";
  const customerAddrLines = normalizeCustomerAddress(invoice.customerAddress);

  const billDate = safeParseDateDisplay(invoice.invoiceDate);
  const dueDate = safeParseDateDisplay(invoice.dueDate);
  const periodStart = safeParseDateDisplay(invoice.billPeriodStart);
  const periodEnd = safeParseDateDisplay(invoice.billPeriodEnd);

  const accountNumber =
    invoice.accountNumber ?? "—";

  const items: InvoicePdfItem[] = Array.isArray(invoice.items)
    ? invoice.items
    : [];

  const defaultTaxPct =
    typeof invoice.taxPercent === "number" && !Number.isNaN(invoice.taxPercent)
      ? invoice.taxPercent
      : null;

  const lines = computeInvoiceLines(items, defaultTaxPct);

  const sumNet =
    Math.round(lines.reduce((s, r) => s + r.netAmount, 0) * 100) / 100;

  const sumTax =
    typeof invoice.taxTotal === "number" && !Number.isNaN(invoice.taxTotal)
      ? Math.round(invoice.taxTotal * 100) / 100
      : Math.round(lines.reduce((s, r) => s + r.taxAmount, 0) * 100) / 100;

  const grandTotal = Number(invoice.grandTotal ?? sumNet + sumTax);
  const discountTotal = Number(invoice.discountTotal ?? 0);
  const couponDiscount = Number(invoice.coupon?.discountAmount ?? 0);
  const itemLevelDiscount = Math.max(0, discountTotal - couponDiscount);

  const subTotalReported =
    typeof invoice.subTotal === "number"
      ? invoice.subTotal
      : sumNet;

  const amountWordsBase = Math.round(grandTotal);
  const amountInWords =
    `${rupeesToWords(amountWordsBase)} Rupees Only`.replace(/\s+/g, " ");

  const paymentBreakdown = invoice.paymentBreakdown || {};
  const cashPaid = Number(paymentBreakdown.cash || 0);
  const upiPaid = Number(paymentBreakdown.upi || 0);
  const cardPaid = Number(paymentBreakdown.card || 0);
  const walletPaid = Number(paymentBreakdown.wallet || 0);

  const rawMode = String(invoice.paymentMode ?? invoice.mode ?? "—").trim().toUpperCase();
  let paymentModeDisplay = "—";

  if (rawMode === "MULTI") {
    const parts: string[] = [];
    if (cashPaid > 0) parts.push(`Cash: ₹${cashPaid.toFixed(2)}`);
    if (upiPaid > 0) parts.push(`UPI: ₹${upiPaid.toFixed(2)}`);
    if (cardPaid > 0) parts.push(`Card: ₹${cardPaid.toFixed(2)}`);
    if (walletPaid > 0) parts.push(`Wallet: ₹${walletPaid.toFixed(2)}`);
    paymentModeDisplay = parts.join(", ") || "Multi-mode";
  } else if (rawMode && rawMode !== "—") {
    if (rawMode === "UPI") {
      paymentModeDisplay = "UPI";
    } else {
      paymentModeDisplay = rawMode.charAt(0).toUpperCase() + rawMode.slice(1).toLowerCase();
    }
  }

  const salesPerson = invoice.salesPersonName || "—";

  const showBillPeriod =
    invoice.billPeriodStart &&
    invoice.billPeriodEnd &&
    periodStart !== "—" &&
    periodEnd !== "—";

  const cell: React.CSSProperties = {
    border: `1px solid ${BORDER}`,
    padding: "8px 10px",
    fontSize: "11px",
    verticalAlign: "top",
    textAlign: "left",
  };

  const th: React.CSSProperties = {
    ...cell,
    background: BAR_GREY,
    fontWeight: 700,
    whiteSpace: "nowrap",
  };

  const signatureSrc =
    typeof invoice.signatureUrl === "string" &&
    invoice.signatureUrl.trim() !== ""
      ? invoice.signatureUrl
      : null;

  return (
    <div
      data-invoice-pdf-root
      style={{
        width: "794px",
        background: "#ffffff",
        padding: "28px 32px 36px",
        fontFamily: FONT_STACK,
        color: BORDER,
        boxSizing: "border-box",
      }}
    >
      {/* Header: logo + INVOICE */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "12px",
        }}
      >
        <img
          src={logo}
          alt=""
          style={{
            height: "44px",
            width: "auto",
            objectFit: "contain",
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = PDF_INLINE_IMAGE_PLACEHOLDER;
          }}
        />
        <div
          style={{
            fontSize: "42px",
            fontWeight: 800,
            color: TITLE_GREY,
            letterSpacing: "4px",
            lineHeight: 1,
          }}
        >
          {documentType}
        </div>
      </div>

      {/* Grey bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: BAR_GREY,
          border: `1px solid ${BORDER}`,
          padding: "10px 14px",
          fontWeight: 700,
          fontSize: "13px",
          marginBottom: "0",
        }}
      >
        <span>Customer</span>
        <span>{documentType} NO — {invoiceNo}</span>
      </div>

      {/* Customer + billing */}
      <div
        style={{
          display: "flex",
          border: `1px solid ${BORDER}`,
          borderTop: "none",
          minHeight: "120px",
        }}
      >
        <div
          style={{
            flex: "1",
            padding: "14px 16px",
            borderRight: `1px solid ${BORDER}`,
            fontSize: "12px",
            lineHeight: 1.55,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "8px" }}>
            {customerName}
          </div>
          {customerAddrLines.length > 0 ? (
            customerAddrLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))
          ) : (
            <>
              <div style={{ color: TEXT_MUTED }}>Tel: {customerPhone}</div>
            </>
          )}
          {customerAddrLines.length > 0 && (
            <div style={{ marginTop: "8px" }}>Tel: {customerPhone}</div>
          )}
        </div>
        <div
          style={{
            width: "320px",
            padding: "14px 16px",
            fontSize: "12px",
            lineHeight: 1.7,
          }}
        >
          <RowKV label="Bill Date" value={billDate} />
          <RowKV label="Account Number" value={String(accountNumber)} />
          <RowKV label="Bill Number" value={String(billNumber)} />
          <RowKV label="Due Date" value={dueDate} />
          <RowKV label="Payment Mode" value={paymentModeDisplay} />
          <RowKV label="Sales Person" value={salesPerson} />
        </div>
      </div>

      {showBillPeriod && (
        <div
          style={{
            background: BAR_GREY,
            border: `1px solid ${BORDER}`,
            borderTop: "none",
            padding: "8px 14px",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          Bill Period: {periodStart} to {periodEnd}
        </div>
      )}

      {/* Line items table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border: `1px solid ${BORDER}`,
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        <thead>
          <tr>
            <th style={{ ...th, width: "36px" }}>Sl.</th>
            <th style={{ ...th, minWidth: "180px" }}>Description</th>
            <th style={{ ...th, textAlign: "right" }}>Unit Price</th>
            <th style={{ ...th, width: "44px", textAlign: "center" }}>Qty</th>
            <th style={{ ...th, textAlign: "right" }}>Net Amount</th>
            <th style={{ ...th, textAlign: "right", width: "52px" }}>
              Tax %
            </th>
            <th style={{ ...th, width: "56px" }}>Tax Type</th>
            <th style={{ ...th, textAlign: "right" }}>Tax Amount</th>
            <th style={{ ...th, textAlign: "right", minWidth: "88px" }}>
              Total Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ ...cell, textAlign: "center", color: TEXT_MUTED }}>
                No line items on this invoice.
              </td>
            </tr>
          ) : (
            lines.map((row) => (
              <tr key={row.idx}>
                <td style={{ ...cell, textAlign: "center" }}>{row.idx}</td>
                <td style={cell}>
                  {row.descriptionLines.map((line, i) => (
                    <div key={i} style={{ marginBottom: i ? 4 : 0 }}>
                      {line}
                    </div>
                  ))}
                </td>
                <td style={{ ...cell, textAlign: "right" }}>
                  {formatRupee(row.unitPrice)}
                </td>
                <td style={{ ...cell, textAlign: "center" }}>{row.qty}</td>
                <td style={{ ...cell, textAlign: "right" }}>
                  {formatRupee(row.netAmount)}
                </td>
                <td style={{ ...cell, textAlign: "right" }}>
                  {row.taxPercent !== null ? `${row.taxPercent}%` : "—"}
                </td>
                <td style={cell}>{row.taxType}</td>
                <td style={{ ...cell, textAlign: "right" }}>
                  {formatRupee(row.taxAmount)}
                </td>
                <td style={{ ...cell, textAlign: "right", fontWeight: 600 }}>
                  {formatRupee(row.totalAmount)}
                </td>
              </tr>
            ))
          )}
          {lines.length > 0 && (
            <tr>
              <td
                colSpan={7}
                style={{
                  ...cell,
                  textAlign: "right",
                  fontWeight: 700,
                  borderRight: `1px solid ${BORDER}`,
                }}
              >
                Total
              </td>
              <td
                style={{
                  ...cell,
                  textAlign: "right",
                  fontWeight: 800,
                  background: ACCENT_ORANGE,
                  color: "#111827",
                }}
              >
                {formatRupee(sumTax)}
              </td>
              <td
                style={{
                  ...cell,
                  textAlign: "right",
                  fontWeight: 800,
                  background: ACCENT_ORANGE,
                  color: "#111827",
                }}
              >
                {formatRupee(grandTotal)}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Amount in words + signature */}
      <div
        style={{
          display: "flex",
          border: `1px solid ${BORDER}`,
          borderTop: "none",
          minHeight: "110px",
        }}
      >
        <div style={{ flex: 1, padding: "12px 14px", fontSize: "11px" }}>
          <div style={{ fontWeight: 700, marginBottom: "6px" }}>
            Amount in Words:
          </div>
          <div style={{ lineHeight: 1.5 }}>{amountInWords}</div>
          {discountTotal > 0 && (
            <div style={{ marginTop: "10px", color: TEXT_MUTED }}>
              Savings / Discount applied: {formatRupee(discountTotal)}
            </div>
          )}
          {couponDiscount > 0 && (
            <div style={{ marginTop: "6px", color: TEXT_MUTED }}>
              Coupon Discount ({invoice.coupon?.code ?? "COUPON"}):{" "}
              {formatRupee(couponDiscount)}
            </div>
          )}
        </div>
        <div
          style={{
            width: "260px",
            borderLeft: `1px solid ${BORDER}`,
            padding: "12px 14px",
            fontSize: "11px",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "28px" }}>
            For {SELLER_LEGAL_NAME}:
          </div>
          {signatureSrc ? (
            <img
              src={signatureSrc}
              alt=""
              style={{ maxHeight: "48px", maxWidth: "180px", objectFit: "contain" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div style={{ height: "36px" }} />
          )}
          <div style={{ marginTop: "8px", color: TEXT_MUTED }}>
            Authorized Signatory
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginTop: "12px",
          gap: "16px",
        }}
      >
        <div style={{ fontSize: "11px", color: TEXT_MUTED, maxWidth: "52%" }}>
          Pay / enquiries: visit store or contact{" "}
          <span style={{ color: BORDER }}>{SELLER_CONTACT}</span>
          . Please quote invoice number{" "}
          <strong>{invoiceNo}</strong> for support.
        </div>
        <table
          style={{
            borderCollapse: "collapse",
            width: "260px",
            fontSize: "11px",
          }}
        >
          <tbody>
            <tr>
              <td style={{ ...cell, fontWeight: 600 }}>Subtotal (taxable)</td>
              <td style={{ ...cell, textAlign: "right" }}>
                {formatRupee(subTotalReported)}
              </td>
            </tr>
            <tr>
              <td style={{ ...cell, fontWeight: 600 }}>Taxes</td>
              <td style={{ ...cell, textAlign: "right" }}>
                {formatRupee(sumTax)}
              </td>
            </tr>
            {Array.isArray(invoice.extraCharges) && invoice.extraCharges.map((c: { label: string; amount: number }, i: number) => (
              <tr key={i}>
                <td style={{ ...cell, fontWeight: 600 }}>{c.label || "Extra Charge"}</td>
                <td style={{ ...cell, textAlign: "right" }}>
                  {formatRupee(Number(c.amount || 0))}
                </td>
              </tr>
            ))}
            {itemLevelDiscount > 0 && (
              <tr>
                <td style={{ ...cell, fontWeight: 600 }}>Item Discount</td>
                <td style={{ ...cell, textAlign: "right" }}>
                  - {formatRupee(itemLevelDiscount)}
                </td>
              </tr>
            )}
            {couponDiscount > 0 && (
              <tr>
                <td style={{ ...cell, fontWeight: 600 }}>
                  Coupon Discount ({invoice.coupon?.code ?? "COUPON"})
                </td>
                <td style={{ ...cell, textAlign: "right" }}>
                  - {formatRupee(couponDiscount)}
                </td>
              </tr>
            )}
            <tr>
              <td
                style={{
                  ...cell,
                  fontWeight: 800,
                  background: ACCENT_ORANGE,
                }}
              >
                Total payable
              </td>
              <td
                style={{
                  ...cell,
                  textAlign: "right",
                  fontWeight: 800,
                  background: ACCENT_ORANGE,
                }}
              >
                {formatRupee(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment slip */}
      <div
        style={{
          marginTop: "28px",
          paddingTop: "16px",
          borderTop: `2px dashed ${BORDER}`,
          fontSize: "11px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontWeight: 600,
            marginBottom: "14px",
          }}
        >
          Payment slip — please retain for your records
        </div>
        <div style={{ display: "flex", border: `1px solid ${BORDER}` }}>
          <div
            style={{
              flex: 1,
              padding: "12px",
              borderRight: `1px solid ${BORDER}`,
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 700 }}>{customerName}</div>
            {customerAddrLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            <div>Tel: {customerPhone}</div>
          </div>
          <div style={{ width: "280px", padding: "12px", lineHeight: 1.6 }}>
            <RowKV label="Invoice No" value={String(invoiceNo)} compact />
            <RowKV label="Bill Date" value={billDate} compact />
            <RowKV label="Account Number" value={String(accountNumber)} compact />
            <RowKV label="Bill Number" value={String(billNumber)} compact />
            <RowKV label="Due Date" value={dueDate} compact />
            <RowKV label="Payment Mode" value={paymentModeDisplay} compact />
          </div>
        </div>
        <div
          style={{
            marginTop: "10px",
            padding: "10px 12px",
            border: `1px solid ${BORDER}`,
            background: ACCENT_ORANGE,
            fontWeight: 800,
            fontSize: "13px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Total due</span>
          <span>{formatRupee(grandTotal)}</span>
        </div>
        <div
          style={{
            marginTop: "14px",
            fontSize: "9px",
            color: TEXT_MUTED,
            lineHeight: 1.45,
          }}
        >
          This is a computer-generated invoice for {SELLER_LEGAL_NAME}. Tax break-up
          is shown where applicable as supplied in your billing records. Subject to
          applicable laws in India.
        </div>
      </div>

      {/* Seller block footer */}
      <div
        style={{
          marginTop: "18px",
          fontSize: "10px",
          color: TEXT_MUTED,
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: BORDER }}>{SELLER_LEGAL_NAME}</strong>
        <br />
        {SELLER_ADDRESS_LINES.join(" • ")}
        <br />
        {SELLER_CONTACT}
      </div>
    </div>
  );
};

function RowKV({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "12px",
        marginBottom: compact ? "4px" : "6px",
        fontSize: compact ? "11px" : "12px",
      }}
    >
      <span style={{ color: TEXT_MUTED }}>{label}:</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}
