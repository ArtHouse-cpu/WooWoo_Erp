import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ThermalPrint, type ThermalPrintProps } from "./ThermalPrint";

const PDF_ROOT_SELECTOR = "[data-invoice-pdf-root]";

function safeFileName(code: string) {
  const cleaned = code.replace(/[/\\:*?"<>|]/g, "-").trim();
  return cleaned || "invoice";
}

async function waitForImages(root: HTMLElement) {
  await document.fonts.ready.catch(() => undefined);
  const imgs = [...root.querySelectorAll("img")];
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
}

export async function downloadThermalInvoicePdf(props: ThermalPrintProps) {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "900px";
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    flushSync(() => {
      root.render(<ThermalPrint {...props} />);
    });

    const element = container.querySelector(PDF_ROOT_SELECTOR);
    if (!(element instanceof HTMLElement)) {
      throw new Error("Invoice layout did not render");
    }

    await waitForImages(element);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * pageW) / canvas.width;
    const imgData = canvas.toDataURL("image/png", 1.0);

    let heightLeft = imgH;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
    heightLeft -= pageH;

    while (heightLeft > 0) {
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
      heightLeft -= pageH;
    }

    pdf.save(`${safeFileName(props.invoiceNo)}.pdf`);
  } finally {
    root.unmount();
    container.remove();
  }
}
