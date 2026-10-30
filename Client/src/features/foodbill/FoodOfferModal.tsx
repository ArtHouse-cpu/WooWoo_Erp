import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Gift, Search, Tag, Trash2, X } from "lucide-react";
import { closeIfConfirmed } from "@/utils/confirmClose";

export type OfferFoodOption = {
  id: string;
  name: string;
  price: number;
};

export type SavedFoodOffer = {
  id: string;
  buyFoodId: string;
  freeFoodId: string;
  buyName: string;
  buyPrice: number;
  freeName: string;
  freePrice: number;
};

type Props = {
  open: boolean;
  foods: OfferFoodOption[];
  loadingFoods: boolean;
  offers: SavedFoodOffer[];
  saving: boolean;
  onClose: () => void;
  onSave: (buyFoodId: string, freeFoodId: string) => void;
  onDelete: (offerId: string) => void;
};

function formatRupee(amount: number) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function FoodPicker({
  label,
  hint,
  foods,
  selectedId,
  excludeId,
  open,
  onOpen,
  onSelect,
}: {
  label: string;
  hint: string;
  foods: OfferFoodOption[];
  selectedId: string;
  excludeId?: string;
  open: boolean;
  onOpen: () => void;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = foods.find((food) => food.id === selectedId) || null;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return foods
      .filter((food) => food.id !== excludeId)
      .filter((food) => !q || food.name.toLowerCase().includes(q))
      .slice(0, 40);
  }, [foods, query, excludeId]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) onOpen();
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open, onOpen]);

  return (
    <div ref={wrapRef} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-800">{label}</p>
      <p className="mb-2 text-[11px] text-slate-500">{hint}</p>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-blue-400">
        <Search size={15} className="shrink-0 text-slate-400" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!open) onOpen();
          }}
          onFocus={() => {
            if (!open) onOpen();
          }}
          placeholder={selected ? "Search to change" : "Search food by name"}
          className="w-full bg-transparent text-sm text-slate-800 outline-none"
        />
      </div>

      {selected ? (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{selected.name}</p>
            <p className="text-xs text-slate-500">{formatRupee(selected.price)}</p>
          </div>
          <button
            type="button"
            onClick={() => onSelect("")}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Clear"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      {open ? (
        <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white">
          {visible.length === 0 ? (
            <p className="px-3 py-3 text-xs text-slate-500">No food items found.</p>
          ) : (
            visible.map((food) => {
              const active = food.id === selectedId;
              return (
                <button
                  key={food.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onSelect(food.id);
                    setQuery("");
                  }}
                  className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 ${
                    active ? "bg-blue-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate text-sm font-medium text-slate-800">
                    {food.name}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-slate-500">
                    {formatRupee(food.price)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function FoodOfferModal({
  open,
  foods,
  loadingFoods,
  offers,
  saving,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [buyFoodId, setBuyFoodId] = useState("");
  const [freeFoodId, setFreeFoodId] = useState("");
  const [openPicker, setOpenPicker] = useState<"buy" | "free" | null>(null);

  useEffect(() => {
    if (!open) return;
    setBuyFoodId("");
    setFreeFoodId("");
    setOpenPicker(null);
  }, [open]);

  if (!open) return null;

  const buy = foods.find((food) => food.id === buyFoodId) || null;
  const free = foods.find((food) => food.id === freeFoodId) || null;
  const existing = offers.find((offer) => offer.buyFoodId === buyFoodId) || null;
  const requestClose = () => {
    void closeIfConfirmed(onClose);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Tag size={16} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Discount</h2>
              <p className="text-xs text-slate-500">
                Buy one item and the other is added free on the bill
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {loadingFoods ? (
            <div className="space-y-2">
              <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          ) : (
            <>
              <FoodPicker
                label="1. Purchase item"
                hint="The item the customer pays for"
                foods={foods}
                selectedId={buyFoodId}
                open={openPicker === "buy"}
                onOpen={() =>
                  setOpenPicker((current) => (current === "buy" ? null : "buy"))
                }
                onSelect={(id) => {
                  setBuyFoodId(id);
                  if (id && id === freeFoodId) setFreeFoodId("");
                  if (id) setOpenPicker(null);
                }}
              />
              <FoodPicker
                label="2. Free item"
                hint="Added automatically at ₹0 when the purchase item is billed"
                foods={foods}
                selectedId={freeFoodId}
                excludeId={buyFoodId}
                open={openPicker === "free"}
                onOpen={() =>
                  setOpenPicker((current) => (current === "free" ? null : "free"))
                }
                onSelect={(id) => {
                  setFreeFoodId(id);
                  if (id) setOpenPicker(null);
                }}
              />
            </>
          )}

          {buy && free ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                <Gift size={13} />
                Offer preview
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">
                  {buy.name}
                  <span className="block text-xs font-medium text-slate-500">
                    {formatRupee(buy.price)}
                  </span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-emerald-600" />
                <span className="min-w-0 flex-1 truncate text-right font-semibold text-slate-900">
                  {free.name}
                  <span className="block text-xs font-medium text-emerald-700">
                    Free · was {formatRupee(free.price)}
                  </span>
                </span>
              </div>
              {existing ? (
                <p className="mt-2 text-xs font-medium text-amber-700">
                  {buy.name} already gives {existing.freeName} free. Remove that offer
                  before saving a new one.
                </p>
              ) : (
                <p className="mt-2 text-xs text-emerald-800">
                  One {free.name} is added free for each {buy.name} on the bill.
                </p>
              )}
            </div>
          ) : null}

          <div>
            <p className="mb-1.5 text-xs font-bold text-slate-800">
              Saved offers{offers.length ? ` (${offers.length})` : ""}
            </p>
            {offers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-500">
                No offers yet. Save one and it applies on every food bill.
              </p>
            ) : (
              <ul className="space-y-2">
                {offers.map((offer) => (
                  <li
                    key={offer.id}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="truncate font-semibold text-slate-800">
                        {offer.buyName}{" "}
                        <span className="font-medium text-slate-400">
                          {formatRupee(offer.buyPrice)}
                        </span>
                      </p>
                      <p className="truncate text-emerald-700">
                        Free: {offer.freeName}{" "}
                        <span className="text-slate-400">
                          (worth {formatRupee(offer.freePrice)})
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDelete(offer.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Remove offer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={requestClose}
            className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !buyFoodId || !freeFoodId || Boolean(existing)}
            onClick={() => onSave(buyFoodId, freeFoodId)}
            className="h-11 flex-[1.4] rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Offer"}
          </button>
        </div>
      </div>
    </div>
  );
}
