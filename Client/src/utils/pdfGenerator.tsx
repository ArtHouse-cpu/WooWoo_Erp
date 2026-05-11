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
    (invoice.invoiceNumber != null ? String(invoice.invoiceNumber ) : null) ??
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

/** Tall invoices: slice the raster across multiple A4 pages. */
function addCanvasAsPagedPdf(pdf: jsPDF, canvas: HTMLCanvasElement): void {
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

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

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pdfHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
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

async function createInvoicePdf(invoice: InvoicePdfInput, documentType: string = "INVOICE"): Promise<jsPDF> {
  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "900px";
  container.style.pointerEvents = "none";
  container.style.overflow = "visible";
  document.body.appendChild(container);

  let root: Root | null = createRoot(container);

  try {
    flushSync(() => {
      root!.render(<A4InvoiceTemplate invoice={invoice} documentType={documentType} />);
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
          node.src = PDF_INLINE_IMAGE_PLACEHOLDER;
        });
      },
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    addCanvasAsPagedPdf(pdf, canvas);
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

export async function downloadInvoicePdf(invoice: unknown, documentType: string = "INVOICE"): Promise<void> {
  assertInvoiceForPdf(invoice);
  const pdf = await createInvoicePdf(invoice, documentType);
  pdf.save(invoicePdfBasename(invoice));
}

export async function getInvoicePdfBlob(
  invoice: unknown,
  documentType: string = "INVOICE"
): Promise<{ blob: Blob; filename: string }> {
  assertInvoiceForPdf(invoice);
  const pdf = await createInvoicePdf(invoice, documentType);
  const filename = invoicePdfBasename(invoice);
  return { blob: pdf.output("blob"), filename };
}
