import { useEffect, useState } from "react";
import { Link2, Share2, ShoppingBag, X } from "lucide-react";
import Swal from "sweetalert2";
import { publicProductUrl } from "@/utils/productShare";

type ProductShareModalProps = {
  open: boolean;
  productId: string;
  productName: string;
  category?: string;
  price?: string;
  onClose: () => void;
};

const WhatsAppIcon = ({ size = 22 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.21 4.25-9.46 9.48-9.46a9.4 9.4 0 0 1 6.7 2.78 9.4 9.4 0 0 1 2.77 6.69c0 5.22-4.25 9.46-9.47 9.46zm8.06-17.52A11.3 11.3 0 0 0 12.04.65C5.76.65.65 5.76.65 12.03c0 2 .52 3.96 1.52 5.69L.55 23.6l6.03-1.58a11.35 11.35 0 0 0 5.45 1.39h.01c6.27 0 11.38-5.11 11.38-11.38 0-3.04-1.18-5.9-3.33-8.05z" />
  </svg>
);

export default function ProductShareModal({
  open,
  productId,
  productName,
  category = "Supplies",
  price = "",
  onClose,
}: ProductShareModalProps) {
  const [copied, setCopied] = useState(false);
  const url = productId ? publicProductUrl(productId) : "";
  const title = productName || "Product";
  const shareText = `${title} at WooWoo Art House`;

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, productId]);

  if (!open || !productId) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      void Swal.fire({
        toast: true,
        position: "top",
        timer: 1400,
        showConfirmButton: false,
        icon: "success",
        title: "Product link copied",
      });
    } catch {
      void Swal.fire({
        toast: true,
        position: "top",
        timer: 1400,
        showConfirmButton: false,
        icon: "error",
        title: "Could not copy the link",
      });
    }
  };

  const shareWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const shareMore = async () => {
    if (typeof navigator.share !== "function") {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title, text: shareText, url });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 p-3 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share product"
        className="w-full max-w-[360px] rounded-3xl bg-white p-4 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
              <Share2 size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-bold leading-tight text-slate-900">Share Product</p>
              <p className="mt-0.5 text-[11px] text-slate-400">Share with friends or customers</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close share"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
            <ShoppingBag size={22} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{title}</p>
            <p className="truncate text-xs font-medium text-violet-600">{category || "Supplies"}</p>
            {price ? <p className="mt-0.5 text-sm font-bold text-slate-900">{price}</p> : null}
          </div>
        </div>

        <p className="mb-1.5 mt-4 text-xs font-medium text-slate-500">Product Link</p>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5">
          <Link2 size={15} className="shrink-0 text-slate-400" />
          <p className="min-w-0 flex-1 truncate text-xs text-slate-600">{url}</p>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={shareWhatsApp}
            className="flex flex-col items-center gap-2 rounded-2xl bg-emerald-50 px-2 py-3.5 text-xs font-semibold text-emerald-700"
          >
            <WhatsAppIcon />
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="flex flex-col items-center gap-2 rounded-2xl bg-sky-50 px-2 py-3.5 text-xs font-semibold text-sky-700"
          >
            <Link2 size={22} />
            Copy Link
          </button>
          <button
            type="button"
            onClick={() => void shareMore()}
            className="flex flex-col items-center gap-2 rounded-2xl bg-violet-50 px-2 py-3.5 text-xs font-semibold text-violet-700"
          >
            <Share2 size={22} />
            More
          </button>
        </div>
      </div>
    </div>
  );
}
