import type { FinanceSummary } from "./financeSummary";

type Props = FinanceSummary & {
  totalHint: string;
  paidHint: string;
  pendingHint: string;
};

const formatInr = (value: number) =>
  `₹${Math.round(value).toLocaleString("en-IN")}`;

export function FinanceKpiCards({
  total,
  paid,
  pending,
  totalHint,
  paidHint,
  pendingHint,
}: Props) {
  const cards = [
    {
      title: "Total",
      value: total,
      hint: totalHint,
      className: "border-slate-200 bg-white text-slate-900",
    },
    {
      title: "Paid",
      value: paid,
      hint: paidHint,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    {
      title: "Pending",
      value: pending,
      hint: pendingHint,
      className: "border-orange-200 bg-orange-50 text-orange-700",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {cards.map((card) => (
        <span
          key={card.title}
          title={card.hint}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 ${card.className}`}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{card.title}</span>
          <span className="text-xs font-bold tabular-nums">{formatInr(card.value)}</span>
        </span>
      ))}
    </div>
  );
}
