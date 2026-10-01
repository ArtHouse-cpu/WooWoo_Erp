import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  Check,
  Copy,
  Download,
  Gift,
  History,
  Loader2,
  Pencil,
  Share2,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Undo2,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import type { GiftCardData } from "../Pages/GiftCard";

type Props = {
  open: boolean;
  onClose: () => void;
  card: GiftCardData | null;
  onEdit?: (card: GiftCardData) => void;
  onShareChange?: (cardId: string, isShared: boolean) => void;
  onShare?: (card: GiftCardData) => void;
  loadingHistory?: boolean;
};

const TXN_META: Record<
  NonNullable<GiftCardData["transactions"]>[number]["type"],
  { label: string; icon: typeof Gift; tone: string }
> = {
  issue: {
    label: "Issued",
    icon: Sparkles,
    tone: "bg-indigo-50 text-indigo-600",
  },
  redeem: {
    label: "Redeemed",
    icon: ShoppingBag,
    tone: "bg-rose-50 text-rose-600",
  },
  refund: {
    label: "Refunded",
    icon: Undo2,
    tone: "bg-emerald-50 text-emerald-600",
  },
  adjust: {
    label: "Adjusted",
    icon: SlidersHorizontal,
    tone: "bg-amber-50 text-amber-600",
  },
};

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const STATUS_STYLES: Record<
  GiftCardData["status"],
  { pill: string; dot: string; card: string }
> = {
  Active: {
    pill: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
    card: "from-slate-900 via-indigo-950 to-violet-900",
  },
  Used: {
    pill: "bg-blue-100 text-blue-700 ring-blue-200",
    dot: "bg-blue-500",
    card: "from-slate-800 via-slate-900 to-blue-950",
  },
  Expired: {
    pill: "bg-rose-100 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
    card: "from-zinc-700 via-zinc-800 to-rose-950",
  },
  Cancelled: {
    pill: "bg-gray-100 text-gray-700 ring-gray-200",
    dot: "bg-gray-400",
    card: "from-zinc-600 via-zinc-700 to-zinc-800",
  },
};

const formatINR = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

/** Parses "YYYY-MM-DD" as a local calendar date; other values via Date. */
const parseDate = (value?: string) => {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDate = (value?: string) => {
  const d = parseDate(value);
  return d
    ? d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
};

const daysUntil = (value?: string) => {
  const d = parseDate(value);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
};

const PDF_CARD_WIDTH_MM = 100;
const PDF_MARGIN_MM = 1;
const stripGradientInterpolation = (backgroundImage: string) =>
  backgroundImage
    .replace(
      /(gradient\()([^,()]*)/gi,
      (_match, fn: string, firstArg: string) => {
        const cleaned = firstArg
          .replace(
            /\bin\s+[a-z-]+(?:\s+(?:shorter|longer|increasing|decreasing)\s+hue)?/gi,
            "",
          )
          .replace(/\s+/g, " ")
          .trim();
        return cleaned ? `${fn}${cleaned}` : `${fn}__EMPTY__`;
      },
    )
    .replace(/__EMPTY__\s*,\s*/g, "");

const ViewGiftCardModal = ({
  open,
  onClose,
  card,
  onEdit,
  onShare,
  loadingHistory = false,
}: Props) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !card) return null;

  const style = STATUS_STYLES[card.status] ?? STATUS_STYLES.Cancelled;
  const initial = Math.max(0, Number(card.initialAmount || 0));
  const balance = Math.max(0, Number(card.currentBalance || 0));
  const used = Math.max(0, initial - balance);
  const remainingPct =
    initial > 0 ? Math.min(100, (balance / initial) * 100) : 0;
  const days = daysUntil(card.expiryDate);
  const pastExpiry = days != null && days < 0;

  const expiryNote =
    days == null
      ? ""
      : days < 0
        ? `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`
        : days === 0
          ? "Expires today"
          : `${days} day${days === 1 ? "" : "s"} left`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(card.code);
      setCopied(true);
      toast.success("Gift card code copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy the code");
    }
  };

  const handleDownload = async () => {
    const element = cardRef.current;
    if (!element || downloading) return;

    setDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);

      const backgroundImage = stripGradientInterpolation(
        window.getComputedStyle(element).backgroundImage,
      );

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false,
        onclone: (_doc, clone) => {
          clone.style.backgroundImage = backgroundImage;
          clone.style.boxShadow = "none";
        },
      });

      const width = PDF_CARD_WIDTH_MM;
      const height = (canvas.height / canvas.width) * width;
      const pageWidth = width + PDF_MARGIN_MM * 2;
      const pageHeight = height + PDF_MARGIN_MM * 2;

      const pdf = new jsPDF({
        orientation: pageWidth >= pageHeight ? "landscape" : "portrait",
        unit: "mm",
        format: [pageWidth, pageHeight],
      });
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        PDF_MARGIN_MM,
        PDF_MARGIN_MM,
        width,
        height,
      );
      pdf.save(`Gift-Card.pdf`);

      toast.success("Gift card downloaded");
    } catch (error) {
      console.error("Gift card download error:", error);
      toast.error("Failed to download gift card");
    } finally {
      setDownloading(false);
    }
  };

  const details = [
    {
      icon: Wallet,
      label: "Initial Amount",
      value: formatINR(initial),
      tone: "bg-indigo-50 text-indigo-600",
    },
    {
      icon: Gift,
      label: "Amount Used",
      value: formatINR(used),
      tone: "bg-amber-50 text-amber-600",
    },
    {
      icon: UserRound,
      label: "Created By",
      value: card.createdBy || "—",
      tone: "bg-sky-50 text-sky-600",
    },
    {
      icon: CalendarPlus,
      label: "Created On",
      value: card.createdAt ? formatDate(card.createdAt) : "—",
      tone: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="view-gift-card-title"
    >
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div>
            <h2
              id="view-gift-card-title"
              className="text-lg font-bold text-gray-900"
            >
              Gift Card Details
            </h2>
            <p className="text-xs text-gray-500">
              Complete overview of this gift card
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Card visual */}
        <div className="px-6 pt-4">
          <div
            ref={cardRef}
            className={`relative overflow-hidden rounded-2xl bg-linear-to-br ${style.card} p-5 text-white shadow-xl`}
          >
            <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-white/5" />

            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                  WooWoo Gift Card
                </p>
                <h3 className="mt-1 truncate text-lg font-bold">
                  {card.name || "Gift Card"}
                </h3>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${style.pill}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                {card.status}
              </span>
            </div>

            <div className="relative mt-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                Available Balance
              </p>
              <p className="mt-0.5 text-3xl font-extrabold tracking-tight">
                {formatINR(balance)}
              </p>
              <p className="text-xs text-white/60">of {formatINR(initial)}</p>
            </div>

            <div className="relative mt-5 flex items-end justify-between gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="group inline-flex min-w-0 items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 font-mono text-sm tracking-widest transition hover:bg-white/20"
                title="Copy code"
              >
                <span className="truncate">{card.code}</span>
                {copied ? (
                  <Check
                    size={14}
                    className="shrink-0 text-emerald-300"
                    data-html2canvas-ignore="true"
                  />
                ) : (
                  <Copy
                    size={14}
                    className="shrink-0 text-white/70 group-hover:text-white"
                    data-html2canvas-ignore="true"
                  />
                )}
              </button>
              <div className="shrink-0 text-right">
                <p className="text-[10px] uppercase tracking-wider text-white/60">
                  Valid Till
                </p>
                <p className="text-sm font-semibold">
                  {formatDate(card.expiryDate)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Balance usage */}
        <div className="px-6 pt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700">
              Balance remaining
            </span>
            <span className="font-bold text-gray-900">
              {remainingPct.toFixed(0)}%
            </span>
          </div>
          <div
            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(remainingPct)}
            aria-label="Balance remaining"
          >
            <div
              className={`h-full rounded-full transition-all ${
                remainingPct > 50
                  ? "bg-emerald-500"
                  : remainingPct > 20
                    ? "bg-amber-500"
                    : "bg-rose-500"
              }`}
              style={{ width: `${remainingPct}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-gray-500">
            <span>Used {formatINR(used)}</span>
            <span>Left {formatINR(balance)}</span>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 gap-3 px-6 pt-5 sm:grid-cols-2">
          {details.map(({ icon: Icon, label, value, tone }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-3"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}
              >
                <Icon size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
                  {label}
                </p>
                <p className="truncate text-sm font-semibold text-gray-900">
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Expiry */}
        <div className="px-6 pt-3">
          <div
            className={`flex items-center gap-3 rounded-2xl border p-3 ${
              pastExpiry
                ? "border-rose-200 bg-rose-50"
                : days != null && days <= 30
                  ? "border-amber-200 bg-amber-50"
                  : "border-gray-100 bg-gray-50/60"
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                pastExpiry
                  ? "bg-rose-100 text-rose-600"
                  : "bg-violet-50 text-violet-600"
              }`}
            >
              <CalendarClock size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
                Expiry Date
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {formatDate(card.expiryDate)}
              </p>
            </div>
            {expiryNote && (
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  pastExpiry
                    ? "bg-rose-100 text-rose-700"
                    : days != null && days <= 30
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {expiryNote}
              </span>
            )}
          </div>

          {pastExpiry && card.status === "Active" && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600">
              <AlertTriangle size={13} />
              This card is marked Active but its expiry date has passed.
            </p>
          )}
        </div>

        {/* Activity */}
        <div className="px-6 pt-5">
          <div className="mb-2 flex items-center gap-2">
            <History size={15} className="text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-800">Activity</h3>
            {loadingHistory && (
              <Loader2 size={14} className="animate-spin text-gray-400" />
            )}
          </div>

          {card.transactions && card.transactions.length > 0 ? (
            <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {card.transactions.map((txn) => {
                const meta = TXN_META[txn.type] ?? TXN_META.adjust;
                const Icon = meta.icon;
                const positive = txn.amount >= 0;
                return (
                  <li
                    key={txn._id}
                    className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-3"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}
                    >
                      <Icon size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {meta.label}
                        {txn.reference ? (
                          <span className="ml-1.5 font-mono text-xs font-medium text-gray-500">
                            {txn.reference}
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-[11px] text-gray-500">
                        {formatDateTime(txn.at)}
                        {txn.by?.m_staff_name
                          ? ` · ${txn.by.m_staff_name}`
                          : ""}
                        {txn.note ? ` · ${txn.note}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-sm font-bold ${
                          txn.type === "issue"
                            ? "text-gray-900"
                            : positive
                              ? "text-emerald-600"
                              : "text-rose-600"
                        }`}
                      >
                        {txn.type === "issue" ? "" : positive ? "+" : "−"}
                        {formatINR(Math.abs(txn.amount))}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Bal {formatINR(txn.balanceAfter)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-gray-200 p-3 text-center text-xs text-gray-500">
              {loadingHistory
                ? "Loading activity…"
                : "No activity recorded yet."}
            </p>
          )}
        </div>

        {/* Footer */}

        <div className="mt-5 flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            {/* Share Button */}
            {onShare && card.status === "Active" && (
              <button
                type="button"
                onClick={() => onShare(card)}
                title="Share link"
                aria-label="Share gift card link"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-green-200 bg-white text-green-600 shadow-sm transition-all duration-200 hover:border-green-300 hover:bg-green-50 hover:shadow-md"
              >
                <Share2 size={18} strokeWidth={2} />
              </button>
            )}
            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              title={downloading ? "Preparing PDF…" : "Download as PDF"}
              aria-label="Download gift card as PDF"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-600 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md disabled:cursor-wait disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} strokeWidth={2} />
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Close
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(card)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-black px-5 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              <Pencil size={15} />
              Edit Gift Card
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewGiftCardModal;
