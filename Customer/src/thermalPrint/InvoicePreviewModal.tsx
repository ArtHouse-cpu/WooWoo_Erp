import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ThermalPrint, type ThermalPrintProps } from "./ThermalPrint";

/** Must match `[data-invoice-pdf-root]` width in ThermalPrint (A4 @ 96dpi). */
const INVOICE_WIDTH_PX = 794;

type Props = {
  invoice: ThermalPrintProps;
  onClose: () => void;
};

/**
 * Full-screen invoice preview that scales the fixed A4 ThermalPrint layout
 * to fit narrow mobile viewports without horizontal overflow.
 * Print/PDF keep the original 794px layout (transform is preview-only).
 */
export function InvoicePreviewModal({ invoice, onClose }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(1123);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateScale = () => {
      const available = Math.max(0, viewport.clientWidth);
      const next = available > 0 ? Math.min(1, available / INVOICE_WIDTH_PX) : 1;
      setScale(next);
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(viewport);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const measure = () => {
      setContentHeight(content.scrollHeight || content.offsetHeight || 1123);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(content);
    return () => ro.disconnect();
  }, [invoice]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-black/55"
      role="dialog"
      aria-modal="true"
      aria-label="Invoice preview"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#111111] px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-4">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-extrabold text-white">
            Invoice {invoice.invoiceNo}
          </p>
          <p className="truncate text-[10px] font-medium text-white/60">
            Scroll to review · use Download PDF to save
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="hidden rounded-lg bg-white/10 px-3 py-2 text-[12px] font-bold text-white transition hover:bg-white/20 sm:inline-flex"
          >
            Print
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white px-3 py-2 text-[12px] font-extrabold text-[#111111] transition hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-slate-200/90 px-0 py-0 sm:px-4 sm:py-4"
      >
        <div
          className="mx-auto bg-white shadow-lg sm:rounded-xl sm:shadow-xl"
          style={{
            width: scale < 1 ? "100%" : INVOICE_WIDTH_PX,
            maxWidth: "100%",
            height: contentHeight * scale,
            overflow: "hidden",
          }}
        >
          <div
            ref={contentRef}
            className="invoice-preview-scale-root"
            style={{
              width: INVOICE_WIDTH_PX,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <ThermalPrint {...invoice} />
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .invoice-preview-scale-root,
          .invoice-preview-scale-root * {
            visibility: visible !important;
          }
          .invoice-preview-scale-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            transform: none !important;
            width: ${INVOICE_WIDTH_PX}px !important;
          }
        }
      `}</style>
    </div>
  );
}
