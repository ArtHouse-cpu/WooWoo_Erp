import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Loader2,
  Share,
  X,
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
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
  open?: boolean;
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

export default function LedgerModal({ open, onClose, customer, vendor }: Props) {
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

  // Prevent background scrolling while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const generateLedgerPdfBlob = async (): Promise<{
    blob: Blob;
    fileName: string;
    title: string;
  }> => {
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
        // Ensure PDF uses full desktop table representation even if exported from mobile
        clone.querySelectorAll(".pdf-desktop-table").forEach((tbl) => {
          (tbl as HTMLElement).style.display = "block";
        });
        clone.querySelectorAll(".pdf-mobile-cards").forEach((cards) => {
          (cards as HTMLElement).style.display = "none";
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
    heightLeft -= pdfHeight - margin * 2;

    while (heightLeft > 0) {
      position = heightLeft - contentHeight + margin;
      pdf.addPage();
      pdf.addImage(
        imgData,
        "PNG",
        margin,
        position,
        contentWidth,
        contentHeight,
      );
      heightLeft -= pdfHeight - margin * 2;
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
          setWalletRecord(
            response?.wallet ?? response?.data ?? response ?? null,
          );
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
          if (targetMobile && phone && phone.endsWith(targetMobile.slice(-10)))
            return true;
          if (targetName && name && name === targetName) return true;
          return false;
        });

        const lines: PurchaseLine[] = [];
        for (const p of filtered) {
          const rec = p as any;
          const purchaseId = String(rec?._id ?? "");
          const invoiceNumber = String(
            rec?.invoiceNumber ?? rec?.billNumber ?? "-",
          );
          const invoiceDate = String(
            rec?.invoiceDate ?? rec?.vendorDate ?? rec?.createdAt ?? "",
          );
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
        const res = await handleGetInvoices(
          customerPhone || customerName,
          controller.signal,
        );
        const r = res as any;
        const invoices = Array.isArray(r?.invoices)
          ? r.invoices
          : Array.isArray(r)
            ? r
            : [];

        const targetMobile = customerPhone.replace(/\D/g, "");
        const targetName = customerName.toLowerCase();

        const filtered = invoices.filter((inv: any) => {
          const name = String(inv?.customerName ?? "").toLowerCase();
          const phone = String(inv?.customerPhone ?? "").replace(/\D/g, "");
          if (targetMobile && phone && phone.endsWith(targetMobile.slice(-10)))
            return true;
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
              Number(inv?.amount ?? 0) -
                Number(inv?.dueAmount ?? inv?.pendingAmount ?? 0),
          ),
          dueAmount: Number(
            inv?.dueAmount ??
              inv?.pendingAmount ??
              inv?.paymentBreakdown?.dueAmount ??
              0,
          ),
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
    const raw = Array.isArray(walletRecord?.transactions)
      ? walletRecord.transactions
      : [];
    const indexed = raw.map((entry: any, index: number) => ({
      entry,
      origIndex: index,
    }));

    indexed.sort((a: any, b: any) => {
      const getTime = (item: any) => {
        const rawDate =
          item?.createdAt || item?.date || item?.timestamp || item?.updatedAt;
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

    return indexed.map((x: any) => x.entry);
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

  if (open !== undefined && !open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex h-[95dvh] max-h-[95dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] sm:rounded-3xl bg-white shadow-2xl border border-slate-100 sm:h-auto sm:max-h-[90vh]">
        {/* Ledger Header */}
        <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 shadow-2xs">
                <FileText size={18} />
              </div>
              <h2 className="truncate text-base sm:text-xl font-bold tracking-tight text-slate-900">
                {(vendor?.name || customer?.name || "Customer") + " Ledger"}
              </h2>
            </div>

            {/* Close Button on Right */}
            <button
              type="button"
              onClick={() => void closeIfConfirmed(onClose)}
              className="shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close ledger modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Action Buttons: Share & View PDF directly below heading */}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              disabled={isSharing || isGeneratingPdf}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-2xs transition hover:bg-emerald-100 active:scale-98 disabled:opacity-50 cursor-pointer"
              title="Share Ledger (PDF)"
            >
              {isSharing ? (
                <Loader2 size={14} className="animate-spin text-emerald-700" />
              ) : (
                <Share size={14} />
              )}
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={handleViewPdf}
              disabled={isSharing || isGeneratingPdf}
              className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 shadow-2xs transition hover:bg-purple-100 active:scale-98 disabled:opacity-50 cursor-pointer"
              title="View PDF"
            >
              {isGeneratingPdf ? (
                <Loader2 size={14} className="animate-spin text-purple-700" />
              ) : (
                <FileText size={14} />
              )}
              <span>View PDF</span>
            </button>
          </div>
        </div>

        {/* Content Area (Internally Scrollable) */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3 sm:px-6 sm:py-5 space-y-4 sm:space-y-5 custom-scrollbar bg-slate-50/50">
          <div ref={ledgerPrintRef} className="space-y-4 sm:space-y-5 bg-transparent">
            {/* Vendor Section if applicable */}
            {!!vendor && (
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Purchased Items
                    </h3>
                    <p className="text-xs text-slate-500">
                      {vendor.companyName ? `${vendor.companyName} • ` : ""}
                      {vendor.mobile ?? ""}
                    </p>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900">
                    Total: {money(purchaseTotal)}
                  </div>
                </div>

                {/* Desktop View */}
                <div className="pdf-desktop-table hidden sm:block mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 text-left whitespace-nowrap">Date</th>
                        <th className="p-2.5 text-left whitespace-nowrap">Invoice #</th>
                        <th className="p-2.5 text-left whitespace-nowrap">Item</th>
                        <th className="p-2.5 text-right whitespace-nowrap">Qty</th>
                        <th className="p-2.5 text-right whitespace-nowrap">Unit</th>
                        <th className="p-2.5 text-right whitespace-nowrap">Disc</th>
                        <th className="p-2.5 text-right whitespace-nowrap">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchaseLines.map((r) => (
                        <tr key={`${r.purchaseId}-${r.itemName}`} className="hover:bg-slate-50/70">
                          <td className="p-2.5 whitespace-nowrap text-slate-600">
                            {r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString("en-IN") : "-"}
                          </td>
                          <td className="p-2.5 whitespace-nowrap font-medium text-slate-900">{r.invoiceNumber}</td>
                          <td className="p-2.5 whitespace-nowrap text-slate-700">{r.itemName}</td>
                          <td className="p-2.5 text-right whitespace-nowrap">{r.qty}</td>
                          <td className="p-2.5 text-right whitespace-nowrap">{money(r.unitPrice)}</td>
                          <td className="p-2.5 text-right whitespace-nowrap text-amber-600">{money(r.discount)}</td>
                          <td className="p-2.5 text-right font-bold text-slate-900 whitespace-nowrap">{money(r.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="pdf-mobile-cards block sm:hidden mt-3 space-y-2">
                  {purchaseLines.map((r) => (
                    <div
                      key={`mob-${r.purchaseId}-${r.itemName}`}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 truncate">
                          {r.itemName}
                        </span>
                        <span className="font-extrabold text-slate-900">
                          {money(r.lineTotal)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Inv: {r.invoiceNumber}</span>
                        <span>
                          {r.qty} × {money(r.unitPrice)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {!loadingPurchases && purchaseLines.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No purchase records found for this vendor.
                  </div>
                )}
                {loadingPurchases && (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Loading purchases...
                  </div>
                )}
              </div>
            )}

            {/* Customer Section */}
            {!!customer && (
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Sales & Payments
                  </h3>
                </div>

                {/* Desktop View Table */}
                <div className="pdf-desktop-table hidden sm:block mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 text-left whitespace-nowrap">Date</th>
                        <th className="p-2.5 text-left whitespace-nowrap">Invoice #</th>
                        <th className="p-2.5 text-left whitespace-nowrap">Status</th>
                        <th className="p-2.5 text-right whitespace-nowrap">Total Amount</th>
                        <th className="p-2.5 text-right whitespace-nowrap">Amount Received</th>
                        <th className="p-2.5 text-right whitespace-nowrap">Due Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoiceLines.map((r) => {
                        const statusLower = r.status.toLowerCase();
                        const isFull =
                          statusLower === "full" || statusLower === "paid";
                        const isPartial = statusLower === "partial";

                        return (
                          <tr key={r.invoiceId} className="hover:bg-slate-50/70">
                            <td className="p-2.5 whitespace-nowrap text-slate-600">
                              {r.invoiceDate
                                ? new Date(r.invoiceDate).toLocaleDateString("en-IN")
                                : "-"}
                            </td>
                            <td className="p-2.5 font-medium whitespace-nowrap text-slate-900">
                              {r.invoiceNumber}
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ring-inset ${
                                  isFull
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                    : isPartial
                                      ? "bg-blue-50 text-blue-700 ring-blue-200"
                                      : "bg-amber-50 text-amber-700 ring-amber-200"
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                              {money(r.totalAmount)}
                            </td>
                            <td className="p-2.5 text-right font-bold text-emerald-600 whitespace-nowrap">
                              {money(r.paidAmount)}
                            </td>
                            <td className="p-2.5 text-right font-bold text-amber-600 whitespace-nowrap">
                              {money(r.dueAmount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: Compact Stacked Cards */}
                <div className="pdf-mobile-cards block sm:hidden mt-3 space-y-2">
                  {invoiceLines.map((r) => {
                    const statusLower = r.status.toLowerCase();
                    const isFull =
                      statusLower === "full" || statusLower === "paid";
                    const isPartial = statusLower === "partial";

                    return (
                      <div
                        key={`mob-inv-${r.invoiceId}`}
                        className="rounded-xl border border-slate-200/90 bg-white p-2.5 text-xs shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Calendar size={13} className="text-slate-400 shrink-0" />
                            <span className="text-[11px] text-slate-500">
                              {r.invoiceDate
                                ? new Date(r.invoiceDate).toLocaleDateString("en-IN")
                                : "-"}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono font-bold text-slate-800 truncate">
                              {r.invoiceNumber}
                            </span>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ring-inset shrink-0 ${
                              isFull
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : isPartial
                                  ? "bg-blue-50 text-blue-700 ring-blue-200"
                                  : "bg-amber-50 text-amber-700 ring-amber-200"
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-50 p-2 text-center border border-slate-100">
                          <div>
                            <span className="block text-[9px] font-semibold uppercase text-slate-400">
                              Total
                            </span>
                            <span className="text-[11px] font-bold text-slate-900 tabular-nums">
                              {money(r.totalAmount)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-semibold uppercase text-emerald-700">
                              Received
                            </span>
                            <span className="text-[11px] font-bold text-emerald-600 tabular-nums">
                              {money(r.paidAmount)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-semibold uppercase text-amber-700">
                              Due
                            </span>
                            <span className="text-[11px] font-bold text-amber-600 tabular-nums">
                              {money(r.dueAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!loadingInvoices && invoiceLines.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No sales invoices found for this customer.
                  </div>
                )}
                {loadingInvoices && (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Loading invoices...
                  </div>
                )}

                {/* Payment History Sub-table */}
                {paymentLines.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 mb-2">
                      Recent Invoice Payments
                    </h4>

                    {/* Desktop Payments Table */}
                    <div className="pdf-desktop-table hidden sm:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="p-2 text-left whitespace-nowrap">Date</th>
                            <th className="p-2 text-left whitespace-nowrap">Invoice #</th>
                            <th className="p-2 text-left whitespace-nowrap">Mode</th>
                            <th className="p-2 text-left whitespace-nowrap">Collected By</th>
                            <th className="p-2 text-right whitespace-nowrap">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paymentLines.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/70">
                              <td className="p-2 whitespace-nowrap text-slate-600">
                                {p.date ? new Date(p.date).toLocaleString("en-IN") : "-"}
                              </td>
                              <td className="p-2 font-medium text-slate-900 whitespace-nowrap">{p.invoiceNumber}</td>
                              <td className="p-2 uppercase text-slate-700 font-semibold">{p.mode}</td>
                              <td className="p-2 text-slate-600">{p.receivedBy}</td>
                              <td className="p-2 text-right text-emerald-700 font-bold whitespace-nowrap">{money(p.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Payments Cards */}
                    <div className="pdf-mobile-cards block sm:hidden space-y-1.5">
                      {paymentLines.map((p) => (
                        <div
                          key={`mob-pay-${p.id}`}
                          className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-2 text-xs shadow-2xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 truncate">
                              Inv: {p.invoiceNumber}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {p.date ? new Date(p.date).toLocaleDateString("en-IN") : "-"} • {p.mode.toUpperCase()}
                            </div>
                          </div>
                          <span className="font-extrabold text-emerald-600 text-xs tabular-nums">
                            {money(p.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Transaction Ledger Section */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Transaction Ledger
                </h3>
              </div>

              {/* Balance As of Today - Highlight Summary Card on Mobile */}
              <div className="pdf-mobile-cards block sm:hidden mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Balance as of today
                    </span>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-700 tabular-nums">
                    ₹ {closingBalance.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="pdf-desktop-table hidden sm:block mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 text-left whitespace-nowrap">Id #</th>
                      <th className="p-2.5 text-left whitespace-nowrap">Date</th>
                      <th className="p-2.5 text-left whitespace-nowrap">Status</th>
                      <th className="p-2.5 text-left whitespace-nowrap">Mode</th>
                      <th className="p-2.5 text-left whitespace-nowrap">Amount</th>
                      <th className="p-2.5 text-left whitespace-nowrap">Closing Balance</th>
                      <th className="p-2.5 text-left whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Balance as of today row */}
                    <tr className="bg-slate-50/80 font-bold border-b border-slate-200">
                      <td className="p-2.5 text-slate-900">Balance as of today</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td className="p-2.5 text-slate-500 font-semibold">₹ 0.00</td>
                      <td className="p-2.5 text-emerald-600 font-extrabold">
                        ₹ {closingBalance.toLocaleString("en-IN")}
                      </td>
                      <td></td>
                    </tr>

                    {transactions.map((entry: any, index: number) => {
                      const amount = toAmount(entry?.amount, entry?.value);
                      const status = String(entry?.status ?? "posted");
                      const mode = String(
                        entry?.type ?? entry?.mode ?? "wallet",
                      ).toUpperCase();
                      const id = String(entry?._id ?? entry?.id ?? index + 1);
                      const dateValue = String(
                        entry?.createdAt ?? entry?.date ?? "",
                      ).trim();
                      const closing = toAmount(
                        entry?.closingBalance,
                        entry?.balanceAfter,
                        closingBalance,
                      );
                      const isCredit =
                        mode === "CREDIT" || mode === "ADD";

                      return (
                        <tr key={id} className="hover:bg-slate-50/70">
                          <td
                            className="p-2.5 whitespace-nowrap font-mono text-slate-600 max-w-[120px] truncate"
                            title={id}
                          >
                            {id}
                          </td>
                          <td className="p-2.5 whitespace-nowrap text-slate-600">
                            {dateValue
                              ? new Date(dateValue).toLocaleString("en-IN")
                              : "-"}
                          </td>
                          <td className="p-2.5 capitalize text-slate-700 font-medium">{status}</td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${
                                isCredit
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                  : "bg-rose-50 text-rose-700 ring-rose-200"
                              }`}
                            >
                              {mode}
                            </span>
                          </td>
                          <td
                            className={`p-2.5 font-bold whitespace-nowrap ${
                              isCredit ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {isCredit ? "+" : "-"}₹ {amount.toLocaleString("en-IN")}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">
                            ₹ {closing.toLocaleString("en-IN")}
                          </td>
                          <td className="p-2.5 whitespace-nowrap text-slate-600 max-w-[150px] truncate">
                            {String(entry?.note ?? entry?.remark ?? "-")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Compact Transaction Cards */}
              <div className="pdf-mobile-cards block sm:hidden mt-3 space-y-2">
                {transactions.map((entry: any, index: number) => {
                  const amount = toAmount(entry?.amount, entry?.value);
                  const status = String(entry?.status ?? "posted");
                  const mode = String(
                    entry?.type ?? entry?.mode ?? "wallet",
                  ).toUpperCase();
                  const id = String(entry?._id ?? entry?.id ?? index + 1);
                  const dateValue = String(
                    entry?.createdAt ?? entry?.date ?? "",
                  ).trim();
                  const closing = toAmount(
                    entry?.closingBalance,
                    entry?.balanceAfter,
                    closingBalance,
                  );
                  const isCredit =
                    mode === "CREDIT" || mode === "ADD";

                  return (
                    <div
                      key={`mob-tx-${id}`}
                      className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs space-y-2 text-xs"
                    >
                      {/* Top: Truncated Id & Date & Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="font-mono text-[11px] text-slate-500 font-medium truncate max-w-[130px]"
                            title={id}
                          >
                            #{id.slice(-8)}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[11px] text-slate-400">
                            {dateValue
                              ? new Date(dateValue).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                })
                              : "-"}
                          </span>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 capitalize">
                          {status}
                        </span>
                      </div>

                      {/* Middle: Mode & Amount */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset flex items-center gap-0.5 ${
                              isCredit
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-rose-50 text-rose-700 ring-rose-200"
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownLeft size={11} />
                            ) : (
                              <ArrowUpRight size={11} />
                            )}
                            {mode}
                          </span>
                        </div>

                        <span
                          className={`text-sm font-bold tabular-nums ${
                            isCredit ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {isCredit ? "+" : "-"}₹ {amount.toLocaleString("en-IN")}
                        </span>
                      </div>

                      {/* Bottom: Closing Balance & Remark */}
                      <div className="flex items-center justify-between border-t border-slate-50 pt-1.5 text-[11px] text-slate-500">
                        <span>
                          Bal:{" "}
                          <strong className="text-slate-800">
                            ₹ {closing.toLocaleString("en-IN")}
                          </strong>
                        </span>
                        <span className="truncate max-w-[160px] text-slate-400">
                          {String(entry?.note ?? entry?.remark ?? "-")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!loading && transactions.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  No wallet transactions found for this customer.
                </div>
              )}
              {loading && (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  Loading wallet transactions...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ledger Footer (Sticky / Fixed at Bottom) */}
        <div className="shrink-0 border-t border-slate-100 bg-white p-3 sm:p-4 flex items-center justify-between gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => void closeIfConfirmed(onClose)}
            className="flex-1 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.99] py-2.5 sm:py-3 text-sm font-semibold text-slate-700 transition text-center cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            className="flex-1 rounded-2xl bg-black hover:bg-slate-900 active:scale-[0.99] text-white py-2.5 sm:py-3 text-sm font-bold transition text-center cursor-pointer shadow-xs"
          >
            Wallet Balance: ₹ {closingBalance.toLocaleString("en-IN")}
          </button>
        </div>
      </div>
    </div>
  );
}
