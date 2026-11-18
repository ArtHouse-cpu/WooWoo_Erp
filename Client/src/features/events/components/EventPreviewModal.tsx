import { useState } from "react";
import {
  X,
  Monitor,
  Smartphone,
  Calendar,
  Clock,
  MapPin,
  Share2,
  Ticket,
  CheckCircle2,
  ExternalLink,
  Users,
  Shield,
  Layers,
  FileText,
  QrCode,
} from "lucide-react";
import type { EventItem, EventAttendee } from "../types/eventTypes";
import { formatInr } from "../utils/eventHelpers";
import { SeatingMapViewer } from "./SeatingMapViewer";
import { DigitalTicketCard } from "./DigitalTicketCard";

interface EventPreviewModalProps {
  event: EventItem;
  isOpen: boolean;
  onClose: () => void;
  defaultView?: "public" | "seating" | "checkout" | "ticket";
}

type PreviewTab = "public" | "seating" | "checkout" | "ticket";

export const EventPreviewModal = ({
  event,
  isOpen,
  onClose,
  defaultView = "public",
}: EventPreviewModalProps) => {
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [activeTab, setActiveTab] = useState<PreviewTab>(defaultView);
  const [selectedTicketId, setSelectedTicketId] = useState<string>(
    event.tickets[0]?.id || ""
  );

  if (!isOpen) return null;

  // Mock demo attendee for ticket preview
  const demoAttendee: EventAttendee = {
    id: "att_demo",
    orderId: "ord_demo",
    eventId: event.id,
    eventName: event.name || "Untitled Event",
    eventDate: event.startDate || "Date TBA",
    sessionName: event.multipleDates?.[0]?.sessions?.[0]?.title || "Full Access",
    name: "Alex Morgan",
    email: "alex.morgan@example.com",
    phone: "+91 98200 00000",
    ticketTypeId: event.tickets[0]?.id || "tkt_1",
    ticketTypeName: event.tickets[0]?.name || "General Pass",
    ticketColor: event.tickets[0]?.color || "#ea580c",
    seatNumber: "A-12",
    passCode: "EVT-LIVE-2026",
    qrCodeValue: `EVT-LIVE-2026|Alex Morgan|${event.name}|A-12`,
    barcodeValue: "890123982199",
    registrationDate: new Date().toISOString(),
    checkInStatus: "NotCheckedIn",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-2 backdrop-blur-xs sm:p-4">
      <div className="flex h-[95dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-[#F7F8FA] shadow-2xl dark:bg-[#0f1318]">
        {/* Header Toolbar */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
              <Ticket size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white sm:text-base">
                  Live Preview: {event.name || "Untitled Event"}
                </h3>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Real-time
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Preview how your attendees experience this event
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Tabs */}
            <div className="hidden rounded-lg border border-gray-200 bg-gray-100 p-0.5 md:flex dark:border-slate-800 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab("public")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  activeTab === "public"
                    ? "bg-white text-orange-600 shadow-xs dark:bg-slate-700 dark:text-orange-400"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300"
                }`}
              >
                Public Page
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("seating")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  activeTab === "seating"
                    ? "bg-white text-orange-600 shadow-xs dark:bg-slate-700 dark:text-orange-400"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300"
                }`}
              >
                Seating Map
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("checkout")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  activeTab === "checkout"
                    ? "bg-white text-orange-600 shadow-xs dark:bg-slate-700 dark:text-orange-400"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300"
                }`}
              >
                Checkout Form
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ticket")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  activeTab === "ticket"
                    ? "bg-white text-orange-600 shadow-xs dark:bg-slate-700 dark:text-orange-400"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300"
                }`}
              >
                Digital Ticket
              </button>
            </div>

            {/* Desktop / Mobile Switcher */}
            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-slate-800 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setDeviceMode("desktop")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  deviceMode === "desktop"
                    ? "bg-white text-gray-900 shadow-xs dark:bg-slate-700 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
                title="Desktop View"
              >
                <Monitor size={14} />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode("mobile")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  deviceMode === "mobile"
                    ? "bg-white text-gray-900 shadow-xs dark:bg-slate-700 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
                title="Mobile View"
              >
                <Smartphone size={14} />
                <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-slate-800 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Mobile secondary tab strip for smaller screens */}
        <div className="flex border-b border-gray-200 bg-white px-2 py-1.5 md:hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="grid w-full grid-cols-4 gap-1 text-center text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("public")}
              className={`rounded-md py-1.5 ${
                activeTab === "public"
                  ? "bg-orange-50 text-orange-600"
                  : "text-gray-600"
              }`}
            >
              Public
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("seating")}
              className={`rounded-md py-1.5 ${
                activeTab === "seating"
                  ? "bg-orange-50 text-orange-600"
                  : "text-gray-600"
              }`}
            >
              Seats
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("checkout")}
              className={`rounded-md py-1.5 ${
                activeTab === "checkout"
                  ? "bg-orange-50 text-orange-600"
                  : "text-gray-600"
              }`}
            >
              Checkout
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ticket")}
              className={`rounded-md py-1.5 ${
                activeTab === "ticket"
                  ? "bg-orange-50 text-orange-600"
                  : "text-gray-600"
              }`}
            >
              Pass
            </button>
          </div>
        </div>

        {/* Viewport Container */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div
            className={`mx-auto transition-all duration-300 ${
              deviceMode === "mobile"
                ? "w-full max-w-[390px] rounded-[36px] border-[10px] border-gray-800 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 overflow-hidden"
                : "w-full max-w-5xl"
            }`}
          >
            {/* Mobile Notch simulation */}
            {deviceMode === "mobile" && (
              <div className="flex justify-center bg-gray-800 py-1 dark:bg-slate-700">
                <div className="h-4 w-28 rounded-full bg-black/60" />
              </div>
            )}

            {/* TAB 1: PUBLIC EVENT PAGE */}
            {activeTab === "public" && (
              <div className="min-h-[500px] bg-white text-gray-900 dark:bg-slate-900 dark:text-white">
                {/* Hero Cover */}
                <div className="relative h-48 w-full sm:h-72 lg:h-80 overflow-hidden bg-gray-900">
                  <img
                    src={
                      event.coverImage ||
                      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80"
                    }
                    alt={event.name}
                    className="h-full w-full object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
                    <span className="inline-block rounded-full bg-orange-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-xs">
                      {event.category || "Event"}
                    </span>
                    <h1 className="mt-2 text-xl font-extrabold text-white sm:text-3xl lg:text-4xl">
                      {event.name || "Event Title"}
                    </h1>
                    <p className="mt-1 text-xs text-gray-200 line-clamp-2 sm:text-sm">
                      {event.shortTeaser || "Experience the most anticipated event of the year."}
                    </p>
                  </div>
                </div>

                {/* Main Content & Registration Layout */}
                <div className="p-4 sm:p-6 lg:p-8">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left: About, Schedule, Venue, Policies */}
                    <div className="space-y-6 lg:col-span-2">
                      {/* Meta badges */}
                      <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 pb-4 text-xs dark:border-slate-800">
                        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-gray-700 dark:bg-slate-800 dark:text-gray-300">
                          <Calendar size={16} className="text-orange-600" />
                          <span>
                            {event.startDate} {event.isMultipleDates ? `to ${event.endDate}` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-gray-700 dark:bg-slate-800 dark:text-gray-300">
                          <Clock size={16} className="text-orange-600" />
                          <span>
                            {event.startTime} - {event.endTime} ({event.timeZone || "IST"})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-gray-700 dark:bg-slate-800 dark:text-gray-300">
                          <MapPin size={16} className="text-orange-600" />
                          <span>{event.venueName || "Venue TBA"}</span>
                        </div>
                      </div>

                      {/* About Description */}
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white sm:text-lg">
                          About the Event
                        </h3>
                        <div
                          className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300"
                          dangerouslySetInnerHTML={{
                            __html:
                              event.aboutRichText ||
                              "<p>Detailed event schedule and keynote lineup will be updated here shortly.</p>",
                          }}
                        />
                      </div>

                      {/* Agenda Sessions */}
                      {event.multipleDates?.[0]?.sessions?.length ? (
                        <div>
                          <h3 className="text-base font-bold text-gray-900 dark:text-white sm:text-lg">
                            Event Schedule & Sessions
                          </h3>
                          <div className="mt-3 space-y-2.5">
                            {event.multipleDates[0].sessions.map((sess) => (
                              <div
                                key={sess.id}
                                className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-gray-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40"
                              >
                                <div className="flex items-center justify-between font-bold text-gray-900 dark:text-white">
                                  <span>{sess.title}</span>
                                  <span className="font-mono text-orange-600">
                                    {sess.startTime} - {sess.endTime}
                                  </span>
                                </div>
                                {sess.speakerName && (
                                  <p className="text-gray-500">
                                    Speaker: <strong className="text-gray-700 dark:text-gray-300">{sess.speakerName}</strong> ({sess.speakerRole})
                                  </p>
                                )}
                                {sess.location && (
                                  <p className="text-[11px] text-gray-400">
                                    Room: {sess.location}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* Location & Map Card */}
                      <div className="rounded-xl border border-gray-200 p-4 dark:border-slate-800">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          Location & Venue
                        </h4>
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          {event.venueName}, {event.address}, {event.city}, {event.state} -{" "}
                          {event.zipCode}
                        </p>
                        {event.onlineMeetingUrl && (
                          <div className="mt-2 text-xs">
                            <span className="font-semibold text-blue-600">
                              Online Streaming:
                            </span>{" "}
                            <a
                              href={event.onlineMeetingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-orange-600 underline"
                            >
                              {event.onlineMeetingUrl}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Policies */}
                      <div className="rounded-xl bg-gray-50 p-4 text-xs text-gray-600 dark:bg-slate-800/40 dark:text-gray-400">
                        <h4 className="font-bold text-gray-900 dark:text-white">
                          Entry Rules & Policies
                        </h4>
                        <p className="mt-1">{event.policies?.refundPolicy}</p>
                        <p className="mt-1">{event.policies?.entryRules}</p>
                      </div>
                    </div>

                    {/* Right: Registration & Ticket Selector */}
                    <div className="lg:col-span-1">
                      <div className="sticky top-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:p-5">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-slate-800">
                          <h4 className="font-bold text-gray-900 dark:text-white">
                            Select Tickets
                          </h4>
                          <span className="text-xs text-emerald-600 font-semibold">
                            ● Registration Open
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          {event.tickets.map((tkt) => {
                            const isSelected = selectedTicketId === tkt.id;
                            return (
                              <div
                                key={tkt.id}
                                onClick={() => setSelectedTicketId(tkt.id)}
                                className={`cursor-pointer rounded-xl border p-3 transition ${
                                  isSelected
                                    ? "border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/20 dark:bg-orange-950/20"
                                    : "border-gray-200 hover:border-gray-300 dark:border-slate-800"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                                    {tkt.name}
                                  </span>
                                  <span className="font-bold text-orange-600 dark:text-orange-400">
                                    {tkt.isFree || tkt.price === 0
                                      ? "FREE"
                                      : formatInr(tkt.price)}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11px] text-gray-500 line-clamp-2">
                                  {tkt.description}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveTab("checkout")}
                          className="mt-5 w-full rounded-xl bg-orange-600 py-3 text-xs font-bold text-white shadow-md transition hover:bg-orange-700"
                        >
                          Book Now · Proceed to Register
                        </button>

                        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-gray-400">
                          <Shield size={13} /> Secure checkout powered by WooWoo ERP
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SEATING MAP */}
            {activeTab === "seating" && (
              <div className="p-4 sm:p-6">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Interactive Seating Plan
                  </h3>
                  <p className="text-xs text-gray-500">
                    Attendees click on their desired section and seat number during registration.
                  </p>
                </div>
                <SeatingMapViewer seatingMap={event.seatingMap} />
              </div>
            )}

            {/* TAB 3: CHECKOUT FORM PREVIEW */}
            {activeTab === "checkout" && (
              <div className="p-4 sm:p-6">
                <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Attendee Registration Form
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Live preview of form fields configured in Step 3.
                  </p>

                  <div className="mt-5 space-y-3.5">
                    {event.checkoutFields
                      ?.filter((f) => f.enabled)
                      ?.sort((a, b) => a.order - b.order)
                      ?.map((field) => (
                        <div key={field.id} className="text-xs">
                          <label className="block font-semibold text-gray-700 dark:text-gray-300">
                            {field.label}{" "}
                            {field.required && <span className="text-red-500">*</span>}
                          </label>
                          {field.description && (
                            <p className="text-[11px] text-gray-400 mb-1">
                              {field.description}
                            </p>
                          )}

                          {field.type === "dropdown" ? (
                            <select className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                              <option value="">{field.placeholder || "Select option"}</option>
                              {field.options?.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : field.type === "radio" ? (
                            <div className="mt-1.5 flex flex-wrap gap-3">
                              {field.options?.map((opt) => (
                                <label key={opt} className="flex items-center gap-1.5 text-xs">
                                  <input type="radio" name={field.name} />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          ) : field.type === "checkbox" ? (
                            <label className="mt-1.5 flex items-center gap-2">
                              <input type="checkbox" />
                              <span>{field.placeholder || "I agree"}</span>
                            </label>
                          ) : (
                            <input
                              type={field.type === "number" ? "number" : "text"}
                              placeholder={field.placeholder}
                              className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                            />
                          )}
                        </div>
                      ))}
                  </div>

                  {/* Pricing Breakdown Demo */}
                  <div className="mt-5 border-t border-gray-100 pt-4 text-xs dark:border-slate-800">
                    <div className="flex justify-between py-1 text-gray-500">
                      <span>Ticket Price (1x {event.tickets[0]?.name || "General"})</span>
                      <span>{formatInr(event.tickets[0]?.price || 0)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-gray-500">
                      <span>GST (18%)</span>
                      <span>{formatInr((event.tickets[0]?.price || 0) * 0.18)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-gray-500">
                      <span>Convenience Fee</span>
                      <span>₹50</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-100 pt-2 font-bold text-gray-900 dark:border-slate-800 dark:text-white">
                      <span>Total Payable</span>
                      <span className="text-orange-600">
                        {formatInr((event.tickets[0]?.price || 0) * 1.18 + 50)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-5 w-full rounded-xl bg-orange-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-orange-700"
                  >
                    Complete Registration
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: DIGITAL TICKET PREVIEW */}
            {activeTab === "ticket" && (
              <div className="p-4 sm:p-6 flex justify-center">
                <DigitalTicketCard
                  attendee={demoAttendee}
                  venueName={event.venueName}
                  venueAddress={`${event.address}, ${event.city}`}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
