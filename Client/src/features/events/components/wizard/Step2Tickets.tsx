import { useState } from "react";
import {
  Ticket,
  Plus,
  Trash2,
  Clock,
  Armchair,
  Check,
  ChevronDown,
  Layers,
  Sparkles,
} from "lucide-react";
import type {
  EventItem,
  TicketType,
  TimeBasedPriceRule,
  SeatingSection,
  SeatingType,
  Seat,
} from "../../types/eventTypes";
import {
  formatInr,
  generateId,
  createDefaultSeatingSection,
} from "../../utils/eventHelpers";
import { SeatingMapViewer } from "../SeatingMapViewer";

interface Step2TicketsProps {
  event: EventItem;
  onChange: (updates: Partial<EventItem>) => void;
}

const TICKET_COLOR_PALETTES = [
  "#2563eb", // Blue
  "#9333ea", // Purple
  "#ea580c", // Orange
  "#16a34a", // Green
  "#0284c7", // Sky
  "#e11d48", // Rose
  "#ca8a04", // Yellow/Gold
  "#475569", // Slate
];

export const Step2Tickets = ({ event, onChange }: Step2TicketsProps) => {
  const [activeTicketId, setActiveTicketId] = useState<string>(
    event.tickets[0]?.id || ""
  );
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionPrice, setNewSectionPrice] = useState(1999);
  const [newSectionColor, setNewSectionColor] = useState("#9333ea");
  const [newSectionRows, setNewSectionRows] = useState(4);
  const [newSectionCols, setNewSectionCols] = useState(8);

  // Add a new ticket type
  const handleAddTicket = () => {
    const newTkt: TicketType = {
      id: generateId(),
      name: `Ticket Tier ${event.tickets.length + 1}`,
      description: "Access to conference sessions, exhibition booths, and lunch buffet.",
      color: TICKET_COLOR_PALETTES[event.tickets.length % TICKET_COLOR_PALETTES.length],
      price: 1499,
      isFree: false,
      totalQuantity: 200,
      soldQuantity: 0,
      minPurchaseQty: 1,
      maxPurchaseQty: 10,
      saleStartDate: new Date().toISOString().slice(0, 10),
      saleEndDate: event.endDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      perPersonLimit: 5,
      visibility: "Public",
      status: "Active",
      timeBasedPricingEnabled: false,
      timeBasedRules: [],
    };
    onChange({ tickets: [...event.tickets, newTkt] });
    setActiveTicketId(newTkt.id);
  };

  const handleUpdateTicket = (ticketId: string, updates: Partial<TicketType>) => {
    const updated = event.tickets.map((t) =>
      t.id === ticketId ? { ...t, ...updates } : t
    );
    onChange({ tickets: updated });
  };

  const handleRemoveTicket = (ticketId: string) => {
    if (event.tickets.length <= 1) return;
    const updated = event.tickets.filter((t) => t.id !== ticketId);
    onChange({ tickets: updated });
    if (activeTicketId === ticketId) {
      setActiveTicketId(updated[0]?.id || "");
    }
  };

  // Time based pricing rules
  const handleAddTimeRule = (ticketId: string) => {
    const target = event.tickets.find((t) => t.id === ticketId);
    if (!target) return;

    const newRule: TimeBasedPriceRule = {
      id: generateId(),
      label: `Session Slot ${(target.timeBasedRules?.length || 0) + 1}`,
      startTime: "09:00",
      endTime: "13:00",
      price: target.price > 200 ? target.price - 200 : target.price,
      availableQuantity: Math.round(target.totalQuantity / 2),
      priority: (target.timeBasedRules?.length || 0) + 1,
    };

    handleUpdateTicket(ticketId, {
      timeBasedPricingEnabled: true,
      timeBasedRules: [...(target.timeBasedRules || []), newRule],
    });
  };

  const handleRemoveTimeRule = (ticketId: string, ruleId: string) => {
    const target = event.tickets.find((t) => t.id === ticketId);
    if (!target) return;

    handleUpdateTicket(ticketId, {
      timeBasedRules: target.timeBasedRules?.filter((r) => r.id !== ruleId) || [],
    });
  };

  // Seating map actions
  const handleSeatingTypeChange = (type: SeatingType) => {
    onChange({
      seatingMap: {
        ...event.seatingMap,
        type,
      },
    });
  };

  const handleCreateSection = () => {
    if (!newSectionName.trim()) return;
    const newSection = createDefaultSeatingSection(
      newSectionName.trim(),
      newSectionColor,
      newSectionPrice,
      newSectionRows,
      newSectionCols
    );

    const updatedSections = [...(event.seatingMap.sections || []), newSection];
    const totalSeats = updatedSections.reduce((acc, s) => acc + s.seats.length, 0);

    onChange({
      seatingMap: {
        ...event.seatingMap,
        sections: updatedSections,
        totalSeats,
        availableSeats: updatedSections.reduce(
          (acc, s) => acc + s.seats.filter((seat) => seat.status === "Available").length,
          0
        ),
      },
    });

    setNewSectionName("");
    setShowAddSectionModal(false);
  };

  const handleRemoveSection = (sectionId: string) => {
    const updatedSections = event.seatingMap.sections.filter((s) => s.id !== sectionId);
    const totalSeats = updatedSections.reduce((acc, s) => acc + s.seats.length, 0);

    onChange({
      seatingMap: {
        ...event.seatingMap,
        sections: updatedSections,
        totalSeats,
      },
    });
  };

  const handleSeatStatusChange = (
    sectionId: string,
    seatId: string,
    newStatus: Seat["status"]
  ) => {
    const updatedSections = event.seatingMap.sections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        seats: sec.seats.map((seat) =>
          seat.id === seatId ? { ...seat, status: newStatus } : seat
        ),
      };
    });

    onChange({
      seatingMap: {
        ...event.seatingMap,
        sections: updatedSections,
      },
    });
  };

  const currentTicket =
    event.tickets.find((t) => t.id === activeTicketId) || event.tickets[0];

  return (
    <div className="space-y-8">
      {/* SECTION 1: TICKET TYPES */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              1. Ticket Categories & Pricing Tiers
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Create unlimited ticket categories with custom pricing, capacity, and sale validity.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddTicket}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-orange-700"
          >
            <Plus size={14} /> + Add Ticket Category
          </button>
        </div>

        {/* Ticket Selector Tabs */}
        <div className="mt-4 flex flex-wrap gap-2">
          {event.tickets.map((tkt) => {
            const isActive = tkt.id === activeTicketId;
            return (
              <button
                key={tkt.id}
                type="button"
                onClick={() => setActiveTicketId(tkt.id)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  isActive
                    ? "border-orange-500 bg-orange-50/80 text-orange-800 shadow-xs ring-2 ring-orange-500/20 dark:bg-orange-950/30 dark:text-orange-300"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-800 dark:text-gray-300"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: tkt.color }}
                />
                <span>{tkt.name}</span>
                <span className="font-mono text-[11px] opacity-80">
                  {tkt.isFree ? "Free" : formatInr(tkt.price)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Ticket Configuration Editor */}
        {currentTicket && (
          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/20">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span
                  className="h-3.5 w-3.5 rounded-full shadow-xs"
                  style={{ backgroundColor: currentTicket.color }}
                />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  Editing: {currentTicket.name}
                </h4>
              </div>

              {event.tickets.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveTicket(currentTicket.id)}
                  className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                >
                  <Trash2 size={13} /> Delete Tier
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Ticket Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Ticket Category Name
                </label>
                <input
                  type="text"
                  value={currentTicket.name}
                  onChange={(e) =>
                    handleUpdateTicket(currentTicket.id, { name: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              {/* Price & Free Toggle */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Ticket Price (₹)
                  </label>
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-orange-600">
                    <input
                      type="checkbox"
                      checked={currentTicket.isFree}
                      onChange={(e) =>
                        handleUpdateTicket(currentTicket.id, {
                          isFree: e.target.checked,
                          price: e.target.checked ? 0 : 499,
                        })
                      }
                    />
                    Free Ticket
                  </label>
                </div>
                <input
                  type="number"
                  disabled={currentTicket.isFree}
                  value={currentTicket.price}
                  onChange={(e) =>
                    handleUpdateTicket(currentTicket.id, {
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs disabled:bg-gray-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              {/* Color Tag Picker */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Badge Color
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={currentTicket.color}
                    onChange={(e) =>
                      handleUpdateTicket(currentTicket.id, { color: e.target.value })
                    }
                    className="h-8 w-10 cursor-pointer rounded border border-gray-200 p-0.5"
                  />
                  <div className="flex gap-1">
                    {TICKET_COLOR_PALETTES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleUpdateTicket(currentTicket.id, { color: c })}
                        className="h-6 w-6 rounded-full border border-gray-300"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Total Ticket Capacity
                </label>
                <input
                  type="number"
                  value={currentTicket.totalQuantity}
                  onChange={(e) =>
                    handleUpdateTicket(currentTicket.id, {
                      totalQuantity: parseInt(e.target.value) || 0,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              {/* Min and Max Purchase Limits */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Min & Max Per Order
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={currentTicket.minPurchaseQty}
                    onChange={(e) =>
                      handleUpdateTicket(currentTicket.id, {
                        minPurchaseQty: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    placeholder="Min"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="number"
                    value={currentTicket.maxPurchaseQty}
                    onChange={(e) =>
                      handleUpdateTicket(currentTicket.id, {
                        maxPurchaseQty: parseInt(e.target.value) || 10,
                      })
                    }
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    placeholder="Max"
                  />
                </div>
              </div>

              {/* Ticket Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Ticket Status
                </label>
                <select
                  value={currentTicket.status}
                  onChange={(e) =>
                    handleUpdateTicket(currentTicket.id, {
                      status: e.target.value as TicketType["status"],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="Active">Active (On Sale)</option>
                  <option value="Paused">Paused (Temporarily Hidden)</option>
                  <option value="SoldOut">Sold Out</option>
                </select>
              </div>

              {/* Description */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Ticket Perks & Description
                </label>
                <input
                  type="text"
                  value={currentTicket.description}
                  onChange={(e) =>
                    handleUpdateTicket(currentTicket.id, { description: e.target.value })
                  }
                  placeholder="e.g. Access to front-row seats, VIP lounge with drinks, and keynote swag bag"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>

            {/* TIME-BASED PRICING SUBSECTION */}
            <div className="mt-5 border-t border-gray-200 pt-4 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Clock size={14} className="text-orange-600" />
                    Time-Based & Session Pricing Rules
                  </h5>
                  <p className="text-[11px] text-gray-500">
                    Different prices for Morning (e.g. ₹499), Afternoon (₹699), or Evening sessions.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddTimeRule(currentTicket.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700 hover:bg-orange-200 dark:bg-orange-950/60 dark:text-orange-300"
                >
                  <Plus size={12} /> Add Session Price Rule
                </button>
              </div>

              {currentTicket.timeBasedRules && currentTicket.timeBasedRules.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {currentTicket.timeBasedRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-2.5 text-xs shadow-2xs dark:bg-slate-800"
                    >
                      <input
                        type="text"
                        value={rule.label}
                        onChange={(e) => {
                          const updated = currentTicket.timeBasedRules?.map((r) =>
                            r.id === rule.id ? { ...r, label: e.target.value } : r
                          );
                          handleUpdateTicket(currentTicket.id, { timeBasedRules: updated });
                        }}
                        placeholder="e.g. Morning Keynote Slot"
                        className="flex-1 min-w-32 rounded border border-gray-200 px-2 py-1 text-xs dark:border-slate-700"
                      />

                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-400">Time:</span>
                        <input
                          type="time"
                          value={rule.startTime || "09:00"}
                          onChange={(e) => {
                            const updated = currentTicket.timeBasedRules?.map((r) =>
                              r.id === rule.id ? { ...r, startTime: e.target.value } : r
                            );
                            handleUpdateTicket(currentTicket.id, { timeBasedRules: updated });
                          }}
                          className="rounded border border-gray-200 px-1.5 py-1 text-xs dark:border-slate-700"
                        />
                        <span className="text-[11px] text-gray-400">-</span>
                        <input
                          type="time"
                          value={rule.endTime || "13:00"}
                          onChange={(e) => {
                            const updated = currentTicket.timeBasedRules?.map((r) =>
                              r.id === rule.id ? { ...r, endTime: e.target.value } : r
                            );
                            handleUpdateTicket(currentTicket.id, { timeBasedRules: updated });
                          }}
                          className="rounded border border-gray-200 px-1.5 py-1 text-xs dark:border-slate-700"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-400">Price ₹:</span>
                        <input
                          type="number"
                          value={rule.price}
                          onChange={(e) => {
                            const updated = currentTicket.timeBasedRules?.map((r) =>
                              r.id === rule.id
                                ? { ...r, price: parseFloat(e.target.value) || 0 }
                                : r
                            );
                            handleUpdateTicket(currentTicket.id, { timeBasedRules: updated });
                          }}
                          className="w-20 rounded border border-gray-200 px-2 py-1 text-xs dark:border-slate-700 font-bold"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-400">Seats:</span>
                        <input
                          type="number"
                          value={rule.availableQuantity}
                          onChange={(e) => {
                            const updated = currentTicket.timeBasedRules?.map((r) =>
                              r.id === rule.id
                                ? { ...r, availableQuantity: parseInt(e.target.value) || 0 }
                                : r
                            );
                            handleUpdateTicket(currentTicket.id, { timeBasedRules: updated });
                          }}
                          className="w-16 rounded border border-gray-200 px-2 py-1 text-xs dark:border-slate-700"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveTimeRule(currentTicket.id, rule.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs italic text-gray-400">
                  Flat pricing active across all sessions. Click "Add Session Price Rule" to set different prices for morning, afternoon, or evening.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: SEATING MAP */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              2. Seating Map & Venue Layout
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Choose General Admission (open seating) or create an interactive visual Reserved Seating Map.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-slate-800 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => handleSeatingTypeChange("GeneralAdmission")}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                event.seatingMap.type === "GeneralAdmission"
                  ? "bg-white text-orange-600 shadow-xs dark:bg-slate-700 dark:text-orange-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              General Admission
            </button>
            <button
              type="button"
              onClick={() => handleSeatingTypeChange("ReservedSeating")}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                event.seatingMap.type === "ReservedSeating"
                  ? "bg-white text-orange-600 shadow-xs dark:bg-slate-700 dark:text-orange-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Reserved Seating
            </button>
          </div>
        </div>

        {event.seatingMap.type === "GeneralAdmission" ? (
          <div className="mt-5 rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs text-gray-500 dark:border-slate-800">
            <Armchair size={32} className="mx-auto text-gray-400 mb-2" />
            <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">
              General Admission Enabled
            </h4>
            <p className="mt-1 max-w-md mx-auto">
              Attendees enter on a first-come, first-served basis without assigned seats.
              Total capacity will be governed by your ticket inventory.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {/* Sections manager buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Seating Sections ({event.seatingMap.sections?.length || 0})
              </span>

              <button
                type="button"
                onClick={() => setShowAddSectionModal(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-orange-700"
              >
                <Plus size={13} /> + Create New Section
              </button>
            </div>

            {/* Modal / Panel for creating section */}
            {showAddSectionModal && (
              <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <h5 className="text-xs font-bold text-orange-800 dark:text-orange-300 mb-2">
                  Configure New Seating Section
                </h5>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-5 text-xs">
                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Section Name
                    </label>
                    <input
                      type="text"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      placeholder="e.g. Balcony Left"
                      className="mt-1 w-full rounded border border-gray-200 p-1.5 dark:bg-slate-700"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Seat Price (₹)
                    </label>
                    <input
                      type="number"
                      value={newSectionPrice}
                      onChange={(e) => setNewSectionPrice(parseFloat(e.target.value) || 0)}
                      className="mt-1 w-full rounded border border-gray-200 p-1.5 dark:bg-slate-700"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Rows (Letters)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={newSectionRows}
                      onChange={(e) => setNewSectionRows(parseInt(e.target.value) || 4)}
                      className="mt-1 w-full rounded border border-gray-200 p-1.5 dark:bg-slate-700"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Seats Per Row
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={newSectionCols}
                      onChange={(e) => setNewSectionCols(parseInt(e.target.value) || 8)}
                      className="mt-1 w-full rounded border border-gray-200 p-1.5 dark:bg-slate-700"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={handleCreateSection}
                      className="w-full rounded bg-orange-600 py-2 font-bold text-white hover:bg-orange-700"
                    >
                      Generate Seats
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddSectionModal(false)}
                      className="rounded bg-gray-200 px-3 py-2 font-semibold text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Visual Seating Map Viewer */}
            <SeatingMapViewer
              seatingMap={event.seatingMap}
              editable
              onSeatStatusChange={handleSeatStatusChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};
