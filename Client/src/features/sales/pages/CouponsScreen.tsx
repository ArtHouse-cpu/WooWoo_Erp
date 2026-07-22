import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  handleActivateCoupon,
  handleCreateCoupon,
  handleDeactivateCoupon,
  handleDeleteCoupon,
  handleGetCoupons,
  handleUpdateCoupon,
  type CouponPayload,
} from "@/services/apiClient";
import { useAppSelector } from "@/store/hooks";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";

type CouponRow = CouponPayload & {
  _id: string;
  usedCount?: number;
};

const initialForm: CouponPayload = {
  code: "",
  title: "",
  description: "",
  discountType: "percentage",
  discountValue: 0,
  minOrderAmount: 0,
  maxDiscountAmount: null,
  startsAt: null,
  expiresAt: "",
  usageLimit: null,
  perCustomerLimit: null,
  isActive: true,
};

export default function CouponsScreen() {
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponPayload>(initialForm);
  const staff = useAppSelector((state) => state.user);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await handleGetCoupons({ search });
      setCoupons(Array.isArray(response?.coupons) ? response.coupons : []);
    } catch {
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCoupons();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return coupons;
    return coupons.filter(
      (c) =>
        String(c.code ?? "").toLowerCase().includes(q) ||
        String(c.title ?? "").toLowerCase().includes(q),
    );
  }, [coupons, search]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const submit = async () => {
    if (!form.code.trim() || !form.title.trim() || !form.expiresAt) {
      Swal.fire("Missing fields", "Code, title and expiry are required.", "warning");
      return;
    }
    try {
      setSaving(true);
      const payload: CouponPayload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        title: form.title.trim(),
        createdBy: {
          m_staff_id: staff.m_staff_id,
          m_staff_name: staff.m_staff_name,
          m_staff_email: staff.m_staff_email,
        },
      };
      if (editingId) {
        await handleUpdateCoupon(editingId, payload);
      } else {
        await handleCreateCoupon(payload);
      }
      await fetchCoupons();
      resetForm();
      Swal.fire("Saved", "Coupon saved successfully.", "success");
    } catch (error: any) {
      Swal.fire(
        "Save failed",
        error?.response?.data?.message ?? "Could not save coupon.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 p-2">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-violet-50 to-indigo-50 px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Coupons</h1>
            <p className="mt-1 text-sm text-gray-600">
              Create and manage discount coupons for Invoice and POS checkout.
            </p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code or title..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm md:w-72"
          />
        </div>
      </div>

      <Can permission={PERMISSIONS.COUPON_MANAGE}>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? "Edit Coupon" : "Create Coupon"}
            </h2>
            <p className="text-xs text-gray-500">
              Fill the details below. Required fields are marked.
            </p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {form.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Coupon Code *
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase"
                placeholder="e.g. SWIGGY50"
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Title *</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Weekend Offer"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(form.isActive)}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Activate this coupon
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Discount Type
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.discountType}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    discountType: e.target.value as "percentage" | "flat",
                  }))
                }
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat (INR)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Discount Value
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder={form.discountType === "percentage" ? "10" : "100"}
                value={form.discountValue}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, discountValue: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Minimum Order (INR)
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="0"
                value={form.minOrderAmount ?? 0}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, minOrderAmount: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Max Discount Cap (INR)
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Optional"
                value={form.maxDiscountAmount ?? 0}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    maxDiscountAmount: Number(e.target.value) || null,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Start Date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.startsAt ? String(form.startsAt).slice(0, 10) : ""}
                onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value || null }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Expiry Date *</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.expiresAt ? String(form.expiresAt).slice(0, 10) : ""}
                onChange={(e) => setForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Total Usage Limit</label>
              <input
                type="number"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Optional"
                value={form.usageLimit ?? 0}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, usageLimit: Number(e.target.value) || null }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Per Customer Limit</label>
              <input
                type="number"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Optional"
                value={form.perCustomerLimit ?? 0}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, perCustomerLimit: Number(e.target.value) || null }))
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId ? "Update Coupon" : "Create Coupon"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
            <p className="text-xs text-gray-500">
              Tip: Keep code short and easy to remember (example: SAVE10).
            </p>
          </div>
        </div>
      </div>
      </Can>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Discount</th>
              <th className="px-3 py-2 text-left">Expiry</th>
              <th className="px-3 py-2 text-left">Used</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={7}>
                  Loading coupons...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={7}>
                  No coupons found.
                </td>
              </tr>
            ) : (
              filtered.map((coupon) => (
                <tr key={coupon._id} className="border-t border-gray-100 hover:bg-gray-50/70">
                  <td className="px-3 py-2 font-semibold">{coupon.code}</td>
                  <td className="px-3 py-2">{coupon.title}</td>
                  <td className="px-3 py-2">
                    {coupon.discountType === "percentage"
                      ? `${coupon.discountValue}%`
                      : `₹${coupon.discountValue}`}
                  </td>
                  <td className="px-3 py-2">
                    {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-3 py-2">{Number(coupon.usedCount ?? 0)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-1 text-xs ${coupon.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"}`}
                    >
                      {coupon.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Can permission={PERMISSIONS.COUPON_MANAGE}>
                        <button
                          type="button"
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                          onClick={() => {
                            setEditingId(coupon._id);
                            setForm({
                              code: coupon.code,
                              title: coupon.title,
                              description: coupon.description ?? "",
                              discountType: coupon.discountType,
                              discountValue: coupon.discountValue,
                              minOrderAmount: coupon.minOrderAmount ?? 0,
                              maxDiscountAmount: coupon.maxDiscountAmount ?? null,
                              startsAt: coupon.startsAt ? String(coupon.startsAt) : null,
                              expiresAt: coupon.expiresAt ? String(coupon.expiresAt) : "",
                              usageLimit: coupon.usageLimit ?? null,
                              perCustomerLimit: coupon.perCustomerLimit ?? null,
                              isActive: Boolean(coupon.isActive),
                            });
                          }}
                        >
                          Edit
                        </button>
                      </Can>
                      <Can permission={PERMISSIONS.COUPON_MANAGE}>
                        <button
                          type="button"
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                          onClick={async () => {
                            if (coupon.isActive) await handleDeactivateCoupon(coupon._id);
                            else await handleActivateCoupon(coupon._id);
                            await fetchCoupons();
                          }}
                        >
                          {coupon.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </Can>
                      <Can permission={PERMISSIONS.COUPON_MANAGE}>
                        <button
                          type="button"
                          className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                          onClick={async () => {
                            await handleDeleteCoupon(coupon._id);
                            await fetchCoupons();
                          }}
                        >
                          Delete
                        </button>
                      </Can>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
