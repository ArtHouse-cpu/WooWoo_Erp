import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Copy,
  Gift,
  Loader2,
  ScanLine,
  Store,
} from "lucide-react";
import {
  handleGetPublicGiftCard,
  type PublicGiftCard as PublicGiftCardType,
} from "@/services/apiClient";

const formatINR = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatDate = (key: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || "");
  if (!m) return "—";
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString(
    "en-IN",
    { day: "2-digit", month: "short", year: "numeric" },
  );
};

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  Used: {
    title: "This gift card has been fully used",
    body: "There is no balance left on this card.",
  },
  Expired: {
    title: "This gift card has expired",
    body: "It can no longer be redeemed. Please contact the store if you think this is a mistake.",
  },
  Cancelled: {
    title: "This gift card is no longer valid",
    body: "It has been cancelled by the store.",
  },
};

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; card: PublicGiftCardType };

const PublicGiftCard = () => {
  const { token = "" } = useParams<{ token: string }>();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    const previousTitle = document.title;
    document.title = "Your Gift Card";
    return () => {
      meta.remove();
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    handleGetPublicGiftCard(token, controller.signal)
      .then((data) => setState({ kind: "ready", card: data.giftCard }))
      .catch((error: unknown) => {
        if ((error as { code?: string })?.code === "ERR_CANCELED") return;
        const err = error as {
          response?: { status?: number; data?: { message?: string } };
        };
        setState({
          kind: "error",
          message:
            err?.response?.data?.message ||
            "We couldn't load this gift card. Please check your connection and try again.",
        });
      });
    return () => controller.abort();
  }, [token]);

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-slate-950 via-indigo-950 to-violet-950 px-4 py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-violet-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        {state.kind === "loading" && (
          <div className="flex flex-col items-center gap-3 text-white/80">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-sm">Opening your gift card…</p>
          </div>
        )}

        {state.kind === "error" && (
          <div className="rounded-3xl bg-white p-8 text-center shadow-2xl">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle size={26} />
            </span>
            <h1 className="mt-4 text-lg font-bold text-gray-900">Gift card unavailable</h1>
            <p className="mt-2 text-sm text-gray-500">{state.message}</p>
          </div>
        )}

        {state.kind === "ready" && (
          <GiftCardView
            card={state.card}
            copied={copied}
            onCopy={() => handleCopy(state.card.code)}
          />
        )}

        <p className="mt-6 text-center text-[11px] text-white/40">Powered by WooWoo</p>
      </div>
    </div>
  );
};

const GiftCardView = ({
  card,
  copied,
  onCopy,
}: {
  card: PublicGiftCardType;
  copied: boolean;
  onCopy: () => void;
}) => {
  const inactive = STATUS_COPY[card.status];

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="px-6 pt-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
          <Gift size={22} />
        </span>
        <h1 className="mt-3 text-xl font-bold text-gray-900">
          {card.usable ? "You've received a gift card!" : "Gift card"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{card.name}</p>
      </div>

      {/* Card visual */}
      <div className="px-6 pt-5">
        <div
          className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-xl ${
            card.usable
              ? "bg-linear-to-br from-slate-900 via-indigo-950 to-violet-900"
              : "bg-linear-to-br from-zinc-600 via-zinc-700 to-zinc-800 grayscale"
          }`}
        >
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-white/5" />

          <div className="relative flex items-start justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
              WooWoo Gift Card
            </p>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                card.usable ? "bg-emerald-400/20 text-emerald-200" : "bg-white/15 text-white/80"
              }`}
            >
              {card.status}
            </span>
          </div>

          <div className="relative mt-6">
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/60">
              {card.usable ? "Available Balance" : "Card Value"}
            </p>
            <p className="mt-0.5 text-4xl font-extrabold tracking-tight">
              {formatINR(card.usable ? card.currentBalance : card.initialAmount)}
            </p>
          </div>

          <div className="relative mt-6 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-white/60">Code</p>
              <p className="truncate font-mono text-base font-semibold tracking-widest">
                {card.code}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] uppercase tracking-wider text-white/60">Valid Till</p>
              <p className="text-sm font-semibold">{formatDate(card.expiryDate)}</p>
            </div>
          </div>
        </div>
      </div>

      {card.usable ? (
        <>
          <div className="px-6 pt-4">
            <button
              type="button"
              onClick={onCopy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-black text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Code copied" : "Copy gift card code"}
            </button>
          </div>

          <div className="px-6 pb-6 pt-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              How to redeem
            </h2>
            <ol className="mt-3 space-y-3">
              {[
                { icon: Store, text: "Visit the store and pick what you'd like." },
                { icon: ScanLine, text: "At checkout, show this page or tell the cashier your code." },
                {
                  icon: CalendarClock,
                  text: `Use it before ${formatDate(card.expiryDate)}. Any unused balance goes to your store wallet.`,
                },
              ].map(({ icon: Icon, text }, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <Icon size={15} />
                  </span>
                  <p className="pt-1.5 text-sm text-gray-700">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </>
      ) : (
        <div className="px-6 pb-6 pt-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center">
            <p className="text-sm font-semibold text-gray-900">
              {inactive?.title ?? "This gift card can't be used"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {inactive?.body ?? "Please contact the store for help."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicGiftCard;
