import React from "react";
import logo from "@/assets/woo_woo_art_house_logo.png";

export type ThermalPrintProps = {
  invoiceNo: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    name: string;
    qty: number;
    price: number;
    discount: number;
  }>;
  totalMRP: number;
  discountTotal: number;
  cashbackAmount?: number;
  finalAmount: number;
  totalDue: number;
  totalQty: number;
  extraCharges?: Array<{ label: string; amount: number }>;
};

export const ThermalPrint: React.FC<ThermalPrintProps> = ({
  invoiceNo,
  date,
  time,
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
  return (
    <div
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        width: "300px",
        margin: "0 auto",
        padding: "10px",
        color: "#000",
        fontSize: "12px",
        lineHeight: "1.4",
        backgroundColor: "#fff",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <img
          src={logo}
          alt="WOOWOO ART HOUSE"
          style={{
            width: "140px",
            height: "auto",
            display: "block",
            margin: "0 auto 6px",
            objectFit: "contain",
          }}
        />
        <h3 style={{ margin: "0 0 5px 0", fontSize: "14px", fontWeight: "bold", textAlign: "center" }}>
          WOOWOO ART HOUSE_BHILAI
        </h3>
        <p style={{ margin: "0", fontSize: "10px", textAlign: "center" }}>
          #20, COMMERCIAL COMPLEX<br />
          NEHRU NAGAR EAST, BHILAI<br />
          DURG, 490020<br />
          PHONE: 8073988123
        </p>
      </div>

      <div style={{ borderBottom: "1px dashed #000", margin: "5px 0" }}></div>

      {/* Customer Info */}
      <div style={{ marginBottom: "5px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: "bold" }}>NAME:</span>
          <span>{customerName || "Walk-in Customer"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: "bold" }}>PHONE:</span>
          <span>{customerPhone || "-"}</span>
        </div>
      </div>

      <div style={{ borderBottom: "1px dashed #000", margin: "5px 0" }}></div>

      {/* Invoice Details */}
      <div style={{ marginBottom: "5px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: "bold" }}>BILL NO:</span>
          <span>{invoiceNo}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: "bold" }}>DATE:</span>
          <span>{date}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: "bold" }}>TIME:</span>
          <span>{time}</span>
        </div>
      </div>

      <div style={{ borderBottom: "1px dashed #000", margin: "5px 0" }}></div>

      {/* Items Table Header */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontWeight: "bold" }}>ITEM NAME</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
          <span>QTY X PRICE</span>
          <span>AMT (DISC)</span>
        </div>
      </div>

      <div style={{ borderBottom: "1px dashed #000", margin: "5px 0" }}></div>

      {/* Items List */}
      <div style={{ marginBottom: "5px" }}>
        {items.map((item, index) => {
          const itemTotal = item.qty * item.price;
          return (
            <div key={index} style={{ marginBottom: "4px" }}>
              <div style={{ fontWeight: "bold" }}>{item.name}</div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  {item.qty} X {item.price.toFixed(2)}
                </span>
                <span>
                  {itemTotal.toFixed(2)} ({item.discount.toFixed(2)})
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ borderBottom: "1px dashed #000", margin: "5px 0" }}></div>

      {/* Summary */}
      <div style={{ marginBottom: "5px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: "bold" }}>ITEMS/QTY:</span>
          <span>
            {items.length} / {totalQty.toFixed(1)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: "bold" }}>TOTAL MRP:</span>
          <span>₹{totalMRP.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: "bold" }}>DISCOUNT:</span>
          <span>₹{discountTotal.toFixed(2)}</span>
        </div>
        {cashbackAmount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "bold" }}>CASHBACK:</span>
            <span>₹{cashbackAmount.toFixed(2)}</span>
          </div>
        )}
        {extraCharges.map((c: { label: string; amount: number }, i: number) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "bold" }}>{(c.label || "Extra Charge").toUpperCase()}:</span>
            <span>₹{Number(c.amount || 0).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div style={{ borderBottom: "1px dashed #000", margin: "5px 0" }}></div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
        <span style={{ fontWeight: "bold" }}>AMOUNT:</span>
        <span style={{ fontWeight: "bold" }}>₹{finalAmount.toFixed(2)}</span>
      </div>

      <div style={{ borderBottom: "1px dashed #000", margin: "5px 0" }}></div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
        <span style={{ fontWeight: "bold" }}>TOTAL DUE:</span>
        <span style={{ fontWeight: "bold" }}>₹{totalDue.toFixed(2)}</span>
      </div>

      <div style={{ borderBottom: "1px dashed #000", margin: "5px 0" }}></div>

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: "10px" }}>
        <div style={{ margin: "10px 0" }}>
          {/* Simple dummy QR code using an img element */}
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=WOOWOO_ART_HOUSE"
            alt="QR Code"
            style={{ width: "100px", height: "100px" }}
          />
          <div style={{ fontSize: "10px", marginTop: "2px" }}>0</div>
        </div>
        <p style={{ fontWeight: "bold", margin: "5px 0" }}>THANK YOU VISIT AGAIN!</p>
        <p style={{ margin: "5px 0" }}>--------*---------*--------</p>
        <p style={{ margin: "5px 0" }}>
          Thank you for your visit !<br />
          See you soon!
        </p>
      </div>
    </div>
  );
};
