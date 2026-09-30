import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Link2,
  Link2Off,
  Loader2,
  Mail,
  RefreshCw,
  Share2,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import {
  buildGiftCardShareUrl,
  handleRevokeGiftCardShare,
  handleShareGiftCard,
} from "@/services/apiClient";
import type { GiftCardData } from "../Pages/GiftCard";

type Props = {
  open: boolean;
  card: GiftCardData | null;
  onClose: () => void;
  /** Keeps the table's "shared" state in sync. */
  onShareChange?: (cardId: string, isShared: boolean) => void;
};

const formatINR = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const getErrorMessage = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { message?: string } } };
  return err?.response?.data?.message || fallback;
};

const WhatsAppIcon = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.21 4.25-9.46 9.48-9.46a9.4 9.4 0 0 1 6.7 2.78 9.4 9.4 0 0 1 2.77 6.69c0 5.22-4.25 9.46-9.47 9.46zm8.06-17.52A11.3 11.3 0 0 0 12.04.65C5.76.65.65 5.76.65 12.03c0 2 .52 3.96 1.52 5.69L.55 23.6l6.03-1.58a11.35 11.35 0 0 0 5.45 1.39h.01c6.27 0 11.38-5.11 11.38-11.38 0-3.04-1.18-5.9-3.33-8.05z" />
  </svg>
);

const ShareGiftCardModal = ({ open, card, onClose, onShareChange }: Props) => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"regenerate" | "revoke" | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const onShareChangeRef = useRef(onShareChange);

  useEffect(() => {
    onShareChangeRef.current = onShareChange;
  }, [onShareChange]);

  const cardId = card?._id;

  const createLink = useCallback(
    async (regenerate = false) => {
      if (!cardId) return;
      setError("");
      if (regenerate) setBusy("regenerate");
      else setLoading(true);
      try {
        const data = await handleShareGiftCard(cardId, { regenerate });
        setToken(data.shareToken);
        onShareChangeRef.current?.(cardId, true);
        if (regenerate) toast.success(data.message);
      } catch (err) {
        const message = getErrorMessage(err, "Could not create a share link.");
        if (regenerate) toast.error(message);
        else setError(message);
      } finally {
        setLoading(false);
        setBusy(null);
      }
    },
    [cardId],
  );

  useEffect(() => {
    if (!open || !cardId) return;
    setToken(null);
    setCopied(false);
    void createLink(false);
  }, [open, cardId, createLink]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !card) return null;

  const shareUrl = token ? buildGiftCardShareUrl(token) : "";
  const shareText = `🎁 You've received a ${card.name || "gift card"} worth ${formatINR(
    card.currentBalance,
  )}!\n\nOpen your gift card: ${shareUrl}\n\nShow the gift card code at the counter to redeem it.`;
  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Share link copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleEmail = () => {
    const subject = `You've received a gift card: ${card.name || "Gift Card"}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(shareText)}`;
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: card.name || "Gift Card",
        text: shareText,
      });
    } catch (err) {
      if ((err as { name?: string })?.name !== "AbortError") {
        toast.error("Sharing was not completed");
      }
    }
  };

  const handleDownloadQr = () => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${card.code}-qr.png`;
    link.click();
  };

  const confirmRegenerate = async () => {
    const result = await Swal.fire({
      title: "Create a new link?",
      text: "The current link will stop working immediately. Anyone you already sent it to will need the new link.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, new link",
      confirmButtonColor: "#111827",
    });
    if (result.isConfirmed) await createLink(true);
  };

  const confirmRevoke = async () => {
    const result = await Swal.fire({
      title: "Stop sharing?",
      text: "The link will stop working immediately. The gift card itself stays valid.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Stop sharing",
      confirmButtonColor: "#d33",
    });
    if (!result.isConfirmed) return;
    setBusy("revoke");
    try {
      const data = await handleRevokeGiftCardShare(card._id);
      onShareChangeRef.current?.(card._id, false);
      toast.success(data.message);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not disable the share link."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 px-4 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-gift-card-title"
    >
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <Share2 size={18} />
            </span>
            <div>
              <h2 id="share-gift-card-title" className="text-lg font-bold text-gray-900">
                Share Gift Card
              </h2>
              <p className="text-xs text-gray-500">
                {card.name} · {formatINR(card.currentBalance)}
              </p>
            </div>
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

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-sm text-gray-500">
            <Loader2 size={28} className="animate-spin text-violet-600" />
            Preparing share link…
          </div>
        ) : error ? (
          <div className="px-6 py-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle size={22} />
            </span>
            <p className="mt-3 text-sm font-semibold text-gray-900">Can't share this card</p>
            <p className="mt-1 text-xs text-gray-500">{error}</p>
          </div>
        ) : (
          <>
            {/* QR */}
            <div className="px-6 pt-5">
              <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-linear-to-br from-violet-50 via-white to-indigo-50 p-5">
                <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-100">
                  <QRCodeCanvas
                    ref={qrRef}
                    value={shareUrl}
                    size={176}
                    level="M"
                    marginSize={1}
                    fgColor="#1e1b4b"
                    bgColor="#ffffff"
                    title={`QR code for ${card.code}`}
                  />
                </div>
                <p className="mt-3 text-xs text-gray-500">Scan to open the gift card</p>
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                >
                  <Download size={14} />
                  Download QR
                </button>
              </div>
            </div>

            {/* Link */}
            <div className="px-6 pt-4">
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                <Link2 size={13} />
                Share link
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-10 min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 font-mono text-xs text-gray-700 outline-none focus:border-violet-400"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-black px-4 text-xs font-semibold text-white transition hover:bg-gray-800"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* Channels */}
            <div className="grid grid-cols-3 gap-2 px-6 pt-4">
              <button
                type="button"
                onClick={handleWhatsApp}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-gray-100 bg-emerald-50/60 py-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                <WhatsAppIcon size={20} />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={handleEmail}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-gray-100 bg-sky-50/60 py-3 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
              >
                <Mail size={20} />
                Email
              </button>
              <button
                type="button"
                onClick={handleNativeShare}
                disabled={!canNativeShare}
                title={canNativeShare ? "More apps" : "Not supported in this browser"}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-gray-100 bg-violet-50/60 py-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Share2 size={20} />
                More
              </button>
            </div>

            {/* Warning */}
            <div className="px-6 pt-4">
              <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                Anyone with this link can see the gift card code and use its balance.
                Share it only with the intended person.
              </p>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between gap-2 border-t border-gray-100 px-6 py-4">
          {token && !loading && !error ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={confirmRegenerate}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                title="Create a new link (old one stops working)"
              >
                <RefreshCw size={14} className={busy === "regenerate" ? "animate-spin" : ""} />
                New link
              </button>
              <button
                type="button"
                onClick={confirmRevoke}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
              >
                {busy === "revoke" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Link2Off size={14} />
                )}
                Stop sharing
              </button>
            </div>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareGiftCardModal;
