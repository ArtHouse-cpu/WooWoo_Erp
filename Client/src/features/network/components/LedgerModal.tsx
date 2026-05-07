import { useEffect, useMemo, useState } from "react";
import { FileText, Share, X } from "lucide-react";
import {
  handleGetWalletById,
  handleGetWallets,
  handleGetPurchases,
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

export default function LedgerModal({ onClose, customer, vendor }: Props) {
  const [loading, setLoading] = useState(false);
  const [walletRecord, setWalletRecord] = useState<unknown>(null);
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

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
    const vendorId = String(vendor?._id ?? "").trim();
    const vendorName = String(vendor?.name ?? "").trim();
    const vendorMobile = String(vendor?.mobile ?? "").trim();

    if (!vendorId && !vendorName && !vendorMobile) {
      setPurchaseLines([]);
      return;
    }

    const controller = new AbortController();
    const run = async () => {
      try {
        setLoadingPurchases(true);
        const res = await handleGetPurchases(controller.signal);
        const r = res as {
          purchases?: unknown;
          data?: unknown;
        };
        const purchases = Array.isArray(r?.purchases)
          ? (r.purchases as unknown[])
          : Array.isArray(r?.data)
            ? (r.data as unknown[])
            : Array.isArray(res)
              ? (res as unknown[])
              : [];

        const targetName = normalizeVendorKey(vendorName);
        const targetMobile = vendorMobile.replace(/\D/g, "");

        const filtered = purchases.filter((p) => {
          const rec = p as Record<string, unknown>;
          const name = normalizeVendorKey(
            rec?.supplierName ?? rec?.vendorName ?? "",
          );
          const phone = String(rec?.vendorPhone ?? rec?.mobile ?? "").replace(
            /\\D/g,
            "",
          );
          if (targetMobile && phone && phone.endsWith(targetMobile.slice(-10))) return true;
          if (targetName && name && name === targetName) return true;
          return false;
        });

        const lines: PurchaseLine[] = [];
        for (const p of filtered) {
          const rec = p as Record<string, unknown>;
          const purchaseId = String(rec?._id ?? "");
          const invoiceNumber = String(rec?.invoiceNumber ?? rec?.billNumber ?? "-");
          const invoiceDate = String(rec?.invoiceDate ?? rec?.vendorDate ?? rec?.createdAt ?? "");
          const supplierName = String(rec?.supplierName ?? vendorName ?? "-");
          const items = Array.isArray(rec?.items) ? (rec.items as unknown[]) : [];
          items.forEach((it) => {
            const itemRec = it as Record<string, unknown>;
            const qty = Number(it?.qty ?? 0);
            const unitPrice = Number(itemRec?.unitPrice ?? itemRec?.price ?? 0);
            const discount = Number(itemRec?.discount ?? 0);
            const lineTotal = Math.max(0, qty * unitPrice - discount);
            lines.push({
              purchaseId,
              invoiceNumber,
              invoiceDate,
              supplierName,
              itemName: String(itemRec?.productName ?? itemRec?.name ?? "Item"),
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

  const transactions = useMemo(() => {
    const rec = walletRecord as { transactions?: unknown } | null;
    return Array.isArray(rec?.transactions) ? (rec!.transactions as unknown[]) : [];
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
            <Share size={18} /> Share
          </button>

          <button className="px-4 py-2 rounded-lg bg-purple-100 text-purple-700 font-medium flex items-center gap-2 cursor-pointer">
            <FileText size={18} /> View Statement
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
              {transactions.map((entry, index: number) => {
                const e = entry as Record<string, unknown>;
                const amount = toAmount(entry?.amount, entry?.value);
                const status = String(e?.status ?? "posted");
                const mode = String(e?.type ?? e?.mode ?? "wallet");
                const id = String(e?._id ?? e?.id ?? index + 1);
                const dateValue = String(e?.createdAt ?? e?.date ?? "").trim();
                const closing = toAmount(
                  e?.closingBalance,
                  e?.balanceAfter,
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
                    <td className="p-3">{String(e?.note ?? e?.remark ?? "-")}</td>
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
