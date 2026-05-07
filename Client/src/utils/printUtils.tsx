import { renderToString } from "react-dom/server";
import { ThermalPrint } from "@/features/sales/components/invoice/ThermalPrint";

export const printThermalReceipt = (data: {
  invoiceNo: string;
  subscriptionCode: string;
  customerName: string;
  customerPhone: string;
  items: Array<{ name: string; qty: number; price: number; discount: number }>;
  totalMRP: number;
  discountTotal: number;
  finalAmount: number;
  totalDue: number;
  totalQty: number;
}) => {
  const printWindow = window.open("", "_blank", "width=850,height=700");
  if (!printWindow) return;

  const today = new Date().toISOString().split("T")[0];
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = renderToString(
    <ThermalPrint
      invoiceNo={data.invoiceNo}
      date={today}
      time={time}
      customerName={data.customerName}
      customerPhone={data.customerPhone}
      items={data.items}
      totalMRP={data.totalMRP}
      discountTotal={data.discountTotal}
      finalAmount={data.finalAmount}
      totalDue={data.totalDue}
      totalQty={data.totalQty}
    />
  );

  printWindow.document.write(`
    <html>
      <head>
        <title>Receipt ${data.invoiceNo}</title>
        <base href="${window.location.origin}">
        <style>
          @page { margin: 0; }
          body { margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};
