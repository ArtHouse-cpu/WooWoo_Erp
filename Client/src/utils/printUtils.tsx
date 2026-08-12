import { renderToString } from "react-dom/server";
import { ThermalPrint } from "@/features/sales/components/invoice/ThermalPrint";

export const printThermalReceipt = (data: {
  invoiceNo: string;
  subscriptionCode?: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    name: string;
    qty: number;
    price: number;
    discount: number;
    itemCode?: string;
    hsn?: string;
  }>;
  totalMRP: number;
  discountTotal: number;
  cashbackAmount?: number;
  finalAmount: number;
  totalDue: number;
  totalQty: number;
  extraCharges?: Array<{ label: string; amount: number }>;
  salesPerson?: string;
  dueDate?: string;
  membershipType?: string;
}) => {
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) return;

  const today = new Date();
  const date = today.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = today.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = renderToString(
    <ThermalPrint
      invoiceNo={data.invoiceNo}
      date={date}
      time={time}
      dueDate={data.dueDate || date}
      salesPerson={data.salesPerson}
      membershipType={data.membershipType}
      customerName={data.customerName}
      customerPhone={data.customerPhone}
      items={data.items}
      totalMRP={data.totalMRP}
      discountTotal={data.discountTotal}
      cashbackAmount={data.cashbackAmount}
      finalAmount={data.finalAmount}
      totalDue={data.totalDue}
      totalQty={data.totalQty}
      extraCharges={data.extraCharges}
    />,
  );

  printWindow.document.write(`
    <html>
      <head>
        <title>Invoice ${data.invoiceNo}</title>
        <base href="${window.location.origin}">
        <style>
          @page {
            size: A4;
            margin: 10mm;
          }
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${html}
        <script>
          window.onload = function () {
            setTimeout(function () {
              window.focus();
              window.print();
            }, 250);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
