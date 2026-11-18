import { useState } from "react";
import {
  CalendarDays,
  Share2,
  Percent,
  Plus,
  Trash2,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Globe,
  Sparkles,
} from "lucide-react";
import type { EventItem, EventSession, EventCoupon, SocialLinks } from "../../types/eventTypes";
import { generateId } from "../../utils/eventHelpers";

interface Step9FeaturesProps {
  event: EventItem;
  onChange: (updates: Partial<EventItem>) => void;
}

export const Step9Features = ({ event, onChange }: Step9FeaturesProps) => {
  const [activeSubTab, setActiveSubTab] = useState<"schedule" | "social" | "discounts">(
    "schedule"
  );

  // New coupon modal / inline form
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponType, setCouponType] = useState<"percentage" | "fixed">("percentage");
  const [couponValue, setCouponValue] = useState(15);
  const [couponUsageLimit, setCouponUsageLimit] = useState(100);
  const [couponMinOrder, setCouponMinOrder] = useState(500);

  const social = event.socialLinks || {};
  const coupons = event.coupons || [];

  const handleUpdateSocial = (updates: Partial<SocialLinks>) => {
    onChange({
      socialLinks: {
        ...social,
        ...updates,
      },
    });
  };

  const handleCreateCoupon = () => {
    if (!couponCode.trim()) return;

    const newCoupon: EventCoupon = {
      id: generateId(),
      code: couponCode.trim().toUpperCase(),
      discountType: couponType,
      discountValue: couponValue,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: event.endDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      usageLimit: couponUsageLimit,
      usedCount: 0,
      perCustomerLimit: 1,
      applicableTicketTypes: ["all"],
      minOrderValue: couponMinOrder,
      status: "Active",
      eventId: event.id,
    };

    onChange({ coupons: [...coupons, newCoupon] });
    setCouponCode("");
    setShowAddCoupon(false);
  };

  const handleRemoveCoupon = (couponId: string) => {
    onChange({ coupons: coupons.filter((c) => c.id !== couponId) });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Interactive Event Features
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Configure speaker agenda, social channels, and promo discount codes.
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-slate-800 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setActiveSubTab("schedule")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
                activeSubTab === "schedule"
                  ? "bg-white text-orange-600 shadow-xs dark:bg-slate-700 dark:text-orange-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <CalendarDays size={13} />
              Schedule Agenda
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("social")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
                activeSubTab === "social"
                  ? "bg-white text-orange-600 shadow-xs dark:bg-slate-700 dark:text-orange-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <Share2 size={13} />
              Social Links
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("discounts")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
                activeSubTab === "discounts"
                  ? "bg-white text-orange-600 shadow-xs dark:bg-slate-700 dark:text-orange-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <Percent size={13} />
              Event Discounts ({coupons.length})
            </button>
          </div>
        </div>

        {/* SUBTAB 1: SCHEDULE AGENDAS */}
        {activeSubTab === "schedule" && (
          <div className="mt-5 space-y-4">
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Add speakers, session tracks, and keynote breakdowns that will be highlighted on the event landing page.
            </p>

            {/* If event has multipleDates or single date sessions */}
            {event.multipleDates && event.multipleDates.length > 0 ? (
              <div className="space-y-4">
                {event.multipleDates.map((dateSchedule, dateIdx) => (
                  <div
                    key={dateSchedule.id}
                    className="rounded-xl border border-gray-200 p-4 dark:border-slate-800"
                  >
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-2">
                      Day {dateIdx + 1} ({dateSchedule.date}) – {dateSchedule.sessions.length} Sessions
                    </h4>

                    <div className="space-y-3">
                      {dateSchedule.sessions.map((sess) => (
                        <div
                          key={sess.id}
                          className="grid grid-cols-1 gap-2 rounded-lg bg-gray-50 p-3 sm:grid-cols-4 text-xs dark:bg-slate-800"
                        >
                          <div>
                            <label className="font-semibold text-gray-600 dark:text-gray-400 text-[11px]">
                              Session Title
                            </label>
                            <input
                              type="text"
                              value={sess.title}
                              onChange={(e) => {
                                const updatedDates = event.multipleDates.map((d) =>
                                  d.id === dateSchedule.id
                                    ? {
                                        ...d,
                                        sessions: d.sessions.map((s) =>
                                          s.id === sess.id ? { ...s, title: e.target.value } : s
                                        ),
                                      }
                                    : d
                                );
                                onChange({ multipleDates: updatedDates });
                              }}
                              className="mt-0.5 w-full rounded border border-gray-200 p-1.5 dark:bg-slate-700"
                            />
                          </div>

                          <div>
                            <label className="font-semibold text-gray-600 dark:text-gray-400 text-[11px]">
                              Speaker Name
                            </label>
                            <input
                              type="text"
                              value={sess.speakerName || ""}
                              onChange={(e) => {
                                const updatedDates = event.multipleDates.map((d) =>
                                  d.id === dateSchedule.id
                                    ? {
                                        ...d,
                                        sessions: d.sessions.map((s) =>
                                          s.id === sess.id ? { ...s, speakerName: e.target.value } : s
                                        ),
                                      }
                                    : d
                                );
                                onChange({ multipleDates: updatedDates });
                              }}
                              placeholder="e.g. Dr. Priya Rao"
                              className="mt-0.5 w-full rounded border border-gray-200 p-1.5 dark:bg-slate-700"
                            />
                          </div>

                          <div>
                            <label className="font-semibold text-gray-600 dark:text-gray-400 text-[11px]">
                              Speaker Title / Org
                            </label>
                            <input
                              type="text"
                              value={sess.speakerRole || ""}
                              onChange={(e) => {
                                const updatedDates = event.multipleDates.map((d) =>
                                  d.id === dateSchedule.id
                                    ? {
                                        ...d,
                                        sessions: d.sessions.map((s) =>
                                          s.id === sess.id ? { ...s, speakerRole: e.target.value } : s
                                        ),
                                      }
                                    : d
                                );
                                onChange({ multipleDates: updatedDates });
                              }}
                              placeholder="e.g. VP AI, TechGrid"
                              className="mt-0.5 w-full rounded border border-gray-200 p-1.5 dark:bg-slate-700"
                            />
                          </div>

                          <div>
                            <label className="font-semibold text-gray-600 dark:text-gray-400 text-[11px]">
                              Room / Location
                            </label>
                            <input
                              type="text"
                              value={sess.location || ""}
                              onChange={(e) => {
                                const updatedDates = event.multipleDates.map((d) =>
                                  d.id === dateSchedule.id
                                    ? {
                                        ...d,
                                        sessions: d.sessions.map((s) =>
                                          s.id === sess.id ? { ...s, location: e.target.value } : s
                                        ),
                                      }
                                    : d
                                );
                                onChange({ multipleDates: updatedDates });
                              }}
                              placeholder="e.g. Hall B"
                              className="mt-0.5 w-full rounded border border-gray-200 p-1.5 dark:bg-slate-700"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs text-gray-500 dark:border-slate-800">
                <p>
                  To configure session agendas and keynote speakers, select "Multiple Dates & Sessions" in Step 1 or add your event tracks here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 2: SOCIAL MEDIA LINKS */}
        {activeSubTab === "social" && (
          <div className="mt-5 space-y-4 text-xs">
            <p className="text-gray-600 dark:text-gray-300">
              These links are featured prominently on the public event page and attendee invitation cards.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Instagram size={18} className="text-pink-600 shrink-0" />
                <input
                  type="text"
                  value={social.instagram || ""}
                  onChange={(e) => handleUpdateSocial({ instagram: e.target.value })}
                  placeholder="https://instagram.com/your_event"
                  className="w-full rounded-lg border border-gray-200 p-2 text-xs dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center gap-2">
                <Linkedin size={18} className="text-blue-600 shrink-0" />
                <input
                  type="text"
                  value={social.linkedin || ""}
                  onChange={(e) => handleUpdateSocial({ linkedin: e.target.value })}
                  placeholder="https://linkedin.com/company/your_event"
                  className="w-full rounded-lg border border-gray-200 p-2 text-xs dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center gap-2">
                <Facebook size={18} className="text-blue-700 shrink-0" />
                <input
                  type="text"
                  value={social.facebook || ""}
                  onChange={(e) => handleUpdateSocial({ facebook: e.target.value })}
                  placeholder="https://facebook.com/your_event"
                  className="w-full rounded-lg border border-gray-200 p-2 text-xs dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center gap-2">
                <Youtube size={18} className="text-red-600 shrink-0" />
                <input
                  type="text"
                  value={social.youtube || ""}
                  onChange={(e) => handleUpdateSocial({ youtube: e.target.value })}
                  placeholder="https://youtube.com/@your_channel"
                  className="w-full rounded-lg border border-gray-200 p-2 text-xs dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 sm:col-span-2">
                <Globe size={18} className="text-emerald-600 shrink-0" />
                <input
                  type="text"
                  value={social.website || ""}
                  onChange={(e) => handleUpdateSocial({ website: e.target.value })}
                  placeholder="https://yourevent.com"
                  className="w-full rounded-lg border border-gray-200 p-2 text-xs dark:bg-slate-800"
                />
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: DISCOUNTS & COUPONS */}
        {activeSubTab === "discounts" && (
          <div className="mt-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <p className="text-gray-600 dark:text-gray-300">
                Promo codes and coupons applicable specifically to this event's checkout.
              </p>

              <button
                type="button"
                onClick={() => setShowAddCoupon(!showAddCoupon)}
                className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 font-bold text-white hover:bg-orange-700"
              >
                <Plus size={13} /> + Create Promo Code
              </button>
            </div>

            {/* Inline create coupon card */}
            {showAddCoupon && (
              <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 dark:border-slate-700 dark:bg-slate-800">
                <h5 className="font-bold text-orange-800 dark:text-orange-300 mb-2">
                  New Event Discount Coupon
                </h5>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Coupon Code
                    </label>
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="e.g. VIP20"
                      className="mt-1 w-full rounded border border-gray-200 p-1.5 font-mono uppercase dark:bg-slate-700"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Discount Type
                    </label>
                    <select
                      value={couponType}
                      onChange={(e) =>
                        setCouponType(e.target.value as "percentage" | "fixed")
                      }
                      className="mt-1 w-full rounded border border-gray-200 p-1.5 dark:bg-slate-700"
                    >
                      <option value="percentage">Percentage (%) Off</option>
                      <option value="fixed">Fixed Amount (₹) Off</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Discount Value
                    </label>
                    <input
                      type="number"
                      value={couponValue}
                      onChange={(e) => setCouponValue(parseFloat(e.target.value) || 0)}
                      className="mt-1 w-full rounded border border-gray-200 p-1.5 dark:bg-slate-700 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Usage Limit
                    </label>
                    <input
                      type="number"
                      value={couponUsageLimit}
                      onChange={(e) => setCouponUsageLimit(parseInt(e.target.value) || 0)}
                      className="mt-1 w-full rounded border border-gray-200 p-1.5 dark:bg-slate-700"
                    />
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateCoupon}
                    className="rounded bg-orange-600 px-3 py-1 font-bold text-white hover:bg-orange-700"
                  >
                    Save Coupon
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCoupon(false)}
                    className="rounded bg-gray-200 px-3 py-1 font-semibold text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Coupons list */}
            {coupons.length > 0 ? (
              <div className="space-y-2">
                {coupons.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-lg bg-orange-100 px-2.5 py-1 font-mono font-bold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                        {c.code}
                      </span>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">
                          {c.discountType === "percentage"
                            ? `${c.discountValue}% OFF`
                            : `₹${c.discountValue} FLAT OFF`}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          Used: {c.usedCount} / {c.usageLimit} times
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCoupon(c.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="italic text-gray-400">
                No custom coupons added for this event yet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
