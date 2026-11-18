import { useState } from "react";
import {
  Percent,
  Plus,
  Trash2,
  Copy,
  Tag,
  CheckCircle2,
  Clock,
  Search,
  Sparkles,
  X,
  Pencil,
} from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useEventStore } from "../store/eventStore";
import type { EventCoupon } from "../types/eventTypes";
import { formatInr, generateId } from "../utils/eventHelpers";

export const DiscountsPage = () => {
  const {
    globalCoupons,
    events,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus,
  } = useEventStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<EventCoupon | null>(null);

  // Form states
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(20);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10)
  );
  const [usageLimit, setUsageLimit] = useState<number>(100);
  const [perCustomerLimit, setPerCustomerLimit] = useState<number>(1);
  const [minOrderValue, setMinOrderValue] = useState<number>(999);
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  const totalCoupons = globalCoupons.length;
  const activeCoupons = globalCoupons.filter((c) => c.status === "Active").length;
  const totalRedemptions = globalCoupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);

  const filteredCoupons = globalCoupons.filter((c) => {
    if (!searchQuery.trim()) return true;
    return c.code.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setCode("");
    setDiscountType("percentage");
    setDiscountValue(20);
    setUsageLimit(100);
    setMinOrderValue(999);
    setSelectedEventId("");
    setModalOpen(true);
  };

  const handleOpenEdit = (coupon: EventCoupon) => {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    setDiscountType(coupon.discountType);
    setDiscountValue(coupon.discountValue);
    setStartDate(coupon.startDate);
    setEndDate(coupon.endDate);
    setUsageLimit(coupon.usageLimit);
    setPerCustomerLimit(coupon.perCustomerLimit);
    setMinOrderValue(coupon.minOrderValue);
    setSelectedEventId(coupon.eventId || "");
    setModalOpen(true);
  };

  const handleSaveCoupon = () => {
    if (!code.trim()) {
      toast.error("Please enter a valid coupon code.");
      return;
    }

    if (editingCoupon) {
      updateCoupon(editingCoupon.id, {
        code: code.trim().toUpperCase(),
        discountType,
        discountValue,
        startDate,
        endDate,
        usageLimit,
        perCustomerLimit,
        minOrderValue,
        eventId: selectedEventId || undefined,
      });
      toast.success(`Coupon ${code.toUpperCase()} updated.`);
    } else {
      const newCoupon: EventCoupon = {
        id: generateId(),
        code: code.trim().toUpperCase(),
        discountType,
        discountValue,
        startDate,
        endDate,
        usageLimit,
        usedCount: 0,
        perCustomerLimit,
        applicableTicketTypes: ["all"],
        minOrderValue,
        status: "Active",
        eventId: selectedEventId || undefined,
      };
      addCoupon(newCoupon);
      toast.success(`Coupon ${code.toUpperCase()} created.`);
    }

    setModalOpen(false);
  };

  const handleDelete = (id: string, codeName: string) => {
    Swal.fire({
      title: `Delete Coupon ${codeName}?`,
      text: "Attendees will no longer be able to apply this promo code.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, Delete",
    }).then((res) => {
      if (res.isConfirmed) {
        deleteCoupon(id);
        toast.success("Coupon removed.");
      }
    });
  };

  const handleCopyCode = (c: string) => {
    navigator.clipboard.writeText(c);
    toast.success(`Code ${c} copied to clipboard!`);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            Event Discounts & Promo Codes
          </h1>
          <p className="text-xs text-gray-500">
            Create promotional coupons, early bird discount codes, and track customer redemptions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-orange-700 transition"
        >
          <Plus size={16} /> + Create New Coupon
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Total Coupons
          </span>
          <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
            {totalCoupons}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            Active Promo Codes
          </span>
          <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {activeCoupons}
          </p>
        </div>

        <div className="rounded-xl border border-orange-100 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
            Total Redemptions
          </span>
          <p className="mt-1 text-2xl font-black text-orange-600 dark:text-orange-400">
            {totalRedemptions} times
          </p>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search coupon code..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-xs text-gray-900 focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <span className="text-xs text-gray-400 font-medium">
          {filteredCoupons.length} coupons configured
        </span>
      </div>

      {/* Coupons Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-gray-300">
                <th className="py-3 px-3.5">Coupon Code</th>
                <th className="py-3 px-3.5">Discount Value</th>
                <th className="py-3 px-3.5">Scope / Event</th>
                <th className="py-3 px-3.5 text-center">Usage Limits</th>
                <th className="py-3 px-3.5">Validity Dates</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredCoupons.length > 0 ? (
                filteredCoupons.map((coupon) => (
                  <tr
                    key={coupon.id}
                    className="hover:bg-gray-50/70 transition dark:hover:bg-slate-800/40"
                  >
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 dark:bg-orange-950/60 dark:border-orange-900 dark:text-orange-300">
                          {coupon.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(coupon.code)}
                          className="text-gray-400 hover:text-black dark:hover:text-white"
                          title="Copy Code"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-3.5 font-bold text-gray-900 dark:text-white">
                      {coupon.discountType === "percentage"
                        ? `${coupon.discountValue}% OFF`
                        : `${formatInr(coupon.discountValue)} FLAT OFF`}
                      <span className="block text-[10px] text-gray-400 font-normal">
                        Min Order: {formatInr(coupon.minOrderValue)}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-gray-600 dark:text-gray-300">
                      {coupon.eventId
                        ? events.find((e) => e.id === coupon.eventId)?.name || "Specific Event"
                        : "All Events (Global)"}
                    </td>

                    <td className="py-3 px-3.5 text-center font-bold text-gray-900 dark:text-white">
                      {coupon.usedCount} / {coupon.usageLimit}
                      <span className="block text-[10px] text-gray-400 font-normal">
                        Max {coupon.perCustomerLimit} per user
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-gray-500 whitespace-nowrap">
                      {coupon.startDate} to {coupon.endDate}
                    </td>

                    <td className="py-3 px-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleCouponStatus(coupon.id)}
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold transition ${
                          coupon.status === "Active"
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-400"
                        }`}
                      >
                        {coupon.status}
                      </button>
                    </td>

                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(coupon)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-black dark:hover:bg-slate-800 dark:hover:text-white"
                          title="Edit Coupon"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(coupon.id, coupon.code)}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete Coupon"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    No promo coupons found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {editingCoupon ? "Edit Discount Coupon" : "Create New Promo Coupon"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300">
                  Coupon Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FLASH30"
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 font-mono uppercase dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300">
                    Type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) =>
                      setDiscountType(e.target.value as "percentage" | "fixed")
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300">
                    Value
                  </label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 font-bold dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300">
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(parseInt(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300">
                    Min Order Value (₹)
                  </label>
                  <input
                    type="number"
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300">
                  Applicable Event
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800"
                >
                  <option value="">All Events (Global Promo)</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300">
                    Valid From
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCoupon}
                className="rounded-lg bg-orange-600 px-4 py-2 font-bold text-white hover:bg-orange-700"
              >
                Save Coupon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
