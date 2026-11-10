
import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Eye,
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

const previewRows = (rules: SpaceOfferRule[]) => {
  const active = rules
    .filter(
      (rule) =>
        rule.status !== "inactive" &&
        rule.minimumHours > rule.freeHours &&
        rule.freeHours > 0
    )
    .slice()
    .sort((a, b) => a.minimumHours - b.minimumHours);

  return [1, 2, 4, 6, 8, 10, 12].map((hours) => {
    const match = active
      .filter((rule) => hours >= rule.minimumHours)
      .at(-1);

    const free = match ? Math.min(hours, match.freeHours) : 0;

    return {
      hours,
      free,
      chargeable: Math.max(0, hours - free),
      amount: Math.max(0, hours - free) * 500,
    };
  });
};

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
  const [viewing, setViewing] = useState<SpaceOffer | null>(null);
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

  const preview = useMemo(
    () => (editor ? previewRows(editor.rules) : []),
    [editor]
  );

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
              <div className="rounded-xl bg-violet-50/60 border border-violet-100/80 p-2.5 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold uppercase tracking-wider text-violet-700 flex items-center gap-1">
                    <Sparkles size={12} />
                    Offer Rules
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewing(offer)}
                    className="font-semibold text-violet-600 hover:text-violet-800 underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Eye size={12} />
                    Preview
                  </button>
                </div>
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
                  <button
                    type="button"
                    onClick={() => setViewing(offer)}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition active:scale-95 text-xs cursor-pointer"
                  >
                    <Eye size={13} />
                    View
                  </button>

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
                      <button
                        type="button"
                        onClick={() => setViewing(offer)}
                        className="text-left text-xs font-medium text-violet-700 hover:underline"
                      >
                        {ruleSummary(offer.rules) || "No active rules"}
                      </button>
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
                        <button
                          type="button"
                          title="View"
                          onClick={() => setViewing(offer)}
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          View
                        </button>

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

      {/* VIEW OFFER MODAL */}
      {viewing ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {viewing.offerName}
              </h2>

              <button
                type="button"
                onClick={() => setViewing(null)}
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-slate-500">
              {viewing.description || "Space booking offer"}
            </p>

            <div className="mt-4 space-y-2">
              {viewing.rules.map((rule, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
                >
                  <span>
                    Book {rule.minimumHours}h or more
                  </span>

                  <span className="font-semibold">
                    {rule.freeHours}h FREE · pays{" "}
                    {Math.max(
                      0,
                      rule.minimumHours - rule.freeHours
                    )}
                    h
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* CREATE / EDIT OFFER MODAL */}
      {editor ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white sm:max-h-[92vh] sm:rounded-2xl">

            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-bold">
                  {editor._id ? "Edit Offer" : "Create Offer"}
                </h2>

                <p className="text-xs text-slate-500">
                  Free hours apply to a single-date hourly space booking.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditor(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 lg:grid-cols-2">

              {/* OFFER DETAILS */}
              <div className="space-y-3">
                <label className="block text-sm font-medium">
                  Offer Name

                  <input
                    value={editor.offerName}
                    onChange={(event) =>
                      setEditor({
                        ...editor,
                        offerName: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Offer Description

                  <textarea
                    value={editor.description || ""}
                    onChange={(event) =>
                      setEditor({
                        ...editor,
                        description: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                    rows={2}
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-medium">
                    Offer Type

                    <input
                      value="Space Booking Offer"
                      disabled
                      className="mt-1 w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Status

                    <select
                      value={editor.status}
                      onChange={(event) =>
                        setEditor({
                          ...editor,
                          status: event.target.value as
                            | "active"
                            | "inactive",
                        })
                      }
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                </div>

                <label className="block text-sm font-medium">
                  Offer priority

                  <input
                    type="number"
                    value={editor.priority || 0}
                    onChange={(event) =>
                      setEditor({
                        ...editor,
                        priority: Number(event.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </label>

                {/* RULES */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      Rules
                    </h3>

                    <button
                      type="button"
                      onClick={() =>
                        setEditor({
                          ...editor,
                          rules: [...editor.rules, emptyRule()],
                        })
                      }
                      className="text-xs font-bold text-violet-700"
                    >
                      Add rule
                    </button>
                  </div>

                  {editor.rules.map((rule, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-2 gap-2 rounded-xl border p-3 sm:grid-cols-4"
                    >
                      <label className="text-xs text-slate-500">
                        Minimum hours

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
                          className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                        />
                      </label>

                      <label className="text-xs text-slate-500">
                        Free hours

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
                          className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                        />
                      </label>

                      <label className="text-xs text-slate-500">
                        Priority

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
                          className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                        />
                      </label>

                      <div className="flex items-end justify-between gap-2">
                        <select
                          value={rule.status || "active"}
                          onChange={(event) => {
                            const rules = editor.rules.slice();

                            rules[index] = {
                              ...rule,
                              status: event.target.value as
                                | "active"
                                | "inactive",
                            };

                            setEditor({ ...editor, rules });
                          }}
                          className="w-full rounded-lg border px-2 py-1.5 text-sm"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>

                        <button
                          type="button"
                          onClick={() =>
                            setEditor({
                              ...editor,
                              rules: editor.rules.filter(
                                (_, ruleIndex) => ruleIndex !== index
                              ),
                            })
                          }
                          className="rounded-lg p-1.5 text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <p className="col-span-2 text-[11px] text-slate-400 sm:col-span-4">
                        Customer pays for{" "}
                        {Math.max(
                          0,
                          Number(rule.minimumHours) -
                            Number(rule.freeHours)
                        )}{" "}
                        hour(s) at this threshold.
                      </p>
                    </div>
                  ))}
                </div>

                {formError ? (
                  <p className="text-sm text-rose-600">
                    {formError}
                  </p>
                ) : null}
              </div>

              {/* PREVIEW */}
              <div className="rounded-2xl bg-slate-50 p-4">
                <h3 className="text-sm font-semibold">
                  Preview at ₹500 / hour
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Only the highest matching threshold is applied.
                </p>

                <div className="mt-3 space-y-1.5">
                  {preview.map((row) => (
                    <div
                      key={row.hours}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs"
                    >
                      <span>{row.hours}h booked</span>

                      <span className="text-right font-semibold">
                        {row.free
                          ? `${row.free}h FREE · pays ${row.chargeable}h · ₹${row.amount.toLocaleString("en-IN")}`
                          : `No offer · ₹${row.amount.toLocaleString("en-IN")}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="flex gap-2 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Offer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SetOffersScreen;
