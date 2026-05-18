import { useEffect, useMemo, useState } from "react";
import { FileText, Share, X } from "lucide-react";
import {
  handleGetWalletById,
  handleGetWallets,
  handleGetPurchases,
  handleGetInvoices,
} from "@/services/apiClient";

function toAmount(...values: unknown[]) {
  for (const value of values) {
    const amount = Number(value);
    if (Number.isFinite(amount)) return amount;
  }
  return 0;
}

type Props = {
  onClose: () => void;
  customer?: {
    _id?: string;
    name?: string;
    mobile?: string;
    walletAmount?: number;
    closingBalance?: number;
  } | null;
  vendor?: {
    _id?: string;
    name?: string;
    mobile?: string;
    companyName?: string;
  } | null;
};

function normalizeVendorKey(v: string) {
  return String(v ?? "").trim().toLowerCase();
}

function money(n: number) {
  return `₹ ${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type PurchaseLine = {
  purchaseId: string;
  invoiceNumber: string;
  invoiceDate: string;
  supplierName: string;
  itemName: string;
  qty: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
};

type InvoiceLine = {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  walletAmount?: number;
};

type PaymentHistoryLine = {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  mode: string;
  receivedBy: string;
};

export default function LedgerModal({ onClose, customer, vendor }: Props) {
  const [loading, setLoading] = useState(false);
  const [walletRecord, setWalletRecord] = useState<any>(null);
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([]);
  const [paymentLines, setPaymentLines] = useState<PaymentHistoryLine[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  useEffect(() => {
    const loadWallet = async () => {
      const customerId = String(customer?._id ?? "").trim();
      const customerPhone = String(customer?.mobile ?? "").trim();
      if (!customerId && !customerPhone) {
        setWalletRecord(null);
        return;
      }

      try {
        setLoading(true);
        if (customerId) {
          const response = await handleGetWalletById(customerId);
          setWalletRecord(response?.wallet ?? response?.data ?? response ?? null);
          return;
        }

        const response = await handleGetWallets({ search: customerPhone });
        const wallets = Array.isArray(response?.wallets)
          ? response.wallets
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
              ? response
              : [];
        setWalletRecord(wallets[0] ?? null);
      } catch {
        setWalletRecord(null);
      } finally {
        setLoading(false);
      }
    };

    void loadWallet();
  }, [customer?._id, customer?.mobile]);

  useEffect(() => {
    const vendorName = String(vendor?.name ?? "").trim();
    const vendorMobile = String(vendor?.mobile ?? "").trim();

    if (!vendor?._id && !vendorName && !vendorMobile) {
      setPurchaseLines([]);
      return;
    }

    const controller = new AbortController();
    const run = async () => {
      try {
        setLoadingPurchases(true);
        const res = await handleGetPurchases(controller.signal);
        const r = res as any;
        const purchases = Array.isArray(r?.purchases)
          ? r.purchases
          : Array.isArray(r?.data)
            ? r.data
            : Array.isArray(res)
              ? res
              : [];

        const targetName = normalizeVendorKey(vendorName);
        const targetMobile = vendorMobile.replace(/\D/g, "");

        const filtered = purchases.filter((p: any) => {
          const name = normalizeVendorKey(
            p?.supplierName ?? p?.vendorName ?? "",
          );
          const phone = String(p?.vendorPhone ?? p?.mobile ?? "").replace(
            /\D/g,
            "",
          );
          if (targetMobile && phone && phone.endsWith(targetMobile.slice(-10))) return true;
          if (targetName && name && name === targetName) return true;
          return false;
        });

        const lines: PurchaseLine[] = [];
        for (const p of filtered) {
          const rec = p as any;
          const purchaseId = String(rec?._id ?? "");
          const invoiceNumber = String(rec?.invoiceNumber ?? rec?.billNumber ?? "-");
          const invoiceDate = String(rec?.invoiceDate ?? rec?.vendorDate ?? rec?.createdAt ?? "");
          const supplierName = String(rec?.supplierName ?? vendorName ?? "-");
          const items = Array.isArray(rec?.items) ? rec.items : [];
          items.forEach((it: any) => {
            const qty = Number(it?.qty ?? 0);
            const unitPrice = Number(it?.unitPrice ?? it?.price ?? 0);
            const discount = Number(it?.discount ?? 0);
            const lineTotal = Math.max(0, qty * unitPrice - discount);
            lines.push({
              purchaseId,
              invoiceNumber,
              invoiceDate,
              supplierName,
              itemName: String(it?.productName ?? it?.name ?? "Item"),
              qty,
              unitPrice,
              discount,
              lineTotal,
            });
          });
        }

        // newest first
        lines.sort((a, b) => {
          const da = new Date(a.invoiceDate).getTime();
          const db = new Date(b.invoiceDate).getTime();
          return (Number.isNaN(db) ? 0 : db) - (Number.isNaN(da) ? 0 : da);
        });

        setPurchaseLines(lines.slice(0, 200));
      } catch {
        setPurchaseLines([]);
      } finally {
        setLoadingPurchases(false);
      }
    };

    void run();
    return () => controller.abort();
  }, [vendor?._id, vendor?.name, vendor?.mobile]);

  useEffect(() => {
    const customerPhone = String(customer?.mobile ?? "").trim();
    const customerName = String(customer?.name ?? "").trim();

    if (!customerPhone && !customerName) {
      setInvoiceLines([]);
      return;
    }

    const controller = new AbortController();
    const run = async () => {
      try {
        setLoadingInvoices(true);
        // We fetch using customerPhone as search query
        const res = await handleGetInvoices(customerPhone || customerName, controller.signal);
        const r = res as any;
        const invoices = Array.isArray(r?.invoices) ? r.invoices : Array.isArray(r) ? r : [];

        const targetMobile = customerPhone.replace(/\D/g, "");
        const targetName = customerName.toLowerCase();

        const filtered = invoices.filter((inv: any) => {
          const name = String(inv?.customerName ?? "").toLowerCase();
          const phone = String(inv?.customerPhone ?? "").replace(/\D/g, "");
          if (targetMobile && phone && phone.endsWith(targetMobile.slice(-10))) return true;
          if (targetName && name && name === targetName) return true;
          return false;
        });

        const lines: InvoiceLine[] = filtered.map((inv: any) => ({
          invoiceId: String(inv?._id ?? ""),
          invoiceNumber: String(inv?.bill ?? inv?.invoiceNumber ?? "-"),
          invoiceDate: String(inv?.invoiceDate ?? inv?.createdAt ?? ""),
          totalAmount: Number(inv?.amount ?? inv?.grandTotal ?? 0),
          paidAmount: Number(
            inv?.paymentBreakdown?.paidAmount ?? 
            (Number(inv?.amount ?? 0) - Number(inv?.dueAmount ?? inv?.pendingAmount ?? 0))
          ),
          dueAmount: Number(inv?.dueAmount ?? inv?.pendingAmount ?? inv?.paymentBreakdown?.dueAmount ?? 0),
          status: String(inv?.paymentStatus ?? inv?.status ?? "pending"),
          walletAmount: Number(inv?.paymentBreakdown?.wallet ?? 0),
        }));

        const payments: PaymentHistoryLine[] = [];
        filtered.forEach((inv: any) => {
          const invNum = String(inv?.bill ?? inv?.invoiceNumber ?? "-");
          if (Array.isArray(inv.paymentHistory)) {
            inv.paymentHistory.forEach((p: any, idx: number) => {
              payments.push({
                id: `${invNum}-${idx}-${p._id || Math.random()}`,
                invoiceNumber: invNum,
                date: String(p.date ?? ""),
                amount: Number(p.amount ?? 0),
                mode: String(p.mode ?? ""),
                receivedBy: String(p.receivedBy ?? "Unknown"),
              });
            });
          }
        });

        lines.sort((a, b) => {
          const da = new Date(a.invoiceDate).getTime();
          const db = new Date(b.invoiceDate).getTime();
          return (Number.isNaN(db) ? 0 : db) - (Number.isNaN(da) ? 0 : da);
        });

        payments.sort((a, b) => {
          const da = new Date(a.date).getTime();
          const db = new Date(b.date).getTime();
          return (Number.isNaN(db) ? 0 : db) - (Number.isNaN(da) ? 0 : da);
        });

        setInvoiceLines(lines.slice(0, 200));
        setPaymentLines(payments.slice(0, 200));
      } catch {
        setInvoiceLines([]);
        setPaymentLines([]);
      } finally {
        setLoadingInvoices(false);
      }
    };

    void run();
    return () => controller.abort();
  }, [customer?.mobile, customer?.name]);

  const transactions = useMemo(() => {
    return Array.isArray(walletRecord?.transactions) ? walletRecord.transactions : [];
  }, [walletRecord]);

  const closingBalance = toAmount(
    walletRecord?.walletAmount,
    walletRecord?.balance,
    walletRecord?.currentBalance,
    walletRecord?.availableBalance,
    customer?.walletAmount,
    customer?.closingBalance,
  );

  const purchaseTotal = useMemo(
    () => purchaseLines.reduce((s, r) => s + toAmount(r.lineTotal), 0),
    [purchaseLines],
  );

  const invoiceTotal = useMemo(
    () => invoiceLines.reduce((s, r) => s + r.totalAmount, 0),
    [invoiceLines],
  );
  
  const totalPaid = useMemo(
    () => invoiceLines.reduce((s, r) => s + r.paidAmount, 0),
    [invoiceLines],
  );

  const totalWalletAdjusted = useMemo(
    () => invoiceLines.reduce((s, r) => s + (r.walletAmount ?? 0), 0),
    [invoiceLines],
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6 relative animate-fadeIn overflow-y-auto max-h-[90vh]">
        {/* Title */}
        <h2 className="text-xl font-semibold mb-4">
          {(vendor?.name || customer?.name || "Customer") + " Ledger"}
        </h2>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition cursor-pointer"
        >
          <X size={22} />
        </button>

        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-lg bg-green-100 font-medium flex items-center gap-2 cursor-pointer text-green-800">
            <Share size={18} />
          </button>

          <button className="px-4 py-2 rounded-lg bg-purple-100 text-purple-700 font-medium flex items-center gap-2 cursor-pointer">
            <FileText size={18} />
          </button>
        </div>

        {!!vendor && (
          <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  Purchased items
                </div>
                <div className="text-xs text-gray-600">
                  {vendor.companyName ? vendor.companyName + " • " : ""}
                  {vendor.mobile ?? ""}
                </div>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                Total: {money(purchaseTotal)}
              </div>
            </div>

            <div className="mt-4 border border-gray-300 rounded-lg overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600">
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Invoice #</th>
                    <th className="p-3 text-left">Item</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Unit</th>
                    <th className="p-3 text-right">Disc</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseLines.map((r) => (
                    <tr key={`${r.purchaseId}-${r.itemName}`} className="border-t border-gray-200">
                      <td className="p-3">
                        {r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString("en-IN") : "-"}
                      </td>
                      <td className="p-3">{r.invoiceNumber}</td>
                      <td className="p-3">{r.itemName}</td>
                      <td className="p-3 text-right">{r.qty}</td>
                      <td className="p-3 text-right">{money(r.unitPrice)}</td>
                      <td className="p-3 text-right">{money(r.discount)}</td>
                      <td className="p-3 text-right font-semibold">{money(r.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loadingPurchases && purchaseLines.length === 0 && (
                <div className="py-8 text-center text-gray-500 font-medium">
                  No purchase records found for this vendor.
                </div>
              )}
              {loadingPurchases && (
                <div className="py-8 text-center text-gray-500 font-medium">
                  Loading purchases...
                </div>
              )}
            </div>
          </div>
        )}

        {!!customer && (
          <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  Sales & Payments
                </div>
              </div>
              <div className="text-sm font-semibold text-gray-900 flex gap-4">
                <span className="text-blue-700">Total Billed: {money(invoiceTotal)}</span>
                <span className="text-green-700">Total Received: {money(totalPaid)}</span>
                <span className="text-green-700">Total Wallet Adjusted: {money(totalWalletAdjusted)}</span>
                <span className="text-amber-700">Total Due: {money(invoiceTotal - totalPaid - totalWalletAdjusted)}</span>
              </div>
            </div>

            <div className="mt-4 border border-gray-300 rounded-lg overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600">
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Invoice #</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-right">Total Amount</th>
                    <th className="p-3 text-right">Amount Received</th>
                    <th className="p-3 text-right">Due Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceLines.map((r) => (
                    <tr key={r.invoiceId} className="border-t border-gray-200">
                      <td className="p-3">
                        {r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString("en-IN") : "-"}
                      </td>
                      <td className="p-3 font-medium">{r.invoiceNumber}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status.toLowerCase() === 'full' || r.status.toLowerCase() === 'paid' ? 'bg-green-100 text-green-700' : 
                          r.status.toLowerCase() === 'partial' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold">{money(r.totalAmount)}</td>
                      <td className="p-3 text-right text-green-600 font-medium">{money(r.paidAmount)}</td>
                      <td className="p-3 text-right text-amber-600 font-medium">{money(r.dueAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loadingInvoices && invoiceLines.length === 0 && (
                <div className="py-8 text-center text-gray-500 font-medium">
                  No sales invoices found for this customer.
                </div>
              )}
              {loadingInvoices && (
                <div className="py-8 text-center text-gray-500 font-medium">
                  Loading invoices...
                </div>
              )}
            </div>
            
            {/* Payment History Sub-table */}
            {paymentLines.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Invoice Payments</h4>
                <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-gray-600">
                      <tr>
                        <th className="p-3 text-left">Date</th>
                        <th className="p-3 text-left">Invoice #</th>
                        <th className="p-3 text-left">Mode</th>
                        <th className="p-3 text-left">Collected By</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentLines.map((p) => (
                        <tr key={p.id} className="border-t border-gray-200">
                          <td className="p-3">
                            {p.date ? new Date(p.date).toLocaleString("en-IN") : "-"}
                          </td>
                          <td className="p-3 font-medium">{p.invoiceNumber}</td>
                          <td className="p-3 uppercase text-xs font-semibold">{p.mode}</td>
                          <td className="p-3 text-gray-600">{p.receivedBy}</td>
                          <td className="p-3 text-right text-green-700 font-semibold">{money(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
          </div>
        )}

        <div className="mt-6 border border-gray-300 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="p-3 text-left">Id #</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Mode</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Closing Balance</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-300">
                <td className="p-3 text-sm font-medium">
                  Balance as of today
                </td>
                <td></td>
                <td></td>
                <td></td>
                <td className="text-gray-600 font-medium">₹ 0.00</td>
                <td className="text-green-600 font-semibold">
                  ₹ {closingBalance.toLocaleString("en-IN")}
                </td>
                <td></td>
              </tr>
              {transactions.map((entry: any, index: number) => {
                const amount = toAmount(entry?.amount, entry?.value);
                const status = String(entry?.status ?? "posted");
                const mode = String(entry?.type ?? entry?.mode ?? "wallet");
                const id = String(entry?._id ?? entry?.id ?? index + 1);
                const dateValue = String(entry?.createdAt ?? entry?.date ?? "").trim();
                const closing = toAmount(
                  entry?.closingBalance,
                  entry?.balanceAfter,
                  closingBalance,
                );

                return (
                  <tr key={id} className="border-t border-gray-200">
                    <td className="p-3">{id}</td>
                    <td className="p-3">
                      {dateValue
                        ? new Date(dateValue).toLocaleString("en-IN")
                        : "-"}
                    </td>
                    <td className="p-3 capitalize">{status}</td>
                    <td className="p-3 uppercase">{mode}</td>
                    <td className="p-3">₹ {amount.toLocaleString("en-IN")}</td>
                    <td className="p-3 font-medium">
                      ₹ {closing.toLocaleString("en-IN")}
                    </td>
                    <td className="p-3">{String(entry?.note ?? entry?.remark ?? "-")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!loading && transactions.length === 0 && (
            <div className="py-10 text-center text-gray-500 font-medium">
              No wallet transactions found for this customer.
            </div>
          )}
          {loading && (
            <div className="py-10 text-center text-gray-500 font-medium">
              Loading wallet transactions...
            </div>
          )}
        </div>
        {/* Buttons */}
        <div className="flex justify-between gap-3 mt-6 w-full">
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-lg border border-gray-300 hover:bg-gray-100 transition w-full cursor-pointer font-semibold text-[15px]"
          >
            Close
          </button>

          <button className="px-5 py-3 rounded-lg bg-black text-white hover:bg-gray-800 transition w-full cursor-pointer font-semibold text-[15px]">
            Wallet Balance: ₹ {closingBalance.toLocaleString("en-IN")}
          </button>
        </div>
      </div>
    </div>
  );
}
