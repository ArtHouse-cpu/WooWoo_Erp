import { useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Image as ImageIcon,
  Plus,
  Trash2,
  Video,
  Globe,
  Building,
  Tag,
  Bold,
  Italic,
  List,
} from "lucide-react";
import type { EventItem, EventDateSchedule, EventSession, EventFormat } from "../../types/eventTypes";
import { generateId } from "../../utils/eventHelpers";

interface Step1GeneralProps {
  event: EventItem;
  onChange: (updates: Partial<EventItem>) => void;
}

const DEFAULT_CATEGORIES = [
  "Technology",
  "Design & Arts",
  "Finance & Banking",
  "Healthcare",
  "Marketing & Sales",
  "Exhibition & Trade",
  "Entertainment & Music",
  "Food & Beverage",
  "Workshop & Education",
];

const PRESET_BANNERS = [
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80",
];

export const Step1General = ({ event, onChange }: Step1GeneralProps) => {
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const handleAddCategory = () => {
    if (!newCategoryInput.trim()) return;
    const cat = newCategoryInput.trim();
    if (!categories.includes(cat)) {
      setCategories((prev) => [...prev, cat]);
    }
    onChange({ category: cat });
    setNewCategoryInput("");
    setShowAddCategory(false);
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const tag = tagInput.trim();
    if (!event.tags?.includes(tag)) {
      onChange({ tags: [...(event.tags || []), tag] });
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange({ tags: event.tags?.filter((t) => t !== tagToRemove) || [] });
  };

  const handleAddDateSchedule = () => {
    const newSchedule: EventDateSchedule = {
      id: generateId(),
      date: new Date(Date.now() + (event.multipleDates.length + 1) * 86400000)
        .toISOString()
        .slice(0, 10),
      startTime: "09:00",
      endTime: "18:00",
      sessions: [
        {
          id: generateId(),
          title: "Session 1: Opening",
          date: new Date(Date.now() + (event.multipleDates.length + 1) * 86400000)
            .toISOString()
            .slice(0, 10),
          startTime: "09:30",
          endTime: "11:00",
          location: "Main Stage",
        },
      ],
    };
    onChange({ multipleDates: [...event.multipleDates, newSchedule] });
  };

  const handleRemoveDateSchedule = (id: string) => {
    onChange({ multipleDates: event.multipleDates.filter((d) => d.id !== id) });
  };

  const handleAddSession = (scheduleId: string) => {
    const schedule = event.multipleDates.find((d) => d.id === scheduleId);
    if (!schedule) return;

    const newSession: EventSession = {
      id: generateId(),
      title: `Session ${schedule.sessions.length + 1}`,
      date: schedule.date,
      startTime: "14:00",
      endTime: "16:00",
      location: "Room A",
    };

    const updated = event.multipleDates.map((d) =>
      d.id === scheduleId ? { ...d, sessions: [...d.sessions, newSession] } : d
    );
    onChange({ multipleDates: updated });
  };

  const handleRemoveSession = (scheduleId: string, sessionId: string) => {
    const updated = event.multipleDates.map((d) =>
      d.id === scheduleId
        ? { ...d, sessions: d.sessions.filter((s) => s.id !== sessionId) }
        : d
    );
    onChange({ multipleDates: updated });
  };

  const handleFormatChange = (format: EventFormat) => {
    onChange({ format });
  };

  return (
    <div className="space-y-8">
      {/* SECTION 1: EVENT DETAILS */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
          1. Basic Event Details
        </h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Core information that appears on the public event page, tickets, and search listings.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Event Name */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Event Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={event.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. India Cloud & AI Summit 2026"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Short Teaser */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Short Teaser / Tagline
            </label>
            <input
              type="text"
              value={event.shortTeaser}
              onChange={(e) => onChange({ shortTeaser: e.target.value })}
              placeholder="A one-line punchy description for social shares and cards"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Event Category with Custom Support */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Event Category
              </label>
              <button
                type="button"
                onClick={() => setShowAddCategory(!showAddCategory)}
                className="text-[11px] font-semibold text-orange-600 hover:underline"
              >
                + Add Custom Category
              </button>
            </div>

            {showAddCategory ? (
              <div className="mt-1 flex gap-1.5">
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  placeholder="New category name"
                  className="w-full rounded-lg border border-orange-300 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-700"
                >
                  Save
                </button>
              </div>
            ) : (
              <select
                value={event.category}
                onChange={(e) => onChange({ category: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Organizer */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Organizer Name
            </label>
            <input
              type="text"
              value={event.organizer}
              onChange={(e) => onChange({ organizer: e.target.value })}
              placeholder="e.g. WooWoo ArtHouse"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Contact Email & Number */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Contact Email
            </label>
            <input
              type="email"
              value={event.contactEmail}
              onChange={(e) => onChange({ contactEmail: e.target.value })}
              placeholder="events@company.com"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Contact Phone
            </label>
            <input
              type="text"
              value={event.contactNumber}
              onChange={(e) => onChange({ contactNumber: e.target.value })}
              placeholder="+91 98200 12345"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Cover Image & Presets */}
        <div className="mt-5 border-t border-gray-100 pt-4 dark:border-slate-800">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
            Event Cover Image URL
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={event.coverImage}
              onChange={(e) => onChange({ coverImage: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-[11px] font-medium text-gray-500">Preset Banners:</span>
            <div className="flex gap-2">
              {PRESET_BANNERS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChange({ coverImage: preset })}
                  className="h-9 w-14 overflow-hidden rounded-md border border-gray-300 hover:ring-2 hover:ring-orange-500 transition"
                >
                  <img src={preset} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Rich Text About the Event */}
        <div className="mt-5 border-t border-gray-100 pt-4 dark:border-slate-800">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            About the Event (Description)
          </label>
          <div className="flex items-center gap-1 rounded-t-lg border border-b-0 border-gray-200 bg-gray-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              className="rounded p-1 text-gray-600 hover:bg-gray-200 dark:text-gray-300"
              title="Bold"
            >
              <Bold size={13} />
            </button>
            <button
              type="button"
              className="rounded p-1 text-gray-600 hover:bg-gray-200 dark:text-gray-300"
              title="Italic"
            >
              <Italic size={13} />
            </button>
            <button
              type="button"
              className="rounded p-1 text-gray-600 hover:bg-gray-200 dark:text-gray-300"
              title="List"
            >
              <List size={13} />
            </button>
          </div>
          <textarea
            rows={4}
            value={event.aboutRichText}
            onChange={(e) => onChange({ aboutRichText: e.target.value })}
            placeholder="Provide a detailed overview of the schedule, keynotes, activities, and who should attend..."
            className="w-full rounded-b-lg border border-gray-200 p-3 text-xs text-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {/* Tags */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
            Event Tags (Keywords)
          </label>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {event.tags?.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-950/60 dark:text-orange-300"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t)}
                  className="text-orange-400 hover:text-orange-700"
                >
                  ×
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="+ Add tag..."
                className="w-28 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="rounded-md bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: DATE & TIME */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              2. Date and Time Configuration
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Single-day event vs multi-day festival/conference with session slots.
            </p>
          </div>

          {/* Toggle Single vs Multiple */}
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-slate-800 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => onChange({ isMultipleDates: false })}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                !event.isMultipleDates
                  ? "bg-white text-orange-600 shadow-xs dark:bg-slate-700 dark:text-orange-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Single Date
            </button>
            <button
              type="button"
              onClick={() => {
                onChange({ isMultipleDates: true });
                if (event.multipleDates.length === 0) handleAddDateSchedule();
              }}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                event.isMultipleDates
                  ? "bg-white text-orange-600 shadow-xs dark:bg-slate-700 dark:text-orange-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Multiple Dates & Sessions
            </button>
          </div>
        </div>

        {/* OPTION 1: SINGLE DATE */}
        {!event.isMultipleDates ? (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Start Date
              </label>
              <input
                type="date"
                value={event.startDate}
                onChange={(e) => onChange({ startDate: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Start Time
              </label>
              <input
                type="time"
                value={event.startTime}
                onChange={(e) => onChange({ startTime: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                End Date
              </label>
              <input
                type="date"
                value={event.endDate}
                onChange={(e) => onChange({ endDate: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                End Time
              </label>
              <input
                type="time"
                value={event.endTime}
                onChange={(e) => onChange({ endTime: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>
        ) : (
          /* OPTION 2: MULTIPLE DATES & SESSIONS */
          <div className="mt-5 space-y-4">
            {event.multipleDates.map((sched, idx) => (
              <div
                key={sched.id}
                className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    Day {idx + 1} Schedule
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDateSchedule(sched.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove Date
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                      Event Date
                    </label>
                    <input
                      type="date"
                      value={sched.date}
                      onChange={(e) => {
                        const updated = event.multipleDates.map((d) =>
                          d.id === sched.id ? { ...d, date: e.target.value } : d
                        );
                        onChange({ multipleDates: updated });
                      }}
                      className="mt-1 w-full rounded-md border border-gray-200 p-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                      Day Start Time
                    </label>
                    <input
                      type="time"
                      value={sched.startTime}
                      onChange={(e) => {
                        const updated = event.multipleDates.map((d) =>
                          d.id === sched.id ? { ...d, startTime: e.target.value } : d
                        );
                        onChange({ multipleDates: updated });
                      }}
                      className="mt-1 w-full rounded-md border border-gray-200 p-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                      Day End Time
                    </label>
                    <input
                      type="time"
                      value={sched.endTime}
                      onChange={(e) => {
                        const updated = event.multipleDates.map((d) =>
                          d.id === sched.id ? { ...d, endTime: e.target.value } : d
                        );
                        onChange({ multipleDates: updated });
                      }}
                      className="mt-1 w-full rounded-md border border-gray-200 p-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>

                {/* Sessions list */}
                <div className="mt-4 border-t border-gray-200 pt-3 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400">
                      Sessions on this date:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddSession(sched.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:underline"
                    >
                      <Plus size={12} /> Add Session Slot
                    </button>
                  </div>

                  <div className="space-y-2">
                    {sched.sessions.map((sess) => (
                      <div
                        key={sess.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-2.5 shadow-2xs dark:bg-slate-800"
                      >
                        <input
                          type="text"
                          value={sess.title}
                          onChange={(e) => {
                            const updated = event.multipleDates.map((d) =>
                              d.id === sched.id
                                ? {
                                    ...d,
                                    sessions: d.sessions.map((s) =>
                                      s.id === sess.id ? { ...s, title: e.target.value } : s
                                    ),
                                  }
                                : d
                            );
                            onChange({ multipleDates: updated });
                          }}
                          placeholder="Session Title"
                          className="flex-1 min-w-32 rounded border border-gray-200 px-2 py-1 text-xs dark:border-slate-700"
                        />

                        <input
                          type="time"
                          value={sess.startTime}
                          onChange={(e) => {
                            const updated = event.multipleDates.map((d) =>
                              d.id === sched.id
                                ? {
                                    ...d,
                                    sessions: d.sessions.map((s) =>
                                      s.id === sess.id ? { ...s, startTime: e.target.value } : s
                                    ),
                                  }
                                : d
                            );
                            onChange({ multipleDates: updated });
                          }}
                          className="w-24 rounded border border-gray-200 px-2 py-1 text-xs dark:border-slate-700"
                        />
                        <span className="text-xs text-gray-400">to</span>
                        <input
                          type="time"
                          value={sess.endTime}
                          onChange={(e) => {
                            const updated = event.multipleDates.map((d) =>
                              d.id === sched.id
                                ? {
                                    ...d,
                                    sessions: d.sessions.map((s) =>
                                      s.id === sess.id ? { ...s, endTime: e.target.value } : s
                                    ),
                                  }
                                : d
                            );
                            onChange({ multipleDates: updated });
                          }}
                          className="w-24 rounded border border-gray-200 px-2 py-1 text-xs dark:border-slate-700"
                        />

                        <input
                          type="text"
                          value={sess.location || ""}
                          onChange={(e) => {
                            const updated = event.multipleDates.map((d) =>
                              d.id === sched.id
                                ? {
                                    ...d,
                                    sessions: d.sessions.map((s) =>
                                      s.id === sess.id ? { ...s, location: e.target.value } : s
                                    ),
                                  }
                                : d
                            );
                            onChange({ multipleDates: updated });
                          }}
                          placeholder="Hall / Room"
                          className="w-28 rounded border border-gray-200 px-2 py-1 text-xs dark:border-slate-700"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveSession(sched.id, sess.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddDateSchedule}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-orange-300 bg-orange-50/50 px-3.5 py-2 text-xs font-bold text-orange-600 hover:bg-orange-100 dark:border-slate-700 dark:bg-slate-800"
            >
              <Plus size={14} /> + Add Another Date & Sessions
            </button>
          </div>
        )}
      </div>

      {/* SECTION 3: LOCATION & VENUE */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
          3. Event Format & Venue Location
        </h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Physical on-ground venue, online interactive streaming, or hybrid event.
        </p>

        {/* Format Selector */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {(["Physical", "Online", "Hybrid"] as EventFormat[]).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => handleFormatChange(fmt)}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                event.format === fmt
                  ? "border-orange-500 bg-orange-50/80 text-orange-700 shadow-xs ring-2 ring-orange-500/20 dark:bg-orange-950/30 dark:text-orange-300"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-800 dark:text-gray-300"
              }`}
            >
              {fmt === "Physical" && <Building size={16} />}
              {fmt === "Online" && <Video size={16} />}
              {fmt === "Hybrid" && <Globe size={16} />}
              {fmt} Event
            </button>
          ))}
        </div>

        {/* Location Inputs for Physical or Hybrid */}
        {(event.format === "Physical" || event.format === "Hybrid") && (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Venue Name
              </label>
              <input
                type="text"
                value={event.venueName}
                onChange={(e) => onChange({ venueName: e.target.value })}
                placeholder="e.g. Jio World Convention Centre"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Google Maps Link
              </label>
              <input
                type="text"
                value={event.googleMapsUrl || ""}
                onChange={(e) => onChange({ googleMapsUrl: e.target.value })}
                placeholder="https://maps.google.com/..."
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Street Address
              </label>
              <input
                type="text"
                value={event.address}
                onChange={(e) => onChange({ address: e.target.value })}
                placeholder="Plot 45, BKC Avenue, Bandra East"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                City
              </label>
              <input
                type="text"
                value={event.city}
                onChange={(e) => onChange({ city: e.target.value })}
                placeholder="Mumbai"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                State
              </label>
              <input
                type="text"
                value={event.state}
                onChange={(e) => onChange({ state: e.target.value })}
                placeholder="Maharashtra"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                PIN / ZIP Code
              </label>
              <input
                type="text"
                value={event.zipCode}
                onChange={(e) => onChange({ zipCode: e.target.value })}
                placeholder="400051"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>
        )}

        {/* Online / Streaming meeting URL */}
        {(event.format === "Online" || event.format === "Hybrid") && (
          <div className="mt-4 border-t border-gray-100 pt-4 dark:border-slate-800">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Meeting / Live Streaming URL
            </label>
            <input
              type="text"
              value={event.onlineMeetingUrl || ""}
              onChange={(e) => onChange({ onlineMeetingUrl: e.target.value })}
              placeholder="e.g. Zoom link, Google Meet, or YouTube Live stream URL"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              This URL will be included in the attendee's digital confirmation email.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
