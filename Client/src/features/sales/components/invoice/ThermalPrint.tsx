import React from "react";
import logo from "@/assets/images/logo/woo_woo_art_house_logo.png";

export type ThermalPrintItem = {
  name: string;
  qty: number;
  price: number;
  discount: number;
  itemCode?: string;
  hsn?: string;
};

export type ThermalPrintProps = {
  invoiceNo: string;
  date: string;
  time?: string;
  dueDate?: string;
  salesPerson?: string;
  customerName: string;
  customerPhone: string;
  membershipType?: string;
  items: ThermalPrintItem[];
  totalMRP: number;
  discountTotal: number;
  cashbackAmount?: number;
  finalAmount: number;
  totalDue: number;
  totalQty: number;
  extraCharges?: Array<{ label: string; amount: number }>;
};

const YELLOW = "#d1d0d0";
const TEXT = "#111111";
const MUTED = "#555555";
const FONT =
  'Arial, Helvetica, "Segoe UI", Roboto, "Noto Sans", sans-serif';

const STORE = {
  name: "WOOWOO ART HOUSE",
  addressLines: [
    "#20, Commercial Complex, Nehru Nagar East,",
    "Bhilai, Durg, CHHATTISGARH, 490020",
  ],
  mobile: "+91 8073988123",
  email: "myyarthouse@gmail.com",
  bank: {
    name: "JSA BOB CC",
    account: "62510500000534",
    ifsc: "BARB0VJBHIL",
    branch: "BHILAI, CHATTISGARH",
  },
};

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
  return s;
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

function formatMoney(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "16px",
        marginBottom: "4px",
        fontSize: "12px",
        lineHeight: 1.45,
      }}
    >
      <span style={{ color: MUTED, minWidth: "96px" }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export const ThermalPrint: React.FC<ThermalPrintProps> = ({
  invoiceNo,
  date,
  dueDate,
  salesPerson = "—",
  customerName,
  customerPhone,
  items,
  totalMRP,
  discountTotal,
  cashbackAmount = 0,
  finalAmount,
  totalDue,
  totalQty,
  extraCharges = [],
}) => {
  const amountInWords = `INR ${rupeesToWords(Math.round(finalAmount))} Rupees Only`;
  const upiQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
    `upi://pay?pa=woowooarthouse@upi&pn=${encodeURIComponent(STORE.name)}&am=${finalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(invoiceNo)}`,
  )}`;

  const th: React.CSSProperties = {
    background: YELLOW,
    color: TEXT,
    fontWeight: 700,
    fontSize: "11px",
    padding: "9px 8px",
    textAlign: "left",
    borderBottom: `1px solid ${YELLOW}`,
    whiteSpace: "nowrap",
  };

  const td: React.CSSProperties = {
    padding: "10px 8px",
    fontSize: "12px",
    borderBottom: "1px solid #E5E7EB",
    verticalAlign: "top",
  };

  return (
    <div
      style={{
        width: "794px",
        margin: "0 auto",
        padding: "28px 32px 24px",
        background: "#ffffff",
        color: TEXT,
        fontFamily: FONT,
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "20px",
          marginBottom: "22px",
        }}
      >
        <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
          <img
            src={logo}
            alt="WOOWOO ART HOUSE"
            style={{
              width: "92px",
              height: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
          <div style={{ fontSize: "12px", lineHeight: 1.45, paddingTop: "4px" }}>
            <div style={{ fontWeight: 800, fontSize: "14px", marginBottom: "4px" }}>
              {STORE.name}
            </div>
            {STORE.addressLines.map((line) => (
              <div key={line} style={{ color: MUTED }}>
                {line}
              </div>
            ))}
            <div style={{ marginTop: "4px", color: MUTED }}>
              Mobile: {STORE.mobile}
            </div>
            <div style={{ color: MUTED }}>Email: {STORE.email}</div>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "34px",
              fontWeight: 800,
              color: YELLOW,
              letterSpacing: "1px",
              lineHeight: 1,
            }}
          >
            INVOICE
          </div>
          <div
            style={{
              marginTop: "6px",
              fontSize: "10px",
              fontWeight: 600,
              color: MUTED,
              letterSpacing: "0.4px",
            }}
          >
            ORIGINAL FOR RECIPIENT
          </div>
        </div>
      </div>

      {/* Bill To + Invoice meta */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "24px",
          marginBottom: "18px",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: "12px",
              marginBottom: "6px",
            }}
          >
            Bill To:
          </div>
          <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "2px" }}>
            {customerName || "Walk-in Customer"}
          </div>
          <div style={{ fontSize: "12px", color: MUTED }}>
            Ph: {customerPhone || "—"}
          </div>
        </div>

        <div style={{ minWidth: "260px" }}>
          <MetaRow label="Invoice #" value={invoiceNo || "—"} />
          <MetaRow label="Invoice Date" value={date || "—"} />
          <MetaRow label="Due Date" value={dueDate || date || "—"} />
          <MetaRow label="Billed by " value={salesPerson || "—"} />
        </div>
      </div>

      {/* Items table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "8px",
        }}
      >
        <thead>
          <tr>
            <th style={{ ...th, width: "36px" }}>#</th>
            <th style={{ ...th, minWidth: "180px" }}>Item</th>
            <th style={th}>Item Code</th>
            <th style={th}>HSN/SAC</th>
            <th style={{ ...th, textAlign: "right" }}>Rate / Item</th>
            <th style={{ ...th, textAlign: "center", width: "48px" }}>Qty</th>
            <th style={{ ...th, textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                style={{
                  ...td,
                  textAlign: "center",
                  color: MUTED,
                  padding: "18px 8px",
                }}
              >
                No items
              </td>
            </tr>
          ) : (
            items.map((item, index) => {
              const lineAmount = Number(item.qty) * Number(item.price);
              return (
                <tr key={`${item.name}-${index}`}>
                  <td style={td}>{index + 1}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{item.name}</td>
                  <td style={td}>{item.itemCode || "—"}</td>
                  <td style={td}>{item.hsn || "—"}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    {formatMoney(Number(item.price))}
                  </td>
                  <td style={{ ...td, textAlign: "center" }}>{item.qty}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                    {formatMoney(lineAmount)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Totals block */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "24px",
          marginTop: "8px",
          marginBottom: "18px",
        }}
      >
        <div style={{ fontSize: "12px", color: MUTED, paddingTop: "8px" }}>
          Total Items / Qty : {items.length} / {Number(totalQty || 0)}
        </div>

        <div style={{ minWidth: "280px", fontSize: "12px" }}>
          {discountTotal > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              <span>Discount</span>
              <span>- ₹ {formatMoney(discountTotal)}</span>
            </div>
          )}
          {cashbackAmount > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              <span>Cashback</span>
              <span>- ₹ {formatMoney(cashbackAmount)}</span>
            </div>
          )}
          {extraCharges.map((c, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              <span>{c.label || "Extra Charge"}</span>
              <span>₹ {formatMoney(Number(c.amount || 0))}</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 800,
              fontSize: "15px",
              marginBottom: "8px",
            }}
          >
            <span>Total</span>
            <span>₹ {formatMoney(finalAmount)}</span>
          </div>
          {discountTotal > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px",
                color: MUTED,
              }}
            >
              <span>Total Discount</span>
              <span>₹ {formatMoney(discountTotal)}</span>
            </div>
          )}
          <div
            style={{
              borderTop: `2px solid ${YELLOW}`,
              margin: "10px 0",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
              marginBottom: "6px",
            }}
          >
            <span>Amount Payable</span>
            <span>₹ {formatMoney(finalAmount)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
            }}
          >
            <span>Total Balance due</span>
            <span>₹ {formatMoney(totalDue)}</span>
          </div>
          {totalMRP > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "8px",
                color: MUTED,
                fontSize: "11px",
              }}
            >
              <span>Total MRP</span>
              <span>₹ {formatMoney(totalMRP)}</span>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          textAlign: "right",
          fontSize: "12px",
          marginBottom: "22px",
        }}
      >
        Total amount (in words): <strong>{amountInWords}.</strong>
      </div>

      {/* Footer: QR + Bank + Signature */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "20px",
          marginTop: "8px",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: "12px", marginBottom: "8px" }}>
            Pay using UPI:
          </div>
          <img
            src={upiQrSrc}
            alt="UPI QR"
            style={{ width: "118px", height: "118px", display: "block" }}
          />
        </div>

        <div style={{ flex: 1, fontSize: "12px", lineHeight: 1.55 }}>
          <div style={{ fontWeight: 700, marginBottom: "8px" }}>Bank Details:</div>
          <div>
            <span style={{ color: MUTED }}>Bank: </span>
            <strong>{STORE.bank.name}</strong>
          </div>
          <div>
            <span style={{ color: MUTED }}>Account #: </span>
            <strong>{STORE.bank.account}</strong>
          </div>
          <div>
            <span style={{ color: MUTED }}>IFSC Code: </span>
            <strong>{STORE.bank.ifsc}</strong>
          </div>
          <div>
            <span style={{ color: MUTED }}>Branch: </span>
            <strong>{STORE.bank.branch}</strong>
          </div>
        </div>

        <div style={{ textAlign: "center", minWidth: "180px" }}>
          <div style={{ fontSize: "12px", marginBottom: "8px" }}>
            For {STORE.name}
          </div>
          <div
            style={{
              height: "72px",
              background: "#F3F4F6",
              borderRadius: "4px",
              marginBottom: "8px",
            }}
          />
          <div style={{ fontSize: "11px", color: MUTED }}>Authorized Signatory</div>
        </div>
      </div>

      <div
        style={{
          marginTop: "28px",
          fontSize: "10px",
          color: MUTED,
        }}
      >
        Page 1 / 1 • This is a digitally signed document.
      </div>
    </div>
  );
};
