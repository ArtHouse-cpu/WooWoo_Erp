/** Inline image used when product URL is missing or unsafe for PDF rasterization */
export const PDF_INLINE_IMAGE_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect fill="#f1f5f9" width="64" height="64"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-size="10">IMG</text></svg>',
  );

export type InvoiceItem = {
  id: number;
  productName: string;
  qty: number;
  unitPrice: number;
  discount: number;
  cashback: number;
  image?: string;
  category?: string;
};

/** API / POS raw invoice shape used by PDF and print templates */
export type InvoicePdfItem = {
  productName?: string;
  name?: string;
  description?: string;
  productCode?: string;
  sku?: string;
  hsnCode?: string;
  hsn?: string;
  qty?: number;
  unitPrice?: number;
  price?: number;
  discount?: number;
  taxPercent?: number;
  taxRate?: number;
  taxType?: string;
  taxAmount?: number;
  netAmount?: number;
  totalAmount?: number;
  image?: string;
};

export type InvoicePdfInput = {
  invoiceCode?: string;
  returnCode?: string;
  invoiceNumber?: string | number;
  billNumber?: string;
  subscriptionCode?: string;
  customerName?: string;
  customerPhone?: string;
  /** Multi-line postal address */
  customerAddress?: string | string[];
  accountNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  billPeriodStart?: string;
  billPeriodEnd?: string;
  salesPersonName?: string;
  notes?: string;
  items?: InvoicePdfItem[];
  subTotal?: number;
  grandTotal?: number;
  discountTotal?: number;
  extraCharges?: Array<{ label: string; amount: number }>;
  coupon?: {
    code?: string;
    title?: string;
    discountType?: string;
    discountValue?: number;
    discountAmount?: number;
  };
  /** Aggregate tax if API sends it */
  taxTotal?: number;
  /** Default GST % when line items omit tax */
  taxPercent?: number;
  mode?: string;
  status?: string;
  /** Authorized signatory image URL if stored */
  signatureUrl?: string;
  /** Hosted PDF / viewer links (included in WhatsApp when API sends them) */
  invoicePdfUrl?: string;
  invoiceViewUrl?: string;
  paymentLink?: string;
  publicInvoiceUrl?: string;
  swipeLink?: string;
  swipeInvoiceUrl?: string;
  shareUrl?: string;
  viewUrl?: string;
  paymentBreakdown?: {
    paidAmount?: number;
    cash?: number;
    upi?: number;
    card?: number;
    wallet?: number;
    dueAmount?: number;
    changeAmount?: number;
  };
};
