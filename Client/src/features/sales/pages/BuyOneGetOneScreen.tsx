import { useEffect, useMemo, useState } from "react";
import { Gift, Plus, Search, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import FoodOfferModal, {
  type OfferFoodOption,
  type SavedFoodOffer,
} from "@/features/foodbill/FoodOfferModal";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import {
  handleCreateFoodOffer,
  handleDeleteFoodOffer,
  handleGetFoodOffers,
  handleGetFoods,
  type FoodOfferPayload,
} from "@/services/apiClient";

function money(amount: number) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function toOffer(row: FoodOfferPayload): SavedFoodOffer | null {
  const id = String(row?._id || "").trim();
  const buyFoodId = String(row?.buyFoodId || row?.buyFood?.id || "").trim();
  const freeFoodId = String(row?.freeFoodId || row?.freeFood?.id || "").trim();
  if (!id || !buyFoodId || !freeFoodId) return null;
  return {
    id,
    buyFoodId,
    freeFoodId,
    buyName: String(row?.buyFood?.name || "Food"),
    buyPrice: Math.max(0, Number(row?.buyFood?.price ?? 0) || 0),
    freeName: String(row?.freeFood?.name || "Food"),
    freePrice: Math.max(0, Number(row?.freeFood?.price ?? 0) || 0),
  };
}

export default function BuyOneGetOneScreen() {
  const [offers, setOffers] = useState<SavedFoodOffer[]>([]);
  const [foods, setFoods] = useState<OfferFoodOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFoods, setLoadingFoods] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [search, setSearch] = useState("");

  const loadOffers = async (signal?: AbortSignal) => {
    const response = await handleGetFoodOffers(signal);
    const rows = Array.isArray(response?.offers) ? response.offers : [];
    setOffers(rows.map(toOffer).filter((row): row is SavedFoodOffer => Boolean(row)));
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void loadOffers(controller.signal)
      .catch(() => setOffers([]))
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!openModal) return;
    const controller = new AbortController();
    setLoadingFoods(true);
    handleGetFoods({ status: "Active" }, controller.signal)
      .then((response) => {
        const rows = Array.isArray(response?.foods) ? response.foods : [];
        setFoods(
          rows
            .map((raw: { _id?: string; id?: string; name?: string; price?: number }) => {
              const id = String(raw?._id || raw?.id || "").trim();
              const name = String(raw?.name || "").trim();
              if (!id || !name) return null;
              return {
                id,
                name,
                price: Math.max(0, Number(raw?.price ?? 0) || 0),
              };
            })
            .filter((row: OfferFoodOption | null): row is OfferFoodOption => Boolean(row)),
        );
      })
      .catch(() => setFoods([]))
      .finally(() => {
        if (!controller.signal.aborted) setLoadingFoods(false);
      });
    return () => controller.abort();
  }, [openModal]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return offers;
    return offers.filter(
      (offer) =>
        offer.buyName.toLowerCase().includes(term) ||
        offer.freeName.toLowerCase().includes(term),
    );
  }, [offers, search]);

  const saveOffer = async (buyFoodId: string, freeFoodId: string) => {
    if (!buyFoodId || !freeFoodId || buyFoodId === freeFoodId) return;
    if (offers.some((offer) => offer.buyFoodId === buyFoodId)) {
      await Swal.fire(
        "Offer already exists",
        "Remove the existing offer for this purchase item before saving another.",
        "warning",
      );
      return;
    }
    try {
      setSaving(true);
      await handleCreateFoodOffer({ buyFoodId, freeFoodId });
      await loadOffers();
      setOpenModal(false);
      await Swal.fire({
        icon: "success",
        title: "Offer saved",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Could not save offer",
        err?.response?.data?.message || "Try again.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeOffer = async (offer: SavedFoodOffer) => {
    const result = await Swal.fire({
      title: "Remove this offer?",
      text: `Buying ${offer.buyName} will no longer add ${offer.freeName} free.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remove",
    });
    if (!result.isConfirmed) return;
    try {
      await handleDeleteFoodOffer(offer.id);
      await loadOffers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Could not remove offer",
        err?.response?.data?.message || "Try again.",
        "error",
      );
    }
  };

  return (
    <div className="min-h-full bg-slate-50 p-3 sm:p-5">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Marketing
            </p>
            <h1 className="text-xl font-bold text-slate-900">Buy 1 Get 1</h1>
            <p className="mt-1 text-sm text-slate-500">
              Food offers. The item on the left is paid. The item on the right is added free.
            </p>
          </div>
          <Can permission={PERMISSIONS.FOOD_CREATE}>
            <button
              type="button"
              onClick={() => setOpenModal(true)}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              Add offer
            </button>
          </Can>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <Search size={16} className="text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search buy item or free item"
            className="w-full bg-transparent text-sm text-slate-800 outline-none"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Buy this</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Get this free</th>
                  <th className="px-4 py-3">Worth</th>
                  <th className="px-4 py-3">Offer</th>
                  <th className="px-4 py-3 text-right"> </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      Loading offers…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      <Gift className="mx-auto mb-2 text-slate-300" size={22} />
                      {offers.length === 0
                        ? "No Buy 1 Get 1 offers yet."
                        : "No offers match this search."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((offer) => (
                    <tr key={offer.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {offer.buyName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{money(offer.buyPrice)}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">
                        {offer.freeName}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{money(offer.freePrice)}</td>
                      <td className="px-4 py-3 text-slate-700">
                        Buy {offer.buyName}, get {offer.freeName} free
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Can permission={PERMISSIONS.FOOD_DELETE}>
                          <button
                            type="button"
                            onClick={() => void removeOffer(offer)}
                            className="inline-flex rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Remove offer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </Can>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <FoodOfferModal
        open={openModal}
        foods={foods}
        loadingFoods={loadingFoods}
        offers={offers}
        saving={saving}
        onClose={() => setOpenModal(false)}
        onSave={(buyFoodId, freeFoodId) => {
          void saveOffer(buyFoodId, freeFoodId);
        }}
        onDelete={(offerId) => {
          const offer = offers.find((row) => row.id === offerId);
          if (offer) void removeOffer(offer);
        }}
      />
    </div>
  );
}
