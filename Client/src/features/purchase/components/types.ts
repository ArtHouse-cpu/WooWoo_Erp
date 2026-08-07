export type InvoiceItem = {
  id: number;
  productName: string;
  qty: number;
  unitPrice: number;
  /** Catalogue selling price (display-only on purchase UI) */
  sellingPrice?: number;
  discount: number;
  image?: string;
};
