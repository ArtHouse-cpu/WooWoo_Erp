import React from "react";
import { ThermalPrint } from "@/features/sales/components/invoice/ThermalPrint";
import type { InvoicePdfInput } from "@/features/sales/components/invoice/types";
import { mapInvoiceToThermalPrintProps } from "@/features/sales/utils/invoicePrintMapper";
import { mapQuotationToThermalPrintProps } from "@/features/sales/utils/quotationPrintMapper";

type Props = {
  invoice: InvoicePdfInput | null | undefined;
  documentType?: string;
};

/**
 * PDF / download entry — same A4 layout as print (`ThermalPrint`).
 * Kept as a named export so existing `pdfGenerator` imports keep working.
 */
export const A4InvoiceTemplate: React.FC<Props> = ({
  invoice: raw,
  documentType = "INVOICE",
}) => {
  const props =
    String(documentType).toUpperCase() === "QUOTATION"
      ? mapQuotationToThermalPrintProps(raw ?? {}, documentType)
      : mapInvoiceToThermalPrintProps(raw ?? {}, documentType);
  return <ThermalPrint {...props} />;
};
