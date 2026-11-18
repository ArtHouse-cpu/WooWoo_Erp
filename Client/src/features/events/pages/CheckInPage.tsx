import { useState, useMemo } from "react";
import {
  ScanLine,
  UserCheck,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import { useEventStore } from "../store/eventStore";
import type { EventAttendee } from "../types/eventTypes";
import { QrBarcodeScanner } from "../components/checkin/QrBarcodeScanner";
import { AttendeeValidationCard } from "../components/checkin/AttendeeValidationCard";
import { RecentCheckInFeed } from "../components/checkin/RecentCheckInFeed";

export const CheckInPage = () => {
  const {
    attendees,
    events,
    checkInLogs,
    checkInAttendee,
    revertCheckIn,
  } = useEventStore();

  const [activeGate, setActiveGate] = useState<string>("Gate 1 - Main Concourse");
  const [selectedEventId, setSelectedEventId] = useState<string>("All");
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    status: "Valid" | "AlreadyUsed" | "NotFound" | "Cancelled" | "Refunded" | "WrongEvent";
    message: string;
    attendee?: EventAttendee;
  } | null>(null);

  // Filter attendees if event is selected
  const targetAttendees = useMemo(() => {
    if (selectedEventId === "All") return attendees;
    return attendees.filter((a) => a.eventId === selectedEventId);
  }, [attendees, selectedEventId]);

  // Attendance KPIs
  const totalSold = targetAttendees.length;
  const totalCheckedIn = targetAttendees.filter(
    (a) => a.checkInStatus === "CheckedIn"
  ).length;
  const remainingAttendees = Math.max(0, totalSold - totalCheckedIn);
  const checkInPercentage =
    totalSold > 0 ? Math.round((totalCheckedIn / totalSold) * 100) : 0;

  const handleScanCode = (code: string) => {
    const res = checkInAttendee(code, activeGate);

    // Check wrong event if event filter is active
    if (
      res.success &&
      selectedEventId !== "All" &&
      res.attendee &&
      res.attendee.eventId !== selectedEventId
    ) {
      setValidationResult({
        success: false,
        status: "WrongEvent",
        message: `This pass is registered for "${res.attendee.eventName}", not the selected event.`,
        attendee: res.attendee,
      });
      return;
    }

    setValidationResult(res);
  };

  const handleConfirmCheckIn = (attendeeId: string) => {
    const attendee = attendees.find((a) => a.id === attendeeId);
    if (!attendee) return;
    const res = checkInAttendee(attendee.passCode, activeGate);
    setValidationResult(res);
    toast.success(`Check-in confirmed for ${attendee.name}!`);
  };

  const handleUndoCheckIn = (attendeeId: string) => {
    const ok = revertCheckIn(attendeeId, activeGate);
    if (ok) {
      toast.info("Check-in undone. Attendee status set to Pending.");
      setValidationResult(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            Gate Entry & Check-In Management
          </h1>
          <p className="text-xs text-gray-500">
            Real-time QR/barcode scanner, instant validation, duplicate prevention, and attendee pass lookup.
          </p>
        </div>

        {/* Event Selector Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            Active Event:
          </span>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          >
            <option value="All">All Live Events (Global Gate)</option>
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Attendance KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Total Tickets Sold
            </span>
            <Users size={16} className="text-gray-400" />
          </div>
          <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
            {totalSold}
          </p>
          <p className="text-[11px] text-gray-400">Registered delegates</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Checked In
            </span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {totalCheckedIn}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold">
            {checkInPercentage}% attendance rate
          </p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
              Remaining Attendees
            </span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <p className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">
            {remainingAttendees}
          </p>
          <p className="text-[11px] text-gray-400">Expected at gate</p>
        </div>

        <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300">
              Turnout Progress
            </span>
            <ScanLine size={16} className="text-orange-600" />
          </div>
          <p className="mt-1 text-2xl font-black text-orange-600 dark:text-orange-400">
            {checkInPercentage}%
          </p>
          {/* Animated Progress bar */}
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-orange-200/50 dark:bg-slate-800">
            <div
              className="h-full bg-orange-600 transition-all duration-500"
              style={{ width: `${checkInPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Scanner & Validation on Left, Activity Feed on Right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Scanner & Live Result (7 cols) */}
        <div className="space-y-4 lg:col-span-7">
          <QrBarcodeScanner
            onScanCode={handleScanCode}
            activeOperator={activeGate}
            onOperatorChange={setActiveGate}
          />

          {/* Validation Feedback Result Banner */}
          {validationResult && (
            <AttendeeValidationCard
              result={validationResult}
              onConfirmCheckIn={handleConfirmCheckIn}
              onUndoCheckIn={handleUndoCheckIn}
            />
          )}
        </div>

        {/* Live Feed (5 cols) */}
        <div className="lg:col-span-5">
          <RecentCheckInFeed
            logs={checkInLogs}
            onUndoCheckIn={handleUndoCheckIn}
          />
        </div>
      </div>
    </div>
  );
};
