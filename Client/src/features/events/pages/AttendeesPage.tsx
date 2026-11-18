import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Eye,
  RotateCcw,
  UserCheck,
  QrCode,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { useEventStore } from "../store/eventStore";
import type { EventAttendee } from "../types/eventTypes";
import { exportAttendeesToCsv } from "../utils/ticketExport";
import { DigitalTicketCard } from "../components/DigitalTicketCard";

export const AttendeesPage = () => {
  const { attendees, checkInAttendee, revertCheckIn, events } = useEventStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [eventFilter, setEventFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "CheckedIn" | "NotCheckedIn">("All");
  const [ticketFilter, setTicketFilter] = useState<string>("All");

  const [selectedPass, setSelectedPass] = useState<EventAttendee | null>(null);

  // KPIs
  const totalAttendees = attendees.length;
  const checkedInCount = attendees.filter((a) => a.checkInStatus === "CheckedIn").length;
  const pendingCount = totalAttendees - checkedInCount;
  const vipCount = attendees.filter((a) =>
    a.ticketTypeName.toLowerCase().includes("vip")
  ).length;

  // Filter options
  const ticketTypes = useMemo(() => {
    const set = new Set<string>();
    attendees.forEach((a) => {
      if (a.ticketTypeName) set.add(a.ticketTypeName);
    });
    return Array.from(set);
  }, [attendees]);

  // Filtered attendees
  const filteredAttendees = useMemo(() => {
    return attendees.filter((a) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = a.name.toLowerCase().includes(q);
        const matchesEmail = a.email.toLowerCase().includes(q);
        const matchesPhone = a.phone.toLowerCase().includes(q);
        const matchesCode = a.passCode.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesCode) return false;
      }

      if (eventFilter !== "All" && a.eventId !== eventFilter) return false;
      if (statusFilter !== "All" && a.checkInStatus !== statusFilter) return false;
      if (ticketFilter !== "All" && a.ticketTypeName !== ticketFilter) return false;

      return true;
    });
  }, [attendees, searchQuery, eventFilter, statusFilter, ticketFilter]);

  const handleToggleCheckIn = (attendee: EventAttendee) => {
    if (attendee.checkInStatus === "CheckedIn") {
      revertCheckIn(attendee.id);
      toast.info(`Marked ${attendee.name} as Not Checked In.`);
    } else {
      checkInAttendee(attendee.passCode, "Gate Admin");
      toast.success(`${attendee.name} marked as Present!`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            Attendee Directory & Passes
          </h1>
          <p className="text-xs text-gray-500">
            View all registered guests, pass codes, seat assignments, and check-in statuses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => exportAttendeesToCsv(filteredAttendees)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-200"
        >
          <FileSpreadsheet size={15} className="text-emerald-600" /> Export Attendees (Excel)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Total Attendees
          </span>
          <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
            {totalAttendees}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            Checked In (Present)
          </span>
          <p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-400 sm:text-xl">
            {checkedInCount}
          </p>
        </div>

        <div className="rounded-xl border border-amber-100 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
            Pending Entry
          </span>
          <p className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-400 sm:text-xl">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-xl border border-purple-100 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
            VIP Passes
          </span>
          <p className="mt-1 text-lg font-bold text-purple-700 dark:text-purple-400 sm:text-xl">
            {vipCount}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-56 flex-1 sm:max-w-xs">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, phone, pass code..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-xs text-gray-900 focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Event Filter */}
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
          >
            <option value="All">All Events</option>
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.name}
              </option>
            ))}
          </select>

          {/* Check-in Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
          >
            <option value="All">All Check-in Statuses</option>
            <option value="CheckedIn">Checked In (Present)</option>
            <option value="NotCheckedIn">Pending Entry (Absent)</option>
          </select>

          {/* Ticket Type Filter */}
          <select
            value={ticketFilter}
            onChange={(e) => setTicketFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
          >
            <option value="All">All Ticket Types</option>
            {ticketTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-gray-400 font-medium">
          {filteredAttendees.length} attendees found
        </span>
      </div>

      {/* Attendees Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-gray-300">
                <th className="py-3 px-3.5">Attendee</th>
                <th className="py-3 px-3.5">Contact</th>
                <th className="py-3 px-3.5">Event</th>
                <th className="py-3 px-3.5">Ticket Type & Seat</th>
                <th className="py-3 px-3.5">Pass Code</th>
                <th className="py-3 px-3.5 text-center">QR Code</th>
                <th className="py-3 px-3.5 text-center">Entry Status</th>
                <th className="py-3 px-3.5 text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredAttendees.length > 0 ? (
                filteredAttendees.map((att) => (
                  <tr
                    key={att.id}
                    className="hover:bg-gray-50/70 transition dark:hover:bg-slate-800/40"
                  >
                    {/* Attendee Name */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                          {att.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">
                            {att.name}
                          </p>
                          {att.customDetails?.designation && (
                            <p className="text-[10px] text-gray-400">
                              {att.customDetails.designation}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-3.5 text-gray-600 dark:text-gray-300">
                      <p>{att.email}</p>
                      <p className="text-[11px] text-gray-400">{att.phone}</p>
                    </td>

                    {/* Event */}
                    <td className="py-3 px-3.5">
                      <p className="font-bold text-gray-900 dark:text-white truncate max-w-xs">
                        {att.eventName}
                      </p>
                      <p className="text-[11px] text-gray-400">{att.eventDate}</p>
                    </td>

                    {/* Ticket Type & Seat */}
                    <td className="py-3 px-3.5">
                      <span
                        className="inline-block rounded px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs"
                        style={{ backgroundColor: att.ticketColor }}
                      >
                        {att.ticketTypeName}
                      </span>
                      {att.seatNumber ? (
                        <p className="mt-0.5 text-[11px] font-bold text-orange-600">
                          Seat: {att.seatNumber}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-gray-400">Open Seating</p>
                      )}
                    </td>

                    {/* Pass Code */}
                    <td className="py-3 px-3.5 font-mono font-extrabold text-orange-600 dark:text-orange-400">
                      {att.passCode}
                    </td>

                    {/* QR Code thumbnail */}
                    <td className="py-3 px-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedPass(att)}
                        className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1 text-gray-600 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-800"
                        title="Click to view full digital pass"
                      >
                        <QrCode size={18} />
                      </button>
                    </td>

                    {/* Check-in status */}
                    <td className="py-3 px-3.5 text-center">
                      {att.checkInStatus === "CheckedIn" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300">
                          <CheckCircle2 size={12} /> Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:border-slate-700 dark:bg-slate-800">
                          <Clock size={12} /> Pending
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedPass(att)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-black dark:hover:bg-slate-800 dark:hover:text-white"
                          title="View Digital Pass"
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleCheckIn(att)}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                            att.checkInStatus === "CheckedIn"
                              ? "border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-red-600 dark:border-slate-700"
                              : "bg-emerald-600 text-white hover:bg-emerald-700"
                          }`}
                        >
                          {att.checkInStatus === "CheckedIn" ? "Undo" : "Check In"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    No attendees match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Digital Pass View Modal */}
      {selectedPass && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setSelectedPass(null)}
              className="absolute top-3 right-3 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-black dark:hover:bg-slate-800"
            >
              <X size={20} />
            </button>
            <DigitalTicketCard attendee={selectedPass} />
          </div>
        </div>
      )}
    </div>
  );
};
