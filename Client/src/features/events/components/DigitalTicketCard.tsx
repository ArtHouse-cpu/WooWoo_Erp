import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Calendar,
  Clock,
  MapPin,
  Download,
  Share2,
  CheckCircle2,
  Sparkles,
  Armchair,
} from "lucide-react";
import { toast } from "react-toastify";
import type { EventAttendee } from "../types/eventTypes";

interface DigitalTicketCardProps {
  attendee: EventAttendee;
  venueName?: string;
  venueAddress?: string;
  onPrint?: () => void;
  compact?: boolean;
}

export const DigitalTicketCard = ({
  attendee,
  venueName = "Grand Exhibition Hall, Mumbai",
  venueAddress = "Bandra Kurla Complex, Mumbai 400051",
  compact = false,
}: DigitalTicketCardProps) => {
  const ticketRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `${attendee.eventName} - Entry Pass`,
          text: `Here is the digital entry pass for ${attendee.name} (Pass Code: ${attendee.passCode})`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(
        `Pass Code: ${attendee.passCode} for ${attendee.eventName} (${attendee.name})`
      );
      toast.success("Pass details copied to clipboard!");
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div
        ref={ticketRef}
        className={`relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl transition-all dark:border-slate-800 dark:bg-slate-900 ${
          compact ? "p-3.5" : "p-5 sm:p-6"
        }`}
      >
        {/* Top Header Banner */}
        <div className="relative -mx-5 -mt-5 mb-4 bg-gradient-to-r from-orange-600 via-amber-600 to-indigo-700 px-5 py-4 text-white sm:-mx-6 sm:-mt-6 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-xs">
                <Sparkles size={16} className="text-white" />
              </span>
              <span className="text-xs font-bold tracking-wider uppercase opacity-90">
                Official Entry Pass
              </span>
            </div>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold text-white shadow-xs"
              style={{ backgroundColor: attendee.ticketColor || "#ea580c" }}
            >
              {attendee.ticketTypeName}
            </span>
          </div>

          <h3 className="mt-2 text-lg font-bold leading-tight sm:text-xl line-clamp-2">
            {attendee.eventName}
          </h3>
          {attendee.sessionName && (
            <p className="mt-1 text-xs text-orange-100 opacity-95">
              Session: {attendee.sessionName}
            </p>
          )}
        </div>

        {/* Event Details Grid */}
        <div className="space-y-2.5 border-b border-dashed border-gray-200 pb-4 text-xs text-gray-600 dark:border-slate-800 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-orange-600 shrink-0" />
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {attendee.eventDate}
            </span>
            <Clock size={14} className="ml-2 text-gray-400 shrink-0" />
            <span>09:30 AM IST</span>
          </div>

          <div className="flex items-start gap-2">
            <MapPin size={15} className="text-orange-600 shrink-0 mt-0.5" />
            <span className="line-clamp-2">
              <strong className="text-gray-800 dark:text-gray-200">{venueName}</strong> – {venueAddress}
            </span>
          </div>
        </div>

        {/* Perforated Notch Simulation */}
        <div className="relative my-4 flex items-center justify-between">
          <div className="absolute -left-8 h-6 w-6 rounded-full bg-[#F7F8FA] border-r border-gray-200 dark:bg-[#0f1318] dark:border-slate-800" />
          <div className="w-full border-b-2 border-dotted border-gray-300 dark:border-slate-700" />
          <div className="absolute -right-8 h-6 w-6 rounded-full bg-[#F7F8FA] border-l border-gray-200 dark:bg-[#0f1318] dark:border-slate-800" />
        </div>

        {/* Attendee Info & Pass Code */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Attendee Name
            </p>
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {attendee.name}
            </p>
            <p className="text-[11px] text-gray-500 truncate">{attendee.email}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Pass Code
            </p>
            <p className="font-mono text-base font-extrabold tracking-wider text-orange-600 dark:text-orange-400">
              {attendee.passCode}
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={12} /> Confirmed
            </span>
          </div>
        </div>

        {/* Seating Details */}
        {attendee.seatNumber && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-orange-50 px-3 py-2 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200">
            <div className="flex items-center gap-2">
              <Armchair size={16} className="text-orange-600" />
              <span className="text-xs font-semibold">Reserved Seat:</span>
            </div>
            <span className="font-mono text-sm font-black">{attendee.seatNumber}</span>
          </div>
        )}

        {/* QR Code and Barcode Section */}
        <div className="mt-5 flex flex-col items-center justify-center rounded-xl bg-gray-50 p-4 dark:bg-slate-800/60">
          <div className="rounded-lg bg-white p-2.5 shadow-xs dark:bg-white">
            <QRCodeSVG
              value={attendee.qrCodeValue || attendee.passCode}
              size={compact ? 130 : 160}
              level="H"
              includeMargin={false}
            />
          </div>
          <p className="mt-2 text-[11px] font-medium text-gray-500 dark:text-gray-400">
            Scan at gate for instant access
          </p>

          {/* Barcode representation */}
          <div className="mt-3 w-full border-t border-gray-200 pt-3 text-center dark:border-slate-700">
            <div className="mx-auto flex h-9 items-center justify-center gap-1 overflow-hidden px-4 opacity-75">
              {Array.from({ length: 42 }).map((_, i) => (
                <span
                  key={i}
                  className="h-full bg-gray-900 dark:bg-white inline-block"
                  style={{
                    width: i % 3 === 0 ? "3px" : i % 2 === 0 ? "1.5px" : "1px",
                    marginRight: i % 4 === 0 ? "2px" : "1px",
                  }}
                />
              ))}
            </div>
            <p className="mt-1 font-mono text-[10px] tracking-widest text-gray-500">
              {attendee.barcodeValue || "890123982101"}
            </p>
          </div>
        </div>

        {/* Check-in status badge */}
        <div className="mt-4 flex items-center justify-between text-[11px] text-gray-500">
          <span>Status:</span>
          {attendee.checkInStatus === "CheckedIn" ? (
            <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
              <CheckCircle2 size={13} /> Checked In (
              {attendee.checkedInAt
                ? new Date(attendee.checkedInAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Present"}
              )
            </span>
          ) : (
            <span className="font-semibold text-amber-600">Gate Entry Pending</span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 hover:text-black dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
        >
          <Download size={14} /> Download / Print
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-orange-700"
        >
          <Share2 size={14} /> Share Pass
        </button>
      </div>
    </div>
  );
};
