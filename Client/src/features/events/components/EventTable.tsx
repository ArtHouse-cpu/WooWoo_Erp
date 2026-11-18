import {
  Eye,
  Pencil,
  Copy,
  Trash2,
  CheckCircle2,
  XCircle,
  Ban,
  Calendar,
  MapPin,
  Ticket,
} from "lucide-react";
import type { EventItem, EventStatus } from "../types/eventTypes";
import { formatInr } from "../utils/eventHelpers";

interface EventTableProps {
  events: EventItem[];
  onView: (event: EventItem) => void;
  onEdit: (event: EventItem) => void;
  onDuplicate: (eventId: string) => void;
  onPreview: (event: EventItem) => void;
  onTogglePublish: (event: EventItem) => void;
  onCancel: (eventId: string) => void;
  onDelete: (eventId: string) => void;
}

export const EventTable = ({
  events,
  onView,
  onEdit,
  onDuplicate,
  onPreview,
  onTogglePublish,
  onCancel,
  onDelete,
}: EventTableProps) => {
  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case "Published":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
      case "Draft":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
      case "Completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300";
      case "Cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-gray-300">
              <th className="py-3 px-3.5 text-center w-12">#</th>
              <th className="py-3 px-3.5">Event Image & Details</th>
              <th className="py-3 px-3.5">Category</th>
              <th className="py-3 px-3.5">Date & Venue</th>
              <th className="py-3 px-3.5">Ticket Types</th>
              <th className="py-3 px-3.5 text-center">Tickets Sold</th>
              <th className="py-3 px-3.5 text-right">Revenue</th>
              <th className="py-3 px-3.5 text-center">Status</th>
              <th className="py-3 px-3.5 text-right w-44">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {events.length > 0 ? (
              events.map((event, index) => {
                const totalCapacity = event.tickets.reduce(
                  (sum, t) => sum + (t.totalQuantity || 0),
                  0
                );
                const totalSold = event.tickets.reduce(
                  (sum, t) => sum + (t.soldQuantity || 0),
                  0
                );
                const totalRevenue = event.tickets.reduce(
                  (sum, t) => sum + (t.soldQuantity || 0) * (t.price || 0),
                  0
                );
                const soldPercent =
                  totalCapacity > 0
                    ? Math.round((totalSold / totalCapacity) * 100)
                    : 0;

                return (
                  <tr
                    key={event.id}
                    className="hover:bg-gray-50/70 transition dark:hover:bg-slate-800/40"
                  >
                    <td className="py-3 px-3.5 text-center font-mono text-gray-400">
                      {index + 1}
                    </td>

                    {/* Image & Name */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            event.coverImage ||
                            "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=200&q=80"
                          }
                          alt=""
                          className="h-10 w-14 shrink-0 rounded-lg object-cover border border-gray-200 dark:border-slate-700"
                        />
                        <div className="min-w-0">
                          <p
                            onClick={() => onView(event)}
                            className="cursor-pointer font-bold text-gray-900 hover:text-orange-600 dark:text-white truncate max-w-xs"
                          >
                            {event.name}
                          </p>
                          <span className="text-[11px] text-gray-400">
                            By {event.organizer || "WooWoo"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:bg-slate-800 dark:text-gray-300">
                        {event.category}
                      </span>
                    </td>

                    {/* Date & Venue */}
                    <td className="py-3 px-3.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {event.startDate}
                      </p>
                      <p className="text-[11px] truncate max-w-[160px]">
                        {event.venueName} ({event.city})
                      </p>
                    </td>

                    {/* Ticket Categories */}
                    <td className="py-3 px-3.5">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {event.tickets.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: t.color }}
                            title={`${t.name} (${formatInr(t.price)})`}
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Tickets Sold */}
                    <td className="py-3 px-3.5 text-center">
                      <span className="font-bold text-gray-900 dark:text-white">
                        {totalSold} / {totalCapacity}
                      </span>
                      <div className="mx-auto mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                        <div
                          className="h-full bg-orange-600"
                          style={{ width: `${Math.min(100, soldPercent)}%` }}
                        />
                      </div>
                    </td>

                    {/* Revenue */}
                    <td className="py-3 px-3.5 text-right font-bold font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatInr(totalRevenue)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3.5 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${getStatusBadge(
                          event.status
                        )}`}
                      >
                        {event.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onPreview(event)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-black dark:hover:bg-slate-800 dark:hover:text-white"
                          title="Preview Landing Page"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(event)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-black dark:hover:bg-slate-800 dark:hover:text-white"
                          title="Edit Event"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicate(event.id)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-black dark:hover:bg-slate-800 dark:hover:text-white"
                          title="Duplicate Event"
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onTogglePublish(event)}
                          className={`rounded-md p-1.5 ${
                            event.status === "Published"
                              ? "text-emerald-600 hover:bg-emerald-50"
                              : "text-gray-400 hover:bg-gray-100 hover:text-black"
                          }`}
                          title={
                            event.status === "Published"
                              ? "Unpublish to Draft"
                              : "Publish Event"
                          }
                        >
                          <CheckCircle2 size={15} />
                        </button>
                        {event.status !== "Cancelled" && (
                          <button
                            type="button"
                            onClick={() => onCancel(event.id)}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            title="Cancel Event"
                          >
                            <Ban size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDelete(event.id)}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete Event"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-12 text-center text-gray-400">
                  No events found matching your filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
