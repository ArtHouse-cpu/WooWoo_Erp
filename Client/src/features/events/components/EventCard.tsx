import {
  Calendar,
  MapPin,
  Ticket,
  Eye,
  Pencil,
  Copy,
  Trash2,
  MoreVertical,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Ban,
} from "lucide-react";
import type { EventItem, EventStatus } from "../types/eventTypes";
import { formatInr } from "../utils/eventHelpers";

interface EventCardProps {
  event: EventItem;
  onView: (event: EventItem) => void;
  onEdit: (event: EventItem) => void;
  onDuplicate: (eventId: string) => void;
  onPreview: (event: EventItem) => void;
  onTogglePublish: (event: EventItem) => void;
  onCancel: (eventId: string) => void;
  onDelete: (eventId: string) => void;
}

export const EventCard = ({
  event,
  onView,
  onEdit,
  onDuplicate,
  onPreview,
  onTogglePublish,
  onCancel,
  onDelete,
}: EventCardProps) => {
  const totalCapacity = event.tickets.reduce((sum, t) => sum + (t.totalQuantity || 0), 0);
  const totalSold = event.tickets.reduce((sum, t) => sum + (t.soldQuantity || 0), 0);
  const totalRevenue = event.tickets.reduce(
    (sum, t) => sum + (t.soldQuantity || 0) * (t.price || 0),
    0
  );
  const soldPercent = totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0;

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
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      {/* Cover Image & Category Badge */}
      <div className="relative h-44 w-full overflow-hidden bg-gray-100 dark:bg-slate-800">
        <img
          src={
            event.coverImage ||
            "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80"
          }
          alt={event.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-gray-900 backdrop-blur-xs dark:bg-slate-900/90 dark:text-white">
            {event.category || "Event"}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${getStatusBadge(
              event.status
            )}`}
          >
            {event.status}
          </span>
        </div>

        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white">
          <span className="font-mono text-xs font-bold drop-shadow-xs">
            {event.startDate}
          </span>
          <span className="rounded bg-black/40 px-2 py-0.5 text-[11px] font-semibold backdrop-blur-xs">
            {event.format}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3
          onClick={() => onView(event)}
          className="cursor-pointer text-sm font-bold text-gray-900 line-clamp-1 hover:text-orange-600 dark:text-white sm:text-base"
        >
          {event.name || "Untitled Event"}
        </h3>
        <p className="mt-1 text-xs text-gray-500 line-clamp-2">
          {event.shortTeaser || "No description provided."}
        </p>

        {/* Location & Time Meta */}
        <div className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin size={13} className="text-orange-600 shrink-0" />
            <span className="truncate">{event.venueName || "Venue TBA"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-orange-600 shrink-0" />
            <span>
              {event.startTime} - {event.endTime}
            </span>
          </div>
        </div>

        {/* Tickets & Sold Progress */}
        <div className="mt-4 border-t border-gray-100 pt-3 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Tickets Sold:</span>
            <span className="font-bold text-gray-900 dark:text-white">
              {totalSold} / {totalCapacity} ({soldPercent}%)
            </span>
          </div>

          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
            <div
              className="h-full bg-orange-600 transition-all duration-300"
              style={{ width: `${Math.min(100, soldPercent)}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-gray-500">Gross Sales:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {formatInr(totalRevenue)}
            </span>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-slate-800">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPreview(event)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-black dark:hover:bg-slate-800 dark:hover:text-white"
              title="Preview Landing Page"
            >
              <Eye size={16} />
            </button>
            <button
              type="button"
              onClick={() => onEdit(event)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-black dark:hover:bg-slate-800 dark:hover:text-white"
              title="Edit Event"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => onDuplicate(event.id)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-black dark:hover:bg-slate-800 dark:hover:text-white"
              title="Duplicate Event"
            >
              <Copy size={16} />
            </button>
            <button
              type="button"
              onClick={() => onTogglePublish(event)}
              className={`rounded-lg p-1.5 ${
                event.status === "Published"
                  ? "text-emerald-600 hover:bg-emerald-50"
                  : "text-gray-400 hover:bg-gray-100 hover:text-black"
              }`}
              title={event.status === "Published" ? "Unpublish Event" : "Publish Event"}
            >
              <CheckCircle2 size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            {event.status !== "Cancelled" && (
              <button
                type="button"
                onClick={() => onCancel(event.id)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                title="Cancel Event"
              >
                <Ban size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(event.id)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
              title="Delete Event"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
