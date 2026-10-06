import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {toast} from 'sonner';
import {CheckCircle2, Download, FileDown, ImageDown, Loader2, Plus, Printer, X} from 'lucide-react';
import EntryPassCard, {PASS_NOTCH_COLOR} from './EntryPassCard';
import {EXHIBITION_EVENT, type EntryPass} from './entryPass';

const PDF_PASS_WIDTH_MM = 90;
const PDF_MARGIN_MM = 8;

type Props = {
  open: boolean;
  passes: EntryPass[];
  onClose: () => void;
  onNewRequest: () => void;
};

const capturePass = async (element: HTMLElement) => {
  const {default: html2canvas} = await import('html2canvas-pro');
  return html2canvas(element, {
    scale: 3,
    useCORS: true,
    backgroundColor: PASS_NOTCH_COLOR,
    logging: false,
    onclone: (_doc, clone) => {
      clone.style.boxShadow = 'none';
    },
  });
};

const buildPdf = async (canvases: HTMLCanvasElement[]) => {
  const {jsPDF} = await import('jspdf');
  let pdf: InstanceType<typeof jsPDF> | null = null;

  for (const canvas of canvases) {
    const width = PDF_PASS_WIDTH_MM;
    const height = (canvas.height / canvas.width) * width;
    const pageW = width + PDF_MARGIN_MM * 2;
    const pageH = height + PDF_MARGIN_MM * 2;
    const orientation = pageW >= pageH ? 'landscape' : 'portrait';

    if (!pdf) {
      pdf = new jsPDF({orientation, unit: 'mm', format: [pageW, pageH]});
    } else {
      pdf.addPage([pageW, pageH], orientation);
    }
    pdf.setFillColor(PASS_NOTCH_COLOR);
    pdf.rect(0, 0, pageW, pageH, 'F');
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', PDF_MARGIN_MM, PDF_MARGIN_MM, width, height);
  }
  return pdf;
};

export default function EntryPassPreviewModal({open, passes, onClose, onNewRequest}: Props) {
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || passes.length === 0) return null;

  const run = async (key: string, task: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try {
      await task();
    } catch (error) {
      console.error('Entry pass export failed:', error);
      toast.error('Could not create the file. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const elementFor = (code: string) => {
    const el = cardRefs.current.get(code);
    if (!el) throw new Error(`Pass card ${code} is not mounted`);
    return el;
  };

  const downloadPng = (pass: EntryPass) =>
    run(`png:${pass.code}`, async () => {
      const canvas = await capturePass(elementFor(pass.code));
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `WooWoo-Pass-${pass.code}.png`;
      link.click();
      toast.success('Pass saved as image');
    });

  const downloadPdf = (pass: EntryPass) =>
    run(`pdf:${pass.code}`, async () => {
      const pdf = await buildPdf([await capturePass(elementFor(pass.code))]);
      pdf?.save(`WooWoo-Pass-${pass.code}.pdf`);
      toast.success('Pass saved as PDF');
    });

  const downloadAll = () =>
    run('all', async () => {
      const canvases: HTMLCanvasElement[] = [];
      for (const pass of passes) canvases.push(await capturePass(elementFor(pass.code)));
      const pdf = await buildPdf(canvases);
      pdf?.save(`WooWoo-Exhibition-Passes-${passes[0].groupId}.pdf`);
      toast.success(`${passes.length} passes saved as PDF`);
    });

  const multiple = passes.length > 1;
  const actionButton =
    'inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-60';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-[#0c0a09]/80 backdrop-blur-md print:static print:overflow-visible print:bg-white print:backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="entry-pass-preview-title"
    >
      <div className="flex min-h-full items-start justify-center px-3 py-6 sm:items-center sm:px-6 sm:py-10 print:block print:p-0">
        <div className="relative w-full max-w-3xl rounded-[28px] bg-[#f3ece2] p-4 shadow-2xl sm:p-7 print:max-w-none print:rounded-none print:bg-white print:p-0 print:shadow-none">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-white/70 p-2 text-[#57534e] transition hover:bg-white hover:text-[#1c1917] print:hidden"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div className="pr-10 text-center sm:px-10 print:hidden">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#dcfce7] text-[#16a34a]">
              <CheckCircle2 size={26} />
            </span>
            <h2
              id="entry-pass-preview-title"
              className="mt-3 font-serif text-2xl font-bold text-[#1c1917] sm:text-3xl"
            >
              {multiple ? `${passes.length} passes are ready!` : 'Your pass is ready!'}
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#78716c]">
              Show {multiple ? 'each pass' : 'this pass'} at the entrance of the{' '}
              {EXHIBITION_EVENT.name} on {EXHIBITION_EVENT.dateLabel}. They're also saved on
              this device.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {multiple && (
                <button
                  type="button"
                  onClick={downloadAll}
                  disabled={busy !== null}
                  className={`${actionButton} bg-[#1c1917] text-white hover:bg-[#292524]`}
                >
                  {busy === 'all' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Download all (PDF)
                </button>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                disabled={busy !== null}
                className={`${actionButton} border border-[#d6d3d1] bg-white text-[#1c1917] hover:bg-[#fafaf9]`}
              >
                <Printer size={14} />
                Print
              </button>
              <button
                type="button"
                onClick={onNewRequest}
                disabled={busy !== null}
                className={`${actionButton} text-[#c2410c] hover:bg-[#ffedd5]`}
              >
                <Plus size={14} />
                New request
              </button>
            </div>
          </div>

          {/* Passes */}
          <div
            className={`mt-6 grid justify-items-center gap-6 print:mt-0 print:grid-cols-2 print:gap-4 ${
              multiple ? 'sm:grid-cols-2' : ''
            }`}
          >
            {passes.map(pass => (
              <div key={pass.code} className="flex w-full max-w-[360px] flex-col items-center gap-3">
                <EntryPassCard
                  pass={pass}
                  ref={el => {
                    if (el) cardRefs.current.set(pass.code, el);
                    else cardRefs.current.delete(pass.code);
                  }}
                />
                <div className="flex w-full gap-2 print:hidden">
                  <button
                    type="button"
                    onClick={() => downloadPng(pass)}
                    disabled={busy !== null}
                    className={`${actionButton} flex-1 border border-[#d6d3d1] bg-white text-[#1c1917] hover:bg-[#fafaf9]`}
                  >
                    {busy === `png:${pass.code}` ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ImageDown size={14} />
                    )}
                    Image
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadPdf(pass)}
                    disabled={busy !== null}
                    className={`${actionButton} flex-1 bg-[#f97316] text-white hover:bg-[#ea580c]`}
                  >
                    {busy === `pdf:${pass.code}` ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <FileDown size={14} />
                    )}
                    PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
