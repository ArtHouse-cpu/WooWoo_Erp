import { QrCode, Barcode, Palette, Image as ImageIcon, Eye } from "lucide-react";
import type { EventItem, TicketDesignSettings, EventAttendee } from "../../types/eventTypes";
import { DigitalTicketCard } from "../DigitalTicketCard";

interface Step5TicketDesignProps {
  event: EventItem;
  onChange: (updates: Partial<EventItem>) => void;
}

export const Step5TicketDesign = ({ event, onChange }: Step5TicketDesignProps) => {
  const design = event.ticketDesign;

  const handleUpdate = (updates: Partial<TicketDesignSettings>) => {
    onChange({
      ticketDesign: {
        ...design,
        ...updates,
      },
    });
  };

  const sampleAttendee: EventAttendee = {
    id: "att_preview",
    orderId: "ord_preview",
    eventId: event.id,
    eventName: event.name || "Global Innovation Expo 2026",
    eventDate: event.startDate || "15 Dec 2026",
    sessionName: "Main Keynote",
    name: "Vikram Malhotra",
    email: "vikram.m@example.com",
    phone: "+91 98201 12345",
    ticketTypeId: event.tickets[0]?.id || "tkt_sample",
    ticketTypeName: event.tickets[0]?.name || "VIP All-Access",
    ticketColor: design.themeColor || "#ea580c",
    seatNumber: design.showSeatNumber ? "A-01" : undefined,
    passCode: "PASS-9824",
    qrCodeValue: `PASS-9824|Vikram Malhotra|${event.name}|A-01`,
    barcodeValue: "890123982401",
    registrationDate: new Date().toISOString(),
    checkInStatus: "NotCheckedIn",
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Configuration Controls (7 cols) */}
      <div className="space-y-6 lg:col-span-7">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
            Digital Entry Pass & Badge Settings
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Configure scannable QR codes, barcodes, pass numbering, and branding elements.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Ticket ID Prefix */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Ticket Serial Prefix
              </label>
              <input
                type="text"
                value={design.ticketPrefix}
                onChange={(e) => handleUpdate({ ticketPrefix: e.target.value })}
                placeholder="e.g. TKT-2026"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            {/* Theme Accent Color */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Ticket Accent Theme Color
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={design.themeColor}
                  onChange={(e) => handleUpdate({ themeColor: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border border-gray-200 p-0.5"
                />
                <input
                  type="text"
                  value={design.themeColor}
                  onChange={(e) => handleUpdate({ themeColor: e.target.value })}
                  className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-mono dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Scanners toggles */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-orange-600" />
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  Generate QR Code
                </span>
              </div>
              <input
                type="checkbox"
                checked={design.enableQrCode}
                onChange={(e) => handleUpdate({ enableQrCode: e.target.checked })}
                className="rounded text-orange-600"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Barcode size={18} className="text-orange-600" />
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  Generate Barcode
                </span>
              </div>
              <input
                type="checkbox"
                checked={design.enableBarcode}
                onChange={(e) => handleUpdate({ enableBarcode: e.target.checked })}
                className="rounded text-orange-600"
              />
            </div>
          </div>

          {/* Visibility Toggles on Ticket */}
          <div className="mt-5 border-t border-gray-100 pt-4 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 mb-3">
              Badge Display Fields
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={design.showVenue}
                  onChange={(e) => handleUpdate({ showVenue: e.target.checked })}
                />
                <span>Show Venue Address</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={design.showSeatNumber}
                  onChange={(e) => handleUpdate({ showSeatNumber: e.target.checked })}
                />
                <span>Show Assigned Seat</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={design.showEventDate}
                  onChange={(e) => handleUpdate({ showEventDate: e.target.checked })}
                />
                <span>Show Date & Time</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={design.showPassCode}
                  onChange={(e) => handleUpdate({ showPassCode: e.target.checked })}
                />
                <span>Show Alphanumeric Pass Code</span>
              </label>
            </div>
          </div>

          {/* Terms & Conditions printed on ticket */}
          <div className="mt-5 border-t border-gray-100 pt-4 dark:border-slate-800">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Terms & Conditions on Entry Pass
            </label>
            <textarea
              rows={3}
              value={design.termsText}
              onChange={(e) => handleUpdate({ termsText: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Live Ticket Pass Preview (5 cols) */}
      <div className="lg:col-span-5">
        <div className="sticky top-4 rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-slate-800">
            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-800 dark:text-gray-200">
              <Eye size={15} className="text-orange-600" /> Digital Ticket Preview
            </span>
            <span className="text-[10px] text-emerald-600 font-bold">
              Scannable QR
            </span>
          </div>

          <div className="mt-4 flex justify-center">
            <DigitalTicketCard
              attendee={sampleAttendee}
              venueName={event.venueName}
              venueAddress={`${event.address}, ${event.city}`}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  );
};
