
import { useEffect, useState } from "react";
import {
  Calendar,
  Pencil,
  Plus,
  Power,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import {
  handleCreateSpaceOffer,
  handleDeleteSpaceOffer,
  handleGetSpaceOffers,
  handleSetSpaceOfferStatus,
  handleUpdateSpaceOffer,
  type SpaceOffer,
  type SpaceOfferRule,
} from "@/services/apiClient";

const emptyRule = (): SpaceOfferRule => ({
  minimumHours: 2,
  freeHours: 1,
  priority: 0,
  status: "active",
});

const blankOffer = (): SpaceOffer => ({
  offerName: "",
  description: "",
  offerType: "space_booking",
  priority: 0,
  status: "active",
  rules: [emptyRule()],
});

const ruleSummary = (rules: SpaceOfferRule[]) =>
  rules
    .filter((rule) => rule.status !== "inactive")
    .map((rule) => `${rule.minimumHours}h → ${rule.freeHours}h FREE`)
    .join(", ");

const SetOffersScreen = () => {
  const [offers, setOffers] = useState<SpaceOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [editor, setEditor] = useState<SpaceOffer | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [formError, setFormError] = useState("");

  // Search debounce
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  // Fetch offers
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await handleGetSpaceOffers(
          { page, limit: 10, search: debounced, status },
          controller.signal
        );

        setOffers(response.offers || []);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 1);
      } catch (err: unknown) {
        const canceled = err as { code?: string };

        if (canceled?.code === "ERR_CANCELED") return;

        setOffers([]);
        setError("Could not load offers.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();

    return () => controller.abort();
  }, [page, debounced, status, reloadToken]);

  const reload = () => setReloadToken((token) => token + 1);

  // Save offer
  const save = async () => {
    if (!editor) return;

    if (!editor.offerName.trim()) {
      setFormError("Offer name is required.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      if (editor._id) {
        await handleUpdateSpaceOffer(editor._id, editor);
      } else {
        await handleCreateSpaceOffer(editor);
      }

      setEditor(null);
      reload();

      await Swal.fire({
        icon: "success",
        title: editor._id ? "Offer updated" : "Offer created",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      const message = (
        err as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;

      setFormError(message || "Could not save the offer.");
    } finally {
      setSaving(false);
    }
  };

  // Delete offer
  const remove = async (offer: SpaceOffer) => {
    if (!offer._id) return;

    const result = await Swal.fire({
      title: `Delete ${offer.offerName}?`,
      text: "Existing bookings keep the offer that was saved on them.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });

    if (!result.isConfirmed) return;

    await handleDeleteSpaceOffer(offer._id);
    reload();
  };

  // Toggle status
  const toggle = async (offer: SpaceOffer) => {
    if (!offer._id) return;

    await handleSetSpaceOfferStatus(
      offer._id,
      offer.status === "active" ? "inactive" : "active"
    );

    setOffers((rows) =>
      rows.map((row) =>
        row._id === offer._id
          ? {
              ...row,
              status:
                row.status === "active" ? "inactive" : "active",
            }
          : row
      )
    );
  };

  // Filter styles
  const filterStyles = {
    all: {
      active: "bg-violet-600 text-white shadow-md shadow-violet-200",
      inactive: "bg-violet-50 text-violet-700",
    },
    active: {
      active: "bg-emerald-600 text-white shadow-md shadow-emerald-200",
      inactive: "bg-emerald-50 text-emerald-700",
    },
    inactive: {
      active: "bg-orange-500 text-white shadow-md shadow-orange-200",
      inactive: "bg-orange-50 text-orange-700",
    },
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-2 font-sans sm:p-6">

      {/* HEADER */}
      <div className="flex items-center justify-between gap-3">

        <div className="min-w-0">
          <h1 className="text-lg font-bold text-slate-900 sm:text-2xl">
            Set Offers
          </h1>

          {/* Description hidden only on mobile */}
          <p className="mt-1 hidden text-xs text-slate-500 sm:block sm:text-sm">
            Manage promotional offers and automatically apply discounts
            or free booking hours.
          </p>
        </div>

        {/* CREATE BUTTON */}
        <Can permission={PERMISSIONS.COUPON_MANAGE}>
          <button
            type="button"
            onClick={() => {
              setFormError("");
              setEditor(blankOffer());
            }}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <Plus size={16} />
            <span>Create</span>
          </button>
        </Can>
      </div>

      {/* SEARCH AND STATUS FILTERS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3">

        {/* SEARCH */}
        <div className="relative w-full">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search offers"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 sm:h-11"
          />
        </div>

        {/* COLORFUL STATUS FILTERS */}
        <div className="mt-2.5 grid grid-cols-3 gap-2">

          {(["all", "active", "inactive"] as const).map((item) => {
            const selected = status === item;

            const style = filterStyles[item];

            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setStatus(item);
                  setPage(1);
                }}
                className={`
                  flex h-9 items-center justify-center
                  rounded-lg px-2 text-xs font-bold capitalize
                  transition-all duration-200
                  sm:h-10 sm:text-sm
                  ${
                    selected
                      ? style.active
                      : style.inactive
                  }
                `}
              >
                {item === "all"
                  ? "All"
                  : item === "active"
                    ? "Active"
                    : "Inactive"}
              </button>
            );
          })}
        </div>
      </div>

      {/* ERROR */}
      {error ? (
        <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {/* MOBILE OFFERS CARD VIEW */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-2xs">
            Loading offers...
          </div>
        ) : offers.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-2xs">
            No offers found.
          </div>
        ) : (
          offers.map((offer) => (
            <div
              key={offer._id}
              className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs space-y-3 transition hover:shadow-xs"
            >
              {/* Header: Offer Icon + Name + Status */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100/90 text-violet-700 shadow-xs">
                    <Tag size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                        {offer.offerName}
                      </h3>
                      <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200/60">
                        Space Booking
                      </span>
                    </div>
                    {offer.description ? (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {offer.description}
                      </p>
                    ) : null}
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                    offer.status === "active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                      : "bg-slate-100 text-slate-500 border-slate-200/60"
                  }`}
                >
                  {offer.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Offer Rules Box */}
              <div className="rounded-xl bg-violet-50/70 border border-violet-100/80 p-2.5 space-y-1">
                <span className="font-bold uppercase tracking-wider text-[11px] text-violet-700 flex items-center gap-1">
                  <Sparkles size={12} />
                  Offer Rules
                </span>
                <p className="text-xs font-semibold text-slate-800">
                  {ruleSummary(offer.rules) || "No active rules configured"}
                </p>
              </div>

              {/* Meta Date & Quick Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Calendar size={13} />
                  <span>
                    {offer.createdAt
                      ? new Date(offer.createdAt).toLocaleDateString("en-IN")
                      : "—"}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Can permission={PERMISSIONS.COUPON_MANAGE}>
                    <button
                      type="button"
                      title="Edit offer"
                      onClick={() => {
                        setFormError("");
                        setEditor(offer);
                      }}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition active:scale-95 cursor-pointer"
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      type="button"
                      title={
                        offer.status === "active" ? "Deactivate" : "Activate"
                      }
                      onClick={() => void toggle(offer)}
                      className={`inline-flex items-center justify-center h-8 w-8 rounded-lg transition active:scale-95 cursor-pointer ${
                        offer.status === "active"
                          ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      <Power size={14} />
                    </button>

                    <button
                      type="button"
                      title="Delete offer"
                      onClick={() => void remove(offer)}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 transition active:scale-95 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </Can>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP OFFERS TABLE */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Offer Name</th>
                <th className="px-4 py-3">Offer Type</th>
                <th className="px-4 py-3">Offer Rules</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Loading offers...
                  </td>
                </tr>
              ) : offers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No offers found.
                  </td>
                </tr>
              ) : (
                offers.map((offer) => (
                  <tr
                    key={offer._id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {offer.offerName}
                      </div>

                      {offer.description ? (
                        <div className="text-xs text-slate-400">
                          {offer.description}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      Space Booking
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-violet-800">
                        {ruleSummary(offer.rules) || "No active rules"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          offer.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {offer.status === "active"
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {offer.createdAt
                        ? new Date(
                            offer.createdAt
                          ).toLocaleDateString("en-IN")
                        : "-"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Can permission={PERMISSIONS.COUPON_MANAGE}>
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => {
                              setFormError("");
                              setEditor(offer);
                            }}
                            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            title={
                              offer.status === "active"
                                ? "Deactivate"
                                : "Activate"
                            }
                            onClick={() => void toggle(offer)}
                            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                          >
                            <Power size={15} />
                          </button>

                          <button
                            type="button"
                            title="Delete"
                            onClick={() => void remove(offer)}
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 size={15} />
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

      {/* PAGINATION */}
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>{total} offers</span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => current - 1)}
            className="rounded-lg bg-white px-3 py-1.5 font-semibold ring-1 ring-slate-200 disabled:opacity-40"
          >
            Previous
          </button>

          <span className="whitespace-nowrap">
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-lg bg-white px-3 py-1.5 font-semibold ring-1 ring-slate-200 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {/* CREATE / EDIT OFFER MODAL */}
      {editor ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-[2px] p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[95dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl border border-violet-100">

            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-violet-100 bg-gradient-to-r from-violet-100/70 via-purple-50/60 to-indigo-50/80 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-200">
                  <Tag size={20} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    {editor._id ? "Edit Space Offer" : "Create Space Offer"}
                  </h2>
                  <p className="text-xs font-medium text-violet-700/80">
                    Free hours apply to a single-date hourly space booking
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditor(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-white/80 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">

              {/* OFFER NAME */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Offer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  value={editor.offerName}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      offerName: event.target.value,
                    })
                  }
                  placeholder="e.g. Creator Weekend Special"
                  className="w-full rounded-xl border border-violet-200/90 bg-violet-50/20 px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-100 transition"
                />
              </div>

              {/* OFFER DESCRIPTION */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Description
                </label>
                <textarea
                  value={editor.description || ""}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      description: event.target.value,
                    })
                  }
                  placeholder="e.g. Book 4 hours and get 1 hour free on space bookings"
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-100 transition resize-none"
                />
              </div>

              {/* OFFER TYPE & STATUS */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Offer Type
                  </label>
                  <div className="flex h-10 items-center gap-2 rounded-xl border border-blue-200/80 bg-blue-50/70 px-3.5 text-xs font-bold text-blue-800">
                    <Sparkles size={14} className="text-blue-600" />
                    <span>Space Booking Offer</span>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Status
                  </label>
                  <select
                    value={editor.status}
                    onChange={(event) =>
                      setEditor({
                        ...editor,
                        status: event.target.value as "active" | "inactive",
                      })
                    }
                    className={`h-10 w-full rounded-xl border px-3.5 text-xs font-bold transition focus:outline-none focus:ring-4 ${
                      editor.status === "active"
                        ? "border-emerald-300 bg-emerald-50/80 text-emerald-800 focus:border-emerald-500 focus:ring-emerald-100"
                        : "border-slate-300 bg-slate-50 text-slate-700 focus:border-slate-400 focus:ring-slate-100"
                    }`}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* OFFER PRIORITY */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Offer Priority
                </label>
                <input
                  type="number"
                  value={editor.priority || 0}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      priority: Number(event.target.value),
                    })
                  }
                  placeholder="0"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-100 transition"
                />
              </div>

              {/* RULES SECTION */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                      <Sparkles size={13} />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Offer Rules & Thresholds
                    </h3>
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                      {editor.rules.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setEditor({
                        ...editor,
                        rules: [...editor.rules, emptyRule()],
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700 hover:bg-violet-100 transition active:scale-95 border border-violet-200/80 cursor-pointer"
                  >
                    <Plus size={13} />
                    Add Rule
                  </button>
                </div>

                {editor.rules.map((rule, index) => {
                  const paysHours = Math.max(
                    0,
                    Number(rule.minimumHours) - Number(rule.freeHours)
                  );
                  return (
                    <div
                      key={index}
                      className="space-y-3 rounded-2xl border-2 border-violet-200/80 bg-gradient-to-br from-violet-50/40 via-white to-purple-50/30 p-3.5 shadow-xs"
                    >
                      {/* Rule Card Header */}
                      <div className="flex items-center justify-between border-b border-violet-100/70 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white shadow-xs">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold text-violet-950">
                            Rule #{index + 1}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              rule.status === "active"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                          >
                            {rule.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </div>

                        {editor.rules.length > 1 ? (
                          <button
                            type="button"
                            title="Delete rule"
                            onClick={() =>
                              setEditor({
                                ...editor,
                                rules: editor.rules.filter(
                                  (_, ruleIndex) => ruleIndex !== index
                                ),
                              })
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : null}
                      </div>

                      {/* Rule Inputs */}
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-600">
                            Min Hours
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              step="0.5"
                              value={rule.minimumHours}
                              onChange={(event) => {
                                const rules = editor.rules.slice();
                                rules[index] = {
                                  ...rule,
                                  minimumHours: Number(event.target.value),
                                };
                                setEditor({ ...editor, rules });
                              }}
                              className="w-full rounded-xl border border-violet-200 bg-white py-1.5 pl-2.5 pr-8 text-xs font-bold text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                            />
                            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-violet-600">
                              hrs
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-600">
                            Free Hours
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              step="0.5"
                              value={rule.freeHours}
                              onChange={(event) => {
                                const rules = editor.rules.slice();
                                rules[index] = {
                                  ...rule,
                                  freeHours: Number(event.target.value),
                                };
                                setEditor({ ...editor, rules });
                              }}
                              className="w-full rounded-xl border border-emerald-200 bg-emerald-50/30 py-1.5 pl-2.5 pr-8 text-xs font-bold text-emerald-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600">
                              free
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-600">
                            Priority
                          </label>
                          <input
                            type="number"
                            value={rule.priority || 0}
                            onChange={(event) => {
                              const rules = editor.rules.slice();
                              rules[index] = {
                                ...rule,
                                priority: Number(event.target.value),
                              };
                              setEditor({ ...editor, rules });
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-600">
                            Status
                          </label>
                          <select
                            value={rule.status || "active"}
                            onChange={(event) => {
                              const rules = editor.rules.slice();
                              rules[index] = {
                                ...rule,
                                status: event.target.value as "active" | "inactive",
                              };
                              setEditor({ ...editor, rules });
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                      </div>

                      {/* Outcome Explanation pill */}
                      <div className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50/70 border border-emerald-200/60 px-3 py-1.5 text-[11px] font-semibold text-emerald-800">
                        <Sparkles size={12} className="text-emerald-600 shrink-0" />
                        <span>
                          Customer books <span className="font-bold underline">{rule.minimumHours}h</span>, gets <span className="font-bold text-emerald-700">{rule.freeHours}h FREE</span> & pays for <span className="font-bold">{paysHours}h</span>.
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {formError ? (
                <div className="rounded-xl bg-rose-50 border border-rose-200/80 px-3 py-2 text-xs font-medium text-rose-700">
                  {formError}
                </div>
              ) : null}
            </div>

            {/* MODAL FOOTER */}
            <div className="flex items-center gap-2.5 border-t border-slate-100 bg-slate-50/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-200 hover:from-violet-700 hover:to-indigo-700 transition active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {saving ? "Saving..." : editor._id ? "Update Offer" : "Create Offer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SetOffersScreen;
