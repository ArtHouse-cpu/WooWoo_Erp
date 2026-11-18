import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Calendar,
  Sparkles,
  Download,
  RotateCcw,
} from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useEventStore } from "../store/eventStore";
import type { EventItem, EventStatus } from "../types/eventTypes";
import { EventKpiCards } from "../components/EventKpiCards";
import { EventTable } from "../components/EventTable";
import { EventCard } from "../components/EventCard";
import { CreateEventWizard } from "../components/wizard/CreateEventWizard";
import { EventPreviewModal } from "../components/EventPreviewModal";

export const EventsDashboardPage = () => {
  const {
    events,
    orders,
    attendees,
    deleteEvent,
    duplicateEvent,
    setEventStatus,
    resetToDefaultSeed,
  } = useEventStore();

  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | EventStatus>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<"All" | "Free" | "Paid">("All");

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewingEvent, setPreviewingEvent] = useState<EventItem | null>(null);

  // Unique categories for filter dropdown
  const categories = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set);
  }, [events]);

  // KPIs
  const totalEvents = events.length;
  const publishedEvents = events.filter((e) => e.status === "Published").length;
  const draftEvents = events.filter((e) => e.status === "Draft").length;
  const totalRegistrations = orders.length;
  const totalTicketsSold = attendees.length;
  const totalRevenue = orders
    .filter((o) => o.paymentStatus === "Paid")
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const totalCheckedIn = attendees.filter(
    (a) => a.checkInStatus === "CheckedIn"
  ).length;

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = e.name.toLowerCase().includes(q);
        const matchesVenue = e.venueName.toLowerCase().includes(q);
        const matchesOrganizer = e.organizer.toLowerCase().includes(q);
        if (!matchesName && !matchesVenue && !matchesOrganizer) return false;
      }

      // Status
      if (statusFilter !== "All" && e.status !== statusFilter) return false;

      // Category
      if (categoryFilter !== "All" && e.category !== categoryFilter) return false;

      // Type (Free / Paid)
      if (typeFilter === "Free" && !e.tickets.some((t) => t.isFree || t.price === 0)) {
        return false;
      }
      if (typeFilter === "Paid" && !e.tickets.some((t) => !t.isFree && t.price > 0)) {
        return false;
      }

      return true;
    });
  }, [events, searchQuery, statusFilter, categoryFilter, typeFilter]);

  const handleCreateNew = () => {
    setEditingEvent(null);
    setWizardOpen(true);
  };

  const handleEdit = (event: EventItem) => {
    setEditingEvent(event);
    setWizardOpen(true);
  };

  const handleView = (event: EventItem) => {
    setPreviewingEvent(event);
    setPreviewOpen(true);
  };

  const handlePreview = (event: EventItem) => {
    setPreviewingEvent(event);
    setPreviewOpen(true);
  };

  const handleDuplicate = (eventId: string) => {
    const dup = duplicateEvent(eventId);
    toast.success(`Duplicated as "${dup.name}"`);
  };

  const handleTogglePublish = (event: EventItem) => {
    const newStatus: EventStatus =
      event.status === "Published" ? "Draft" : "Published";
    setEventStatus(event.id, newStatus);
    toast.info(`Event status updated to ${newStatus}`);
  };

  const handleCancel = (eventId: string) => {
    Swal.fire({
      title: "Cancel this Event?",
      text: "Cancelling will notify registered attendees and halt further ticket sales.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ea580c",
      confirmButtonText: "Yes, Mark Cancelled",
    }).then((res) => {
      if (res.isConfirmed) {
        setEventStatus(eventId, "Cancelled");
        toast.warning("Event has been cancelled.");
      }
    });
  };

  const handleDelete = (eventId: string) => {
    Swal.fire({
      title: "Delete Event?",
      text: "This action cannot be undone. All event configuration will be removed.",
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete Permanently",
    }).then((res) => {
      if (res.isConfirmed) {
        deleteEvent(eventId);
        toast.success("Event deleted.");
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            Event Management
          </h1>
          <p className="text-xs text-gray-500">
            Create, configure, publish, and manage enterprise events, seating, and digital ticketing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetToDefaultSeed}
            className="hidden items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-2xs hover:bg-gray-50 sm:flex dark:border-slate-800 dark:bg-slate-900 dark:text-gray-300"
            title="Reset to comprehensive demo data"
          >
            <RotateCcw size={13} /> Reset Demo Data
          </button>

          <button
            type="button"
            onClick={handleCreateNew}
            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-orange-700 transition"
          >
            <Plus size={16} /> + Create Event
          </button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <EventKpiCards
        totalEvents={totalEvents}
        publishedEvents={publishedEvents}
        draftEvents={draftEvents}
        totalRegistrations={totalRegistrations}
        totalTicketsSold={totalTicketsSold}
        totalRevenue={totalRevenue}
        totalCheckedIn={totalCheckedIn}
      />

      {/* Filters & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
          {/* Search */}
          <div className="relative min-w-44 flex-1 sm:max-w-xs">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event name, venue..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-xs text-gray-900 focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
          >
            <option value="All">All Statuses</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Event Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
          >
            <option value="All">All Types (Free & Paid)</option>
            <option value="Paid">Paid Only</option>
            <option value="Free">Free Only</option>
          </select>
        </div>

        {/* View Toggle: Table vs Cards */}
        <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-slate-800 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              viewMode === "table"
                ? "bg-white text-gray-900 shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
            title="Table View"
          >
            <List size={14} />
            <span className="hidden sm:inline">Table</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              viewMode === "cards"
                ? "bg-white text-gray-900 shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
            title="Cards View"
          >
            <LayoutGrid size={14} />
            <span className="hidden sm:inline">Cards</span>
          </button>
        </div>
      </div>

      {/* Render Main Content: Table or Cards */}
      {viewMode === "table" ? (
        <EventTable
          events={filteredEvents}
          onView={handleView}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onPreview={handlePreview}
          onTogglePublish={handleTogglePublish}
          onCancel={handleCancel}
          onDelete={handleDelete}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onView={handleView}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onPreview={handlePreview}
              onTogglePublish={handleTogglePublish}
              onCancel={handleCancel}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Wizard */}
      {wizardOpen && (
        <CreateEventWizard
          isOpen={wizardOpen}
          initialEvent={editingEvent}
          onClose={() => setWizardOpen(false)}
        />
      )}

      {/* Live Preview Modal */}
      {previewOpen && previewingEvent && (
        <EventPreviewModal
          event={previewingEvent}
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
};
