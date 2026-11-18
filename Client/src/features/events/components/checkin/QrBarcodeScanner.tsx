import { useState, useRef, useEffect, type FormEvent } from "react";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import {
  Camera,
  CameraOff,
  ScanLine,
  Search,
  Sparkles,
  Barcode,
  Loader2,
  Volume2,
  VolumeX,
  Smartphone,
  ShieldCheck,
} from "lucide-react";

interface QrBarcodeScannerProps {
  onScanCode: (code: string) => void;
  busy?: boolean;
  activeOperator?: string;
  onOperatorChange?: (operator: string) => void;
}

const DEMO_PRESET_CODES = [
  { code: "TSH-9821", label: "Valid VIP (TSH-9821)", kind: "valid" },
  { code: "TSH-4019", label: "Valid General (TSH-4019)", kind: "valid" },
  { code: "DCM-2201", label: "Workshop (DCM-2201)", kind: "valid" },
  { code: "TSH-8812", label: "Student Pass (TSH-8812)", kind: "valid" },
  { code: "INVALID-9999", label: "Invalid Code (404)", kind: "invalid" },
];

export const QrBarcodeScanner = ({
  onScanCode,
  busy = false,
  activeOperator = "Gate 1 - Main Concourse",
  onOperatorChange,
}: QrBarcodeScannerProps) => {
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string>("");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [manualCode, setManualCode] = useState<string>("");
  const [barcodeScanInput, setBarcodeScanInput] = useState<string>("");
  const lastScanRef = useRef({ value: "", time: 0 });

  const triggerBeep = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // AudioContext unavailable in silent policy
    }
  };

  const handleProcessCode = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return;

    const now = Date.now();
    // Debounce duplicate scans within 3 seconds
    if (cleaned === lastScanRef.current.value && now - lastScanRef.current.time < 3000) {
      return;
    }

    lastScanRef.current = { value: cleaned, time: now };
    triggerBeep();
    onScanCode(cleaned);
  };

  const handleDetectedBarcodes = (codes: IDetectedBarcode[]) => {
    const raw = codes[0]?.rawValue;
    if (raw) {
      // If QR encodes a composite format like "PASS_CODE|Name|...", extract first segment
      const pass = raw.split("|")[0].trim();
      handleProcessCode(pass);
    }
  };

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    lastScanRef.current = { value: "", time: 0 };
    handleProcessCode(manualCode);
    setManualCode("");
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      {/* Operator and Audio Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 text-xs dark:border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-orange-600" />
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            Check-in Gate:
          </span>
          <select
            value={activeOperator}
            onChange={(e) => onOperatorChange?.(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-bold text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="Gate 1 - Main Concourse">Gate 1 - Main Concourse</option>
            <option value="Gate 2 - VIP & Speaker Entrance">Gate 2 - VIP & Speaker Entrance</option>
            <option value="Gate 3 - Auditorium East">Gate 3 - Auditorium East</option>
            <option value="Gate 4 - Workshop Hall">Gate 4 - Workshop Hall</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
              soundEnabled
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-gray-100 text-gray-500 dark:bg-slate-800"
            }`}
            title="Toggle Scan Sound"
          >
            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span>{soundEnabled ? "Audio On" : "Muted"}</span>
          </button>

          <button
            type="button"
            onClick={() => setCameraActive(!cameraActive)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
              cameraActive
                ? "bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-300"
                : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300"
            }`}
          >
            {cameraActive ? <Camera size={13} /> : <CameraOff size={13} />}
            <span>{cameraActive ? "Camera On" : "Camera Off"}</span>
          </button>
        </div>
      </div>

      {/* Camera Viewport */}
      {cameraActive ? (
        <div className="relative aspect-4/3 sm:aspect-16/9 w-full overflow-hidden rounded-xl bg-black shadow-inner">
          {cameraError ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center text-xs text-white">
              <CameraOff size={32} className="text-gray-400 mb-2" />
              <p className="font-semibold">{cameraError}</p>
              <button
                type="button"
                onClick={() => setCameraError("")}
                className="mt-3 rounded-md bg-orange-600 px-3 py-1 text-xs font-bold text-white hover:bg-orange-700"
              >
                Retry Camera
              </button>
            </div>
          ) : (
            <Scanner
              onScan={handleDetectedBarcodes}
              onError={(err) => setCameraError("Camera unavailable or permission denied")}
              paused={busy}
              formats={["qr_code", "code_128", "code_39", "ean_13"]}
              constraints={{ facingMode: "environment" }}
              components={{ finder: true, torch: true }}
              sound={false}
            />
          )}

          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-2xs">
              <div className="flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2 text-xs font-bold text-gray-900 shadow-lg">
                <Loader2 size={18} className="animate-spin text-orange-600" />
                Validating Pass...
              </div>
            </div>
          )}

          {/* Scanner Reticle Overlay */}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center">
            <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-xs">
              Align QR code or Barcode inside viewfinder
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-6 text-center text-xs text-gray-500 dark:border-slate-800 dark:bg-slate-800/40">
          <ScanLine size={32} className="mx-auto text-gray-400 mb-2" />
          <p className="font-semibold text-gray-700 dark:text-gray-300">
            Camera Scanner is currently paused.
          </p>
          <p className="text-[11px] mt-0.5">
            You can type pass codes manually or connect a USB/Bluetooth barcode scanner.
          </p>
          <button
            type="button"
            onClick={() => setCameraActive(true)}
            className="mt-3 rounded-lg bg-orange-600 px-3 py-1.5 font-bold text-white hover:bg-orange-700"
          >
            Turn On Camera
          </button>
        </div>
      )}

      {/* Manual Search & Barcode Input */}
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            placeholder="Type Pass Code (e.g. TSH-9821) or Attendee Name / Email"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-xs font-semibold text-gray-900 outline-none focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={!manualCode.trim() || busy}
          className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-orange-700 disabled:opacity-50"
        >
          <ScanLine size={15} /> Verify & Check In
        </button>
      </form>

      {/* Quick Test Codes for Demo Convenience */}
      <div className="rounded-xl bg-gray-50 p-3 text-xs dark:bg-slate-800/50">
        <span className="font-bold text-gray-700 dark:text-gray-300 text-[11px] block mb-1.5">
          Quick Test Scan Simulators (Click to trigger instant scan):
        </span>
        <div className="flex flex-wrap gap-1.5">
          {DEMO_PRESET_CODES.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => handleProcessCode(item.code)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 shadow-2xs hover:border-orange-500 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
            >
              <Barcode size={13} className="text-gray-400" />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
