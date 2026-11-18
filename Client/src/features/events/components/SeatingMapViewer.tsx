import { useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Armchair,
  Check,
  Ban,
  Lock,
} from "lucide-react";
import type { Seat, SeatingMapConfig, SeatingSection } from "../types/eventTypes";
import { formatInr } from "../utils/eventHelpers";

interface SeatingMapViewerProps {
  seatingMap: SeatingMapConfig;
  onSeatSelect?: (seat: Seat) => void;
  selectedSeatIds?: string[];
  editable?: boolean;
  onSeatStatusChange?: (sectionId: string, seatId: string, newStatus: Seat["status"]) => void;
}

export const SeatingMapViewer = ({
  seatingMap,
  onSeatSelect,
  selectedSeatIds = [],
  editable = false,
  onSeatStatusChange,
}: SeatingMapViewerProps) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [activeSectionId, setActiveSectionId] = useState<string>("all");
  const [inspectedSeat, setInspectedSeat] = useState<Seat | null>(null);

  const sections = seatingMap.sections || [];
  const displaySections =
    activeSectionId === "all"
      ? sections
      : sections.filter((s) => s.id === activeSectionId);

  const totalSeats = sections.reduce((acc, s) => acc + (s.seats?.length || 0), 0);
  const availableSeats = sections.reduce(
    (acc, s) => acc + (s.seats?.filter((seat) => seat.status === "Available").length || 0),
    0
  );
  const soldSeats = sections.reduce(
    (acc, s) => acc + (s.seats?.filter((seat) => seat.status === "Sold").length || 0),
    0
  );
  const reservedSeats = sections.reduce(
    (acc, s) => acc + (s.seats?.filter((seat) => seat.status === "Reserved").length || 0),
    0
  );

  const handleSeatClick = (section: SeatingSection, seat: Seat) => {
    setInspectedSeat(seat);
    if (onSeatSelect) {
      onSeatSelect(seat);
    }
  };

  const getSeatColorClass = (seat: Seat) => {
    const isSelected = selectedSeatIds.includes(seat.id);
    if (isSelected) {
      return "bg-orange-500 text-white ring-2 ring-orange-600 scale-110 z-10 shadow-md";
    }

    switch (seat.status) {
      case "Available":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 hover:scale-105";
      case "Reserved":
        return "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200";
      case "Sold":
        return "bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed opacity-60";
      case "Blocked":
        return "bg-red-100 text-red-700 border-red-300 cursor-not-allowed";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Top Toolbar: Legend & Zoom */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3 dark:border-slate-800">
        {/* Section Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSectionId("all")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              activeSectionId === "all"
                ? "bg-orange-600 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300"
            }`}
          >
            All Sections ({totalSeats})
          </button>
          {sections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSectionId(sec.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                activeSectionId === sec.id
                  ? "bg-orange-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300"
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full mr-1.5"
                style={{ backgroundColor: sec.color }}
              />
              {sec.name} ({formatInr(sec.price)})
            </button>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="min-w-10 text-center text-[11px] font-bold text-gray-500">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(1)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300"
            title="Reset Zoom"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Legend & Stats Banner */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-emerald-400 bg-emerald-100" />
            <span className="font-medium text-gray-600 dark:text-gray-300">
              Available ({availableSeats})
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-orange-500 bg-orange-500" />
            <span className="font-medium text-gray-600 dark:text-gray-300">Selected</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-amber-400 bg-amber-100" />
            <span className="font-medium text-gray-600 dark:text-gray-300">
              Reserved ({reservedSeats})
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-gray-400 bg-gray-200" />
            <span className="font-medium text-gray-400">Sold ({soldSeats})</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
          <span>Capacity:</span>
          <span className="rounded-md bg-orange-50 px-2 py-0.5 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
            {totalSeats > 0 ? Math.round(((soldSeats + reservedSeats) / totalSeats) * 100) : 0}% booked
          </span>
        </div>
      </div>

      {/* Stage Visual */}
      <div className="mt-6 flex flex-col items-center">
        <div className="w-3/4 max-w-lg rounded-b-3xl border-t-4 border-orange-600 bg-gradient-to-b from-orange-100/60 to-transparent py-2.5 text-center dark:from-orange-950/30">
          <span className="text-xs font-extrabold tracking-widest uppercase text-orange-700 dark:text-orange-300">
            ★ STAGE / MAIN SCREEN ★
          </span>
        </div>
      </div>

      {/* Seating Grid Viewport */}
      <div className="mt-6 overflow-x-auto overflow-y-auto pb-4 custom-scrollbar">
        <div
          className="mx-auto flex flex-col items-center gap-8 p-4 transition-transform duration-200 origin-top"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {displaySections.map((section) => {
            // Group seats by row
            const rowsMap: Record<string, Seat[]> = {};
            section.seats?.forEach((seat) => {
              if (!rowsMap[seat.row]) rowsMap[seat.row] = [];
              rowsMap[seat.row].push(seat);
            });

            const rowKeys = Object.keys(rowsMap).sort();

            return (
              <div
                key={section.id}
                className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 p-4 bg-gray-50/50 dark:border-slate-800 dark:bg-slate-800/20"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: section.color }}
                  />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                    {section.name} · {formatInr(section.price)}
                  </h4>
                </div>

                <div className="space-y-2">
                  {rowKeys.map((rowKey) => {
                    const rowSeats = rowsMap[rowKey].sort((a, b) => a.number - b.number);

                    return (
                      <div key={rowKey} className="flex items-center gap-2">
                        <span className="w-5 text-right font-mono text-xs font-bold text-gray-400">
                          {rowKey}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {rowSeats.map((seat) => (
                            <button
                              key={seat.id}
                              type="button"
                              onClick={() => handleSeatClick(section, seat)}
                              disabled={seat.status === "Sold" && !editable}
                              className={`flex h-6 w-6 items-center justify-center rounded-xs border text-[10px] font-bold transition ${getSeatColorClass(
                                seat
                              )}`}
                              title={`Seat ${seat.label} - ${formatInr(seat.price)} (${seat.status})`}
                            >
                              {seat.number}
                            </button>
                          ))}
                        </div>

                        <span className="w-5 text-left font-mono text-xs font-bold text-gray-400">
                          {rowKey}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inspected Seat Drawer / Banner */}
      {inspectedSeat && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50/80 p-3 text-xs dark:border-orange-950 dark:bg-orange-950/40">
          <div className="flex items-center gap-2">
            <Armchair className="text-orange-600" size={18} />
            <div>
              <p className="font-bold text-gray-900 dark:text-white">
                Seat {inspectedSeat.label} · {formatInr(inspectedSeat.price)}
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                Status: <span className="font-semibold text-gray-700 dark:text-gray-200">{inspectedSeat.status}</span>
              </p>
            </div>
          </div>

          {editable && onSeatStatusChange && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-gray-500">Change Status:</span>
              <button
                type="button"
                onClick={() =>
                  onSeatStatusChange(inspectedSeat.sectionId, inspectedSeat.id, "Available")
                }
                className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
              >
                Available
              </button>
              <button
                type="button"
                onClick={() =>
                  onSeatStatusChange(inspectedSeat.sectionId, inspectedSeat.id, "Reserved")
                }
                className="rounded-md bg-amber-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-700"
              >
                Reserved
              </button>
              <button
                type="button"
                onClick={() =>
                  onSeatStatusChange(inspectedSeat.sectionId, inspectedSeat.id, "Blocked")
                }
                className="rounded-md bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-700"
              >
                Blocked
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
