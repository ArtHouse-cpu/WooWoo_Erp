import { renderToString } from "react-dom/server";
import { ThermalPrint } from "@/features/sales/components/invoice/ThermalPrint";
import { mapInvoiceToThermalPrintProps } from "@/features/sales/utils/invoicePrintMapper";

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
  documentType?: string;
  /** When set, overrides auto "today" for invoice date */
  date?: string;
}) => {
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) return;

  const today = new Date();
  const date =
    data.date ||
    today.toLocaleDateString("en-IN", {
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
      documentType={data.documentType || "INVOICE"}
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
            height: 100%;
          }
          [data-invoice-pdf-root] {
            min-height: calc(297mm - 20mm) !important;
            height: auto;
            display: flex !important;
            flex-direction: column !important;
          }
          @media print {
            html, body { height: auto; min-height: 100%; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            [data-invoice-pdf-root] {
              min-height: calc(297mm - 20mm) !important;
            }
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

/** Print A4 invoice from a saved API invoice payload (same layout as download). */
export const printInvoiceDocument = (
  raw: unknown,
  documentType = "INVOICE",
) => {
  const props = mapInvoiceToThermalPrintProps(raw, documentType);
  printThermalReceipt({
    invoiceNo: props.invoiceNo,
    customerName: props.customerName,
    customerPhone: props.customerPhone,
    items: props.items,
    totalMRP: props.totalMRP,
    discountTotal: props.discountTotal,
    cashbackAmount: props.cashbackAmount,
    finalAmount: props.finalAmount,
    totalDue: props.totalDue,
    totalQty: props.totalQty,
    extraCharges: props.extraCharges,
    salesPerson: props.salesPerson,
    dueDate: props.dueDate,
    membershipType: props.membershipType,
    documentType: props.documentType,
    date: props.date,
  });
};
