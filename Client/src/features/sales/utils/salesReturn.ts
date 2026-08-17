export type ReturnableInvoiceItem = {
  productName?: string;
  qty?: number;
  unitPrice?: number;
  discount?: number;
  lineTotal?: number;
  isGift?: boolean;
  returnedQty?: number;
};

export type SelectedReturnLine = {
  lineIndex: number;
  productName: string;
  purchasedQty: number;
  alreadyReturned: number;
  remainingQty: number;
  returnQty: number;
  unitPrice: number;
  discount: number;
  isGift: boolean;
  selected: boolean;
  unitNet: number;
  refundAmount: number;
};

export const roundMoney = (n: number) =>
  Math.round((Number(n) || 0) * 100) / 100;

export function originalLineNetPaid(item: ReturnableInvoiceItem) {
  const qty = Number(item.qty) || 0;
  const unitPrice = Number(item.unitPrice) || 0;
  const discount = Number(item.discount) || 0;
  const stored = Number(item.lineTotal);
  if (Number.isFinite(stored) && stored >= 0) return stored;
  return Math.max(0, qty * unitPrice - discount);
}

export function lineNet(item: ReturnableInvoiceItem) {
  return originalLineNetPaid(item);
}

export function remainingQty(item: ReturnableInvoiceItem) {
  const purchased = Number(item.qty) || 0;
  const returned = Math.max(0, Number(item.returnedQty) || 0);
  return Math.max(0, purchased - returned);
}

export function buildReturnLines(invoice: any): SelectedReturnLine[] {
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  return items.map((item: ReturnableInvoiceItem, lineIndex: number) => {
    const purchasedQty = Number(item.qty) || 0;
    const alreadyReturned = Math.max(0, Number(item.returnedQty) || 0);
    const remaining = Math.max(0, purchasedQty - alreadyReturned);
    const unitNet = purchasedQty > 0 ? lineNet(item) / purchasedQty : 0;
    const isGift = Boolean(item.isGift);
    return {
      lineIndex,
      productName: String(item.productName || "").trim() || `Item ${lineIndex + 1}`,
      purchasedQty,
      alreadyReturned,
      remainingQty: remaining,
      returnQty: remaining,
      unitPrice: Number(item.unitPrice) || 0,
      discount: Number(item.discount) || 0,
      isGift,
      selected: remaining > 0,
      unitNet,
      refundAmount: isGift ? 0 : roundMoney(unitNet * remaining),
    };
  });
}

export function withUpdatedQty(
  line: SelectedReturnLine,
  nextQty: number,
): SelectedReturnLine {
  const returnQty = Math.min(line.remainingQty, Math.max(0, Math.floor(nextQty)));
  return {
    ...line,
    returnQty,
    selected: returnQty > 0 ? line.selected : false,
    refundAmount: line.isGift ? 0 : roundMoney(line.unitNet * returnQty),
  };
}

export function withGiftFlag(
  line: SelectedReturnLine,
  isGift: boolean,
): SelectedReturnLine {
  return {
    ...line,
    isGift,
    refundAmount: isGift ? 0 : roundMoney(line.unitNet * line.returnQty),
  };
}

export type ReturnPreview = {
  selected: SelectedReturnLine[];
  itemsNet: number;
  itemsGross: number;
  originalDiscount: number;
  returnValue: number;
  dueReduce: number;
  refundable: number;
  pending: number;
};

export function computeReturnPreview(
  invoice: any,
  lines: SelectedReturnLine[],
): ReturnPreview {
  const selected = lines.filter(line => line.selected && line.returnQty > 0);
  const itemsNet = roundMoney(
    selected.reduce((sum, line) => sum + Number(line.refundAmount || 0), 0),
  );
  const itemsGross = roundMoney(
    selected.reduce((sum, line) => sum + line.unitPrice * line.returnQty, 0),
  );
  const originalDiscount = roundMoney(
    selected.reduce((sum, line) => {
      const perUnitDiscount =
        line.purchasedQty > 0 ? Number(line.discount || 0) / line.purchasedQty : 0;
      return sum + perUnitDiscount * line.returnQty;
    }, 0),
  );
  const returnValue = itemsNet;
  const paidAmount = roundMoney(Number(invoice?.paymentBreakdown?.paidAmount) || 0);
  const alreadyRefunded = roundMoney(Number(invoice?.returnedAmount) || 0);
  const pending = roundMoney(
    Number(invoice?.pendingAmount ?? invoice?.paymentBreakdown?.dueAmount) || 0,
  );
  const dueReduce = roundMoney(Math.min(pending, returnValue));
  const maxCashRefund = roundMoney(Math.max(0, paidAmount - alreadyRefunded));
  const refundable = roundMoney(
    Math.min(maxCashRefund, Math.max(0, returnValue - dueReduce)),
  );
  return {
    selected,
    itemsNet,
    itemsGross,
    originalDiscount,
    returnValue,
    dueReduce,
    refundable,
    pending,
  };
}

export function originalInvoiceTotal(invoice: any) {
  return roundMoney(Number(invoice?.grandTotal) || 0);
}

export function returnedInvoiceTotal(invoice: any) {
  return roundMoney(Number(invoice?.returnedAmount) || 0);
}

export function currentInvoiceTotal(invoice: any) {
  return roundMoney(Math.max(0, originalInvoiceTotal(invoice) - returnedInvoiceTotal(invoice)));
}

export type InvoiceViewLine = {
  key: string;
  kind: "sold" | "return";
  productName: string;
  qty: number;
  amount: number;
  status: string;
  originalQty: number;
  returnedQty: number;
  remainingQty: number;
  isGift: boolean;
};

export function buildInvoiceViewLines(invoice: any): InvoiceViewLine[] {
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const rows: InvoiceViewLine[] = [];

  items.forEach((item: ReturnableInvoiceItem, idx: number) => {
    const originalQty = Number(item.qty) || 0;
    const returnedQty = Math.max(0, Number(item.returnedQty) || 0);
    const remainingQty = Math.max(0, originalQty - returnedQty);
    const net = originalLineNetPaid(item);
    const unitNet = originalQty > 0 ? net / originalQty : 0;
    const isGift = Boolean(item.isGift);
    const fullyReturned = originalQty > 0 && returnedQty >= originalQty;
    const soldStatus = isGift
      ? "Gift"
      : fullyReturned
        ? "Returned"
        : returnedQty > 0
          ? "Partially returned"
          : "Sold";

    rows.push({
      key: `sold-${idx}`,
      kind: "sold",
      productName: String(item.productName || "").trim() || `Item ${idx + 1}`,
      qty: originalQty,
      amount: isGift ? 0 : roundMoney(net),
      status: soldStatus,
      originalQty,
      returnedQty,
      remainingQty,
      isGift,
    });

    if (returnedQty > 0) {
      rows.push({
        key: `return-${idx}`,
        kind: "return",
        productName: `Sales Return — ${String(item.productName || "").trim() || `Item ${idx + 1}`}`,
        qty: returnedQty,
        amount: isGift ? 0 : -roundMoney(unitNet * returnedQty),
        status: "Returned / Reversed",
        originalQty,
        returnedQty,
        remainingQty,
        isGift,
      });
    }
  });

  return rows;
}
