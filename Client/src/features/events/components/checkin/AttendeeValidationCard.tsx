import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  UserCheck,
  Calendar,
  Clock,
  Armchair,
  Sparkles,
  Ticket,
} from "lucide-react";
import type { EventAttendee } from "../../types/eventTypes";

interface ValidationResult {
  success: boolean;
  status: "Valid" | "AlreadyUsed" | "NotFound" | "Cancelled" | "Refunded" | "WrongEvent";
  message: string;
  attendee?: EventAttendee;
}

interface AttendeeValidationCardProps {
  result: ValidationResult | null;
  onConfirmCheckIn?: (attendeeId: string) => void;
  onUndoCheckIn?: (attendeeId: string) => void;
}

export const AttendeeValidationCard = ({
  result,
  onConfirmCheckIn,
  onUndoCheckIn,
}: AttendeeValidationCardProps) => {
  if (!result) return null;

  const { status, message, attendee } = result;

  const getStatusBanner = () => {
    switch (status) {
      case "Valid":
        return {
          bg: "bg-emerald-600 text-white",
          icon: <CheckCircle2 size={32} className="animate-bounce" />,
          title: "ENTRY APPROVED · VALID TICKET",
        };
      case "AlreadyUsed":
        return {
          bg: "bg-amber-500 text-white",
          icon: <AlertTriangle size={32} />,
          title: "ALREADY USED · ENTRY DENIED",
        };
      case "Cancelled":
        return {
          bg: "bg-rose-600 text-white",
          icon: <XCircle size={32} />,
          title: "CANCELLED TICKET · ENTRY DENIED",
        };
      case "Refunded":
        return {
          bg: "bg-rose-600 text-white",
          icon: <XCircle size={32} />,
          title: "REFUNDED ORDER · ENTRY DENIED",
        };
      case "WrongEvent":
        return {
          bg: "bg-orange-600 text-white",
          icon: <AlertTriangle size={32} />,
          title: "WRONG EVENT / SESSION",
        };
      case "NotFound":
      default:
        return {
          bg: "bg-red-600 text-white",
          icon: <XCircle size={32} />,
          title: "INVALID TICKET · NOT FOUND",
        };
    }
  };

  const banner = getStatusBanner();

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg transition-all dark:border-slate-800 dark:bg-slate-900">
      {/* Top Banner Alert */}
      <div className={`flex items-center gap-3 px-5 py-4 ${banner.bg}`}>
        <div className="shrink-0">{banner.icon}</div>
        <div>
          <h3 className="text-sm font-black tracking-wider sm:text-base">
            {banner.title}
          </h3>
          <p className="text-xs opacity-95">{message}</p>
        </div>
      </div>

      {/* Attendee Details Card if attendee found */}
      {attendee && (
        <div className="p-5 text-xs text-gray-700 dark:text-gray-300">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Attendee Name
              </p>
              <p className="text-base font-extrabold text-gray-900 dark:text-white">
                {attendee.name}
              </p>
              <p className="text-[11px] text-gray-500">{attendee.email}</p>
              <p className="text-[11px] text-gray-500">{attendee.phone}</p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Ticket Details
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: attendee.ticketColor }}
                />
                <span className="font-bold text-gray-900 dark:text-white">
                  {attendee.ticketTypeName}
                </span>
              </div>
              <p className="font-mono text-sm font-black text-orange-600 mt-1">
                Pass Code: {attendee.passCode}
              </p>
            </div>

            <div className="sm:col-span-2 rounded-xl bg-gray-50 p-3 dark:bg-slate-800/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {attendee.eventName}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {attendee.eventDate} {attendee.sessionName ? `· ${attendee.sessionName}` : ""}
                  </p>
                </div>

                {attendee.seatNumber && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-orange-100 px-3 py-1.5 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
                    <Armchair size={16} />
                    <span className="font-bold">Seat {attendee.seatNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-slate-800">
            <div className="text-[11px] text-gray-400">
              {attendee.checkInStatus === "CheckedIn" ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} /> Checked In at{" "}
                  {new Date(attendee.checkedInAt || Date.now()).toLocaleTimeString("en-IN")}
                </span>
              ) : (
                <span className="text-amber-600 font-semibold">Entry pending scan</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {attendee.checkInStatus === "CheckedIn" && onUndoCheckIn && (
                <button
                  type="button"
                  onClick={() => onUndoCheckIn(attendee.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-2xs hover:bg-gray-100 hover:text-red-600 dark:border-slate-700 dark:bg-slate-800"
                >
                  <RotateCcw size={13} /> Undo Check-in
                </button>
              )}

              {attendee.checkInStatus !== "CheckedIn" && onConfirmCheckIn && (
                <button
                  type="button"
                  onClick={() => onConfirmCheckIn(attendee.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                >
                  <UserCheck size={15} /> Confirm Gate Entry
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
