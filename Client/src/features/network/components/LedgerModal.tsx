import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Loader2, Share, X } from "lucide-react";
import Swal from "sweetalert2";
import {
  handleGetWalletById,
  handleGetWallets,
  handleGetPurchases,
  handleGetInvoices,
} from "@/services/apiClient";
import { closeIfConfirmed } from "@/utils/confirmClose";

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
  const [isSharing, setIsSharing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const ledgerPrintRef = useRef<HTMLDivElement>(null);

  const generateLedgerPdfBlob = async (): Promise<{ blob: Blob; fileName: string; title: string }> => {
    const el = ledgerPrintRef.current;
    if (!el) throw new Error("Ledger content not found");

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas-pro"),
      import("jspdf"),
    ]);

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 800,
      onclone: (_doc, clone) => {
        // Expand horizontally scrollable wrappers in clone so full tables are rendered in PDF
        clone.querySelectorAll(".overflow-x-auto").forEach((container) => {
          const c = container as HTMLElement;
          c.style.overflow = "visible";
          c.style.maxWidth = "none";
          c.style.width = "auto";
        });
        clone.querySelectorAll("table").forEach((tbl) => {
          const t = tbl as HTMLElement;
          t.style.minWidth = "100%";
          t.style.width = "100%";
        });
      },
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = 210;
    const pdfHeight = 297;
    const margin = 10;
    const contentWidth = pdfWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    let heightLeft = contentHeight;
    let position = margin;
    const imgData = canvas.toDataURL("image/png");

    pdf.addImage(imgData, "PNG", margin, position, contentWidth, contentHeight);
    heightLeft -= (pdfHeight - margin * 2);

    while (heightLeft > 0) {
      position = heightLeft - contentHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, position, contentWidth, contentHeight);
      heightLeft -= (pdfHeight - margin * 2);
    }

    const partyName = vendor?.name || customer?.name || "Customer";
    const title = `${partyName} Ledger`;
    const safeName = partyName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${safeName}_Ledger.pdf`;
    const blob = pdf.output("blob");
    return { blob, fileName, title };
  };

  const handleViewPdf = async () => {
    if (isGeneratingPdf || isSharing) return;
    setIsGeneratingPdf(true);
    try {
      const { blob } = await generateLedgerPdfBlob();
      const blobUrl = URL.createObjectURL(blob);
      const opened = window.open(blobUrl, "_blank");
      if (!opened) {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
      }
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      Swal.fire("Error", "Could not generate PDF. Please try again.", "error");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShare = async () => {
    if (isSharing || isGeneratingPdf) return;
    setIsSharing(true);
    try {
      const { blob, fileName, title } = await generateLedgerPdfBlob();
      const pdfFile = new File([blob], fileName, { type: "application/pdf" });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title,
          text: `${title} - Statement and transactions`,
          files: [pdfFile],
        });
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title,
          text: `${title}\nParty: ${vendor?.name || customer?.name || "Customer"}\nBalance: ${money(closingBalance)}`,
        });
        return;
      }

      const shareText = `${title}\nParty: ${vendor?.name || customer?.name || "Customer"}\nContact: ${vendor?.mobile || customer?.mobile || "N/A"}\nBalance: ${money(closingBalance)}\nDate: ${new Date().toLocaleDateString("en-IN")}`;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
      }

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(blobUrl);

      Swal.fire({
        icon: "success",
        title: "Shared / Downloaded",
        text: "Ledger PDF downloaded and summary copied to clipboard.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("Share failed:", err);
      Swal.fire("Error", "Failed to share ledger.", "error");
    } finally {
      setIsSharing(false);
    }
  };

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
    const raw = Array.isArray(walletRecord?.transactions) ? walletRecord.transactions : [];
    const indexed = raw.map((entry: any, index: number) => ({ entry, origIndex: index }));

    indexed.sort((a:any, b:any) => {
      const getTime = (item: any) => {
        const rawDate = item?.createdAt || item?.date || item?.timestamp || item?.updatedAt;
        if (rawDate) {
          const t = new Date(rawDate).getTime();
          if (!Number.isNaN(t) && t > 0) return t;
        }
        if (typeof item?._id === "string" && item._id.length === 24) {
          const timestamp = parseInt(item._id.substring(0, 8), 16) * 1000;
          if (!Number.isNaN(timestamp) && timestamp > 0) return timestamp;
        }
        return 0;
      };

      const da = getTime(a.entry);
      const db = getTime(b.entry);
      if (db !== da) return db - da;
      return b.origIndex - a.origIndex;
    });

    return indexed.map((x:any) => x.entry);
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-2 sm:px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-4 sm:p-6 relative animate-fadeIn overflow-y-auto max-h-[90vh]">
        {/* Title */}
        <h2 className="text-xl font-semibold mb-4">
          {(vendor?.name || customer?.name || "Customer") + " Ledger"}
        </h2>

        {/* Close Button */}
        <button
          onClick={() => void closeIfConfirmed(onClose)}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition cursor-pointer"
        >
          <X size={22} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={handleShare}
            disabled={isSharing || isGeneratingPdf}
            className="px-3.5 py-2 rounded-lg bg-green-100 font-medium flex items-center gap-1.5 cursor-pointer text-green-800 hover:bg-green-200 transition disabled:opacity-50 active:scale-98 shadow-2xs"
            title="Share Ledger (PDF)"
          >
            {isSharing ? (
              <Loader2 size={18} className="animate-spin text-green-800" />
            ) : (
              <Share size={18} />
            )}
            <span className="text-xs font-semibold">Share</span>
          </button>

          <button
            type="button"
            onClick={handleViewPdf}
            disabled={isSharing || isGeneratingPdf}
            className="px-3.5 py-2 rounded-lg bg-purple-100 text-purple-700 font-medium flex items-center gap-1.5 cursor-pointer hover:bg-purple-200 transition disabled:opacity-50 active:scale-98 shadow-2xs"
            title="View PDF"
          >
            {isGeneratingPdf ? (
              <Loader2 size={18} className="animate-spin text-purple-700" />
            ) : (
              <FileText size={18} />
            )}
            <span className="text-xs font-semibold">View PDF</span>
          </button>
        </div>

        <div ref={ledgerPrintRef} className="space-y-5 bg-white">

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

            <div className="mt-4 border border-gray-300 rounded-lg overflow-x-auto bg-white">
              <table className="min-w-[620px] sm:min-w-full w-full text-sm">
                <thead className="bg-gray-100 text-gray-600">
                  <tr>
                    <th className="p-3 text-left whitespace-nowrap">Date</th>
                    <th className="p-3 text-left whitespace-nowrap">Invoice #</th>
                    <th className="p-3 text-left whitespace-nowrap">Item</th>
                    <th className="p-3 text-right whitespace-nowrap">Qty</th>
                    <th className="p-3 text-right whitespace-nowrap">Unit</th>
                    <th className="p-3 text-right whitespace-nowrap">Disc</th>
                    <th className="p-3 text-right whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseLines.map((r) => (
                    <tr key={`${r.purchaseId}-${r.itemName}`} className="border-t border-gray-200">
                      <td className="p-3 whitespace-nowrap">
                        {r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString("en-IN") : "-"}
                      </td>
                      <td className="p-3 whitespace-nowrap">{r.invoiceNumber}</td>
                      <td className="p-3 whitespace-nowrap">{r.itemName}</td>
                      <td className="p-3 text-right whitespace-nowrap">{r.qty}</td>
                      <td className="p-3 text-right whitespace-nowrap">{money(r.unitPrice)}</td>
                      <td className="p-3 text-right whitespace-nowrap">{money(r.discount)}</td>
                      <td className="p-3 text-right font-semibold whitespace-nowrap">{money(r.lineTotal)}</td>
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

            </div>

            <div className="mt-4 border border-gray-300 rounded-lg overflow-x-auto bg-white">
              <table className="min-w-[580px] sm:min-w-full w-full text-sm">
                <thead className="bg-gray-100 text-gray-600">
                  <tr>
                    <th className="p-3 text-left whitespace-nowrap">Date</th>
                    <th className="p-3 text-left whitespace-nowrap">Invoice #</th>
                    <th className="p-3 text-left whitespace-nowrap">Status</th>
                    <th className="p-3 text-right whitespace-nowrap">Total Amount</th>
                    <th className="p-3 text-right whitespace-nowrap">Amount Received</th>
                    <th className="p-3 text-right whitespace-nowrap">Due Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceLines.map((r) => (
                    <tr key={r.invoiceId} className="border-t border-gray-200">
                      <td className="p-3 whitespace-nowrap">
                        {r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString("en-IN") : "-"}
                      </td>
                      <td className="p-3 font-medium whitespace-nowrap">{r.invoiceNumber}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status.toLowerCase() === 'full' || r.status.toLowerCase() === 'paid' ? 'bg-green-100 text-green-700' : 
                          r.status.toLowerCase() === 'partial' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold whitespace-nowrap">{money(r.totalAmount)}</td>
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
                <div className="border border-gray-300 rounded-lg overflow-x-auto bg-white">
                  <table className="min-w-[520px] sm:min-w-full w-full text-sm">
                    <thead className="bg-gray-100 text-gray-600">
                      <tr>
                        <th className="p-3 text-left whitespace-nowrap">Date</th>
                        <th className="p-3 text-left whitespace-nowrap">Invoice #</th>
                        <th className="p-3 text-left whitespace-nowrap">Mode</th>
                        <th className="p-3 text-left whitespace-nowrap">Collected By</th>
                        <th className="p-3 text-right whitespace-nowrap">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentLines.map((p) => (
                        <tr key={p.id} className="border-t border-gray-200">
                          <td className="p-3 whitespace-nowrap">
                            {p.date ? new Date(p.date).toLocaleString("en-IN") : "-"}
                          </td>
                          <td className="p-3 font-medium whitespace-nowrap">{p.invoiceNumber}</td>
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

        <div className="mt-6 border border-gray-300 rounded-lg overflow-x-auto bg-white">
          <table className="min-w-[650px] sm:min-w-full w-full text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="p-3 text-left whitespace-nowrap">Id #</th>
                <th className="p-3 text-left whitespace-nowrap">Date</th>
                <th className="p-3 text-left whitespace-nowrap">Status</th>
                <th className="p-3 text-left whitespace-nowrap">Mode</th>
                <th className="p-3 text-left whitespace-nowrap">Amount</th>
                <th className="p-3 text-left whitespace-nowrap">Closing Balance</th>
                <th className="p-3 text-left whitespace-nowrap">Actions</th>
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
                    <td className="p-3 whitespace-nowrap">{id}</td>
                    <td className="p-3 whitespace-nowrap">
                      {dateValue
                        ? new Date(dateValue).toLocaleString("en-IN")
                        : "-"}
                    </td>
                    <td className="p-3 capitalize">{status}</td>
                    <td className="p-3 uppercase">{mode}</td>
                    <td className="p-3 whitespace-nowrap">₹ {amount.toLocaleString("en-IN")}</td>
                    <td className="p-3 font-medium whitespace-nowrap">
                      ₹ {closing.toLocaleString("en-IN")}
                    </td>
                    <td className="p-3 whitespace-nowrap">{String(entry?.note ?? entry?.remark ?? "-")}</td>
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
        </div>

        {/* Buttons */}
        <div className="flex justify-between gap-3 mt-6 w-full">
          <button
            onClick={() => void closeIfConfirmed(onClose)}
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
