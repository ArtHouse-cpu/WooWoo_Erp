import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { A4InvoiceTemplate } from "@/features/sales/components/invoice/A4InvoiceTemplate";
import {
  PDF_INLINE_IMAGE_PLACEHOLDER,
  type InvoicePdfInput,
} from "@/features/sales/components/invoice/types";

const PDF_ROOT_SELECTOR = "[data-invoice-pdf-root]";

type PdfHotLink = {
  href: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function assertInvoiceForPdf(value: unknown): asserts value is InvoicePdfInput {
  if (!isRecord(value)) {
    throw new Error("Cannot generate PDF: invoice data is missing or invalid.");
  }
}

function safePdfFileName(code: string): string {
  const cleaned = code.replace(/[/\\:*?"<>|]/g, "-").trim();
  return cleaned.length > 0 ? cleaned : "invoice";
}

function invoicePdfBasename(invoice: InvoicePdfInput): string {
  const code =
    invoice.invoiceCode ??
    invoice.returnCode ??
    (invoice.invoiceNumber != null ? String(invoice.invoiceNumber) : null) ??
    "invoice";
  return `${safePdfFileName(String(code))}.pdf`;
}

/** Wait for fonts and <img> loads so html2canvas captures real pixels. */
async function waitForCaptureReady(root: HTMLElement): Promise<void> {
  await document.fonts.ready.catch(() => undefined);

  const imgs = [...root.querySelectorAll("img")] as HTMLImageElement[];
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalHeight > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }),
    ),
  );

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/** Collect footer/social <a> boxes relative to invoice root (CSS px). */
function collectInvoiceLinks(root: HTMLElement): PdfHotLink[] {
  const rootRect = root.getBoundingClientRect();
  return [...root.querySelectorAll("a[href]")]
    .map((node) => {
      const el = node as HTMLAnchorElement;
      const href = String(el.href || "").trim();
      const r = el.getBoundingClientRect();
      return {
        href,
        x: r.left - rootRect.left,
        y: r.top - rootRect.top,
        w: Math.max(r.width, 12),
        h: Math.max(r.height, 12),
      };
    })
    .filter((link) => /^https?:\/\//i.test(link.href));
}

/**
 * Raster pages + invisible clickable link annotations for soft-copy PDFs.
 * Links are mapped from DOM positions onto the same image coordinate system.
 */
function addCanvasAsPagedPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  root: HTMLElement,
  links: PdfHotLink[],
): void {
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  const contentWidthPx = Math.max(1, root.scrollWidth || root.offsetWidth);
  const contentHeightPx = Math.max(1, root.scrollHeight || root.offsetHeight);
  const scaleX = imgWidth / contentWidthPx;
  const scaleY = imgHeight / contentHeightPx;

  let imgData: string;
  try {
    imgData = canvas.toDataURL("image/png", 1.0);
  } catch {
    throw new Error(
      "PDF export blocked a captured image (often due to cross-origin photos). Try again or remove external product images.",
    );
  }

  let heightLeft = imgHeight;
  let position = 0;
  let pageIndex = 0;

  const placeLinksForPage = (page: number, imageOffsetY: number) => {
    pdf.setPage(page + 1);
    for (const link of links) {
      const lx = link.x * scaleX;
      const ly = link.y * scaleY;
      const lw = link.w * scaleX;
      const lh = link.h * scaleY;

      // Link center must fall on this page's visible slice.
      const centerY = ly + lh / 2;
      const pageTop = -imageOffsetY;
      const pageBottom = pageTop + pdfHeight;
      if (centerY < pageTop || centerY > pageBottom) continue;

      const yOnPage = ly + imageOffsetY;
      pdf.link(lx, yOnPage, lw, lh, { url: link.href });
    }
  };

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  placeLinksForPage(pageIndex, position);
  heightLeft -= pdfHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pageIndex += 1;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    placeLinksForPage(pageIndex, position);
    heightLeft -= pdfHeight;
  }
}

function cleanupDom(root: Root | null, container: HTMLDivElement): void {
  try {
    root?.unmount();
  } catch {
    /* ignore */
  }
  if (container.parentNode) {
    container.parentNode.removeChild(container);
  }
}

async function createInvoicePdf(
  invoice: InvoicePdfInput,
  documentType: string = "INVOICE",
): Promise<jsPDF> {
  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "900px";
  container.style.pointerEvents = "auto";
  container.style.overflow = "visible";
  document.body.appendChild(container);

  let root: Root | null = createRoot(container);

  try {
    flushSync(() => {
      root!.render(
        <A4InvoiceTemplate invoice={invoice} documentType={documentType} />,
      );
    });
  } catch (renderError) {
    console.error("Invoice PDF render failed:", renderError);
    cleanupDom(root, container);
    root = null;
    throw renderError instanceof Error
      ? renderError
      : new Error("Failed to render invoice for PDF.");
  }

  const element = container.querySelector(PDF_ROOT_SELECTOR);
  if (!element || !(element instanceof HTMLElement)) {
    cleanupDom(root, container);
    throw new Error("Invoice layout did not render (missing PDF root).");
  }

  try {
    await waitForCaptureReady(element);
    const links = collectInvoiceLinks(element);

    const canvas = await html2canvas(element, {
      scale: Math.min(2, (window.devicePixelRatio || 1) * 1.5),
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      onclone: (_doc, clone) => {
        const clonedRoot = clone.querySelector(PDF_ROOT_SELECTOR);
        if (!clonedRoot) return;
        clonedRoot.querySelectorAll("img").forEach((node: HTMLImageElement) => {
          // Keep bundled logo/stamp and UPI QR; only strip unsafe product photos.
          if (node.hasAttribute("data-pdf-keep")) return;
          node.src = PDF_INLINE_IMAGE_PLACEHOLDER;
        });
      },
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    addCanvasAsPagedPdf(pdf, canvas, element, links);
    return pdf;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not build PDF from invoice.";
    console.error("PDF generation failed:", err);
    throw new Error(message);
  } finally {
    cleanupDom(root, container);
  }
}

export async function downloadInvoicePdf(
  invoice: unknown,
  documentType: string = "INVOICE",
): Promise<void> {
  assertInvoiceForPdf(invoice);
  const pdf = await createInvoicePdf(invoice, documentType);
  pdf.save(invoicePdfBasename(invoice));
}

export async function getInvoicePdfBlob(
  invoice: unknown,
  documentType: string = "INVOICE",
): Promise<{ blob: Blob; filename: string }> {
  assertInvoiceForPdf(invoice);
  const pdf = await createInvoicePdf(invoice, documentType);
  const filename = invoicePdfBasename(invoice);
  return { blob: pdf.output("blob"), filename };
}
