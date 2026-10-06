import { useEffect, useRef, useState, type FormEvent } from "react";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { AlertTriangle, CheckCircle2, Loader2, X, XCircle } from "lucide-react";
import {
  handleCheckInExhibitionPass,
  type ExhibitionPassRecord,
} from "@/services/apiClient";

type ScanResult = {
  kind: "success" | "already" | "error";
  title: string;
  detail?: string;
};

type Props = {
  onClose: () => void;
  onCheckedIn: (pass: ExhibitionPassRecord) => void;
};

/** How long the result card stays before the camera resumes scanning. */
const RESUME_AFTER_MS = 2000;
/** Ignore the same code re-read within this window (camera reads ~2x/second). */
const DUPLICATE_WINDOW_MS = 4000;

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const cameraErrorMessage = (error: unknown) => {
  const kind = (error as { kind?: string })?.kind;
  if (kind === "permission-denied") return "Camera permission denied. Allow camera access in your browser settings.";
  if (kind === "no-camera") return "No camera found on this device.";
  if (kind === "insecure-context") return "Camera needs HTTPS (or localhost).";
  if (kind === "in-use") return "Camera is being used by another app or tab.";
  return (error as { message?: string })?.message || "Could not start the camera.";
};

const formatTime = (value?: string | null) =>
  value ? new Date(value).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "";

const RESULT_STYLES = {
  success: { box: "border-green-200 bg-green-50 text-green-800", Icon: CheckCircle2 },
  already: { box: "border-amber-200 bg-amber-50 text-amber-800", Icon: AlertTriangle },
  error: { box: "border-red-200 bg-red-50 text-red-700", Icon: XCircle },
};

const ScanPassModal = ({ onClose, onCheckedIn }: Props) => {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const lastScan = useRef({ value: "", at: 0 });
  const resumeTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resumeTimer.current), []);

  const checkIn = async (raw: string) => {
    const value = raw.trim();
    if (!value || busy) return;

    const now = Date.now();
    if (value === lastScan.current.value && now - lastScan.current.at < DUPLICATE_WINDOW_MS) return;
    lastScan.current = { value, at: now };

    setBusy(true);
    try {
      const res = await handleCheckInExhibitionPass(value);
      onCheckedIn(res.exhibition);
      setResult(
        res.result === "checked_in"
          ? { kind: "success", title: res.message, detail: res.exhibition.passcode }
          : {
              kind: "already",
              title: res.message,
              detail: `Checked in at ${formatTime(res.exhibition.checkedInAt)}`,
            },
      );
    } catch (error) {
      setResult({ kind: "error", title: getErrorMessage(error, "Could not verify this pass.") });
    } finally {
      setBusy(false);
      window.clearTimeout(resumeTimer.current);
      resumeTimer.current = window.setTimeout(() => setResult(null), RESUME_AFTER_MS);
    }
  };

  const handleScan = (codes: IDetectedBarcode[]) => {
    const raw = codes[0]?.rawValue;
    if (raw) checkIn(raw);
  };

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    lastScan.current = { value: "", at: 0 }; // allow re-submitting the same typed code
    checkIn(manualCode);
    setManualCode("");
  };

  const style = result ? RESULT_STYLES[result.kind] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-lg font-semibold text-gray-800">Scan Entry Pass</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-black">
            {cameraError ? (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-white">
                {cameraError}
              </div>
            ) : (
              <Scanner
                onScan={handleScan}
                onError={(error) => setCameraError(cameraErrorMessage(error))}
                paused={busy || Boolean(result)}
                formats={["qr_code", "code_128"]}
                constraints={{ facingMode: "environment" }}
                components={{ finder: true, torch: true }}
                sound
              />
            )}

            {busy && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 size={36} className="animate-spin text-white" />
              </div>
            )}
          </div>

          {result && style ? (
            <div className={`flex items-start gap-3 rounded-lg border p-3 ${style.box}`}>
              <style.Icon size={22} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">{result.title}</p>
                {result.detail && <p className="text-sm opacity-80">{result.detail}</p>}
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-gray-500">
              Point the camera at the QR code or barcode on the pass.
            </p>
          )}

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="Or type code: WWX-XXXX-XXXX"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              disabled={busy || !manualCode.trim()}
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              Check in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ScanPassModal;