import { useEffect, useMemo, useState } from "react";
import { X, Phone, Mail, Building2, Wallet, CalendarDays, Crown, Receipt } from "lucide-react";
import {
  handleGetCustomer360,
  type Customer360Booking,
  type Customer360Membership,
  type Customer360Purchase,
  type Customer360Response,
  type Customer360TimelineItem,
  type Customer360WalletTx,
} from "@/services/apiClient";

type Tab = "overview" | "purchases" | "bookings" | "memberships" | "wallet" | "timeline";
type CreatedSort = "newest" | "oldest";
type DateRange = "" | "today" | "this-week" | "this-month" | "last-month" | "this-year" | "last-year";

const tabs: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "purchases", label: "Shopping" },
  { key: "bookings", label: "Bookings" },
  { key: "memberships", label: "Memberships" },
  { key: "wallet", label: "Wallet" },
  { key: "timeline", label: "Activity" },
];

const money = (value?: number | null) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const when = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const timeOf = (value?: string | null) => {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
};

const whenStamp = (dateValue?: string | null, timeValue?: string | null) => {
  const dateText = when(dateValue || timeValue);
  if (dateText === "—") return "—";
  const clock = timeOf(timeValue || dateValue);
  return clock ? `${dateText}, ${clock}` : dateText;
};

const monthOf = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

const rangeBounds = (range: DateRange) => {
  if (!range) return null;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  if (range === "today") return { start, end };
  if (range === "this-week") {
    const mondayOffset = (now.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
    return { start, end };
  }
  if (range === "this-month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }
  if (range === "last-month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    };
  }
  if (range === "this-year") {
    return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) };
  }
  return {
    start: new Date(now.getFullYear() - 1, 0, 1),
    end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
  };
};

const inDateRange = (value: string | null | undefined, range: DateRange) => {
  const bounds = rangeBounds(range);
  if (!bounds) return true;
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= bounds.start && date <= bounds.end;
};

const createdStamp = (value?: string | null) => {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
};

function sortByCreated<T>(rows: T[], pick: (row: T) => string | null | undefined, order: CreatedSort) {
  return [...rows].sort((left, right) => {
    const diff = createdStamp(pick(left)) - createdStamp(pick(right));
    return order === "oldest" ? diff : -diff;
  });
}

export default function Customer360Modal({
  customerId,
  customerName,
  onClose,
}: {
  customerId: string;
  customerName?: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [sort, setSort] = useState<CreatedSort>("newest");
  const [dateRange, setDateRange] = useState<DateRange>("");
  const [sale, setSale] = useState<Customer360Purchase | null>(null);
  const [data, setData] = useState<Customer360Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void handleGetCustomer360(customerId, controller.signal)
      .then((response) => setData(response))
      .catch((err: { name?: string; response?: { data?: { message?: string } } }) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(err?.response?.data?.message || "Could not load this customer.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [customerId]);

  const customer = data?.customer;
  const summary = data?.summary;
  const purchases = useMemo(
    () =>
      sortByCreated(
        (data?.purchases || []).filter((row) => inDateRange(row.invoiceDate || row.createdAt, dateRange)),
        (row) => row.createdAt || row.invoiceDate,
        sort,
      ),
    [data?.purchases, sort, dateRange],
  );
  const bookings = useMemo(
    () =>
      sortByCreated(
        (data?.bookings || []).filter((row) => inDateRange(row.bookingDate || row.createdAt, dateRange)),
        (row) => row.createdAt || row.bookingDate,
        sort,
      ),
    [data?.bookings, sort, dateRange],
  );
  const currentMembership = data?.summary?.currentMembership || null;
  const memberships = useMemo(() => {
    const filtered = sortByCreated(
      (data?.memberships || []).filter((row) => inDateRange(row.startDate || row.invoiceDate || row.createdAt, dateRange)),
      (row) => row.createdAt || row.startDate,
      sort,
    );
    if (currentMembership && !filtered.some((row) => row.id === currentMembership.id)) {
      return [currentMembership, ...filtered];
    }
    return filtered;
  }, [data?.memberships, sort, dateRange, currentMembership]);
  const walletRows = useMemo(
    () =>
      sortByCreated(
        (data?.walletTransactions || []).filter((row) => inDateRange(row.createdAt, dateRange)),
        (row) => row.createdAt,
        sort,
      ),
    [data?.walletTransactions, sort, dateRange],
  );
  const timeline = useMemo(
    () =>
      sortByCreated(
        (data?.timeline || []).filter((row) => inDateRange(row.createdAt || row.at, dateRange)),
        (row) => row.createdAt || row.at,
        sort,
      ),
    [data?.timeline, sort, dateRange],
  );

  const openSales = purchases.filter((row) => !["cancelled", "draft"].includes(row.status.toLowerCase()));
  const openBookings = bookings.filter((row) => !["cancelled", "draft", "expired"].includes(row.status.toLowerCase()));
  const cards = [
    {
      label: "Shopping",
      value: money(openSales.reduce((sum, row) => sum + row.amount, 0)),
      hint: `${openSales.length} bills`,
    },
    {
      label: "Due on bills",
      value: money(openSales.reduce((sum, row) => sum + row.dueAmount, 0)),
      hint: "Still payable",
    },
    {
      label: "Bookings",
      value: money(openBookings.reduce((sum, row) => sum + row.amount, 0)),
      hint: `${openBookings.length} bookings`,
    },
    {
      label: "Memberships",
      value: String(memberships.filter((row) => !["cancelled", "draft", "expired"].includes(row.status.toLowerCase())).length),
      hint:
        currentMembership?.status === "active"
          ? currentMembership.plan || customer?.membershipType || "none"
          : "none",
    },
    {
      label: "Wallet",
      value: money(summary?.walletBalance),
      hint: `Credit ${money(walletRows.filter((row) => row.type === "credit").reduce((sum, row) => sum + row.amount, 0))} · Debit ${money(walletRows.filter((row) => row.type === "debit").reduce((sum, row) => sum + row.amount, 0))}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div className="flex h-dvh w-full max-w-6xl flex-col overflow-hidden bg-[#F6F7FB] sm:h-[92vh] sm:rounded-2xl sm:shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-600">Customer 360 View</p>
            <h2 className="truncate text-lg font-bold text-slate-900">{customer?.name || customerName || "Customer"}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{customer?.companyName || "No company"}</span>
              {customer?.mobile ? (
                <a href={`tel:${customer.mobile}`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                  <Phone size={12} /> {customer.mobile}
                </a>
              ) : null}
              {customer?.email ? (
                <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                  <Mail size={12} /> {customer.email}
                </a>
              ) : null}
            </div>
          </div>
          <button type="button" onClick={onClose} className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
            <X size={14} /> Close
          </button>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm font-semibold ${tab === item.key ? "border-violet-600 text-violet-700" : "border-transparent text-slate-500"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
          <p className="text-xs font-semibold text-slate-500">
            {dateRange ? "Showing the selected period" : "Showing all dates"}
          </p>
          <div className="flex flex-wrap gap-2">
            <select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value as DateRange)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">All dates</option>
              <option value="today">Today</option>
              <option value="this-week">This week</option>
              <option value="this-month">This month</option>
              <option value="last-month">Last month</option>
              <option value="this-year">This year</option>
              <option value="last-year">Last year</option>
            </select>
            {tab !== "overview" ? (
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as CreatedSort)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="newest">Newest created</option>
                <option value="oldest">Oldest created</option>
              </select>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {loading ? <p className="text-sm text-slate-500">Loading customer…</p> : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          {!loading && data && tab === "overview" ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {cards.map((card) => (
                  <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{card.label}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{card.value}</p>
                    <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
                  </article>
                ))}
              </div>
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Building2 size={16} /> Profile
                </h3>
                <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <Field label="Phone" value={customer?.mobile} />
                  <Field label="WhatsApp" value={customer?.whatsappNumber} />
                  <Field label="Email" value={customer?.email} />
                  <Field
                    label="Membership"
                    value={
                      currentMembership?.status === "active"
                        ? currentMembership.plan || customer?.membershipType || "none"
                        : "none"
                    }
                  />
                  <Field label="Company" value={customer?.companyName} />
                  <Field label="Referral" value={customer?.referralCode} />
                  <Field label="Created" value={whenStamp(customer?.createdAt)} />
                  <Field label="Address" value={[customer?.address, customer?.city, customer?.state, customer?.pincode].filter(Boolean).join(", ")} />
                </dl>
              </article>
              {currentMembership ? (
                <article className="rounded-2xl border border-violet-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-bold capitalize text-slate-900">
                      <Crown size={16} /> {currentMembership.plan || "Membership"}
                    </h3>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${currentMembership.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"}`}>
                      {currentMembership.status || "Active"}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <Field label="Start" value={whenStamp(currentMembership.startDate, currentMembership.createdAt)} />
                    <Field label="Expiry" value={currentMembership.term === "lifetime" ? "Lifetime" : when(currentMembership.endDate)} />
                    <Field label="Months" value={currentMembership.months ? String(currentMembership.months) : currentMembership.term === "lifetime" ? "Lifetime" : "—"} />
                    <Field label="Amount" value={money(currentMembership.amount)} />
                  </dl>
                </article>
              ) : null}
            </div>
          ) : null}

          {!loading && data && tab !== "overview" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              {tab === "purchases" ? <PurchaseList rows={purchases} onOpen={setSale} /> : null}
              {tab === "bookings" ? <BookingList rows={bookings} /> : null}
              {tab === "memberships" ? <MembershipList rows={memberships} /> : null}
              {tab === "wallet" ? <WalletList rows={walletRows} /> : null}
              {tab === "timeline" ? <TimelineList rows={timeline} /> : null}
            </section>
          ) : null}
        </div>
      </div>
      {sale ? <SaleDetail sale={sale} onClose={() => setSale(null)} /> : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="font-semibold text-slate-800">{value || "—"}</dd>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-slate-500">{text}</p>;
}

function PurchaseList({
  rows,
  onOpen,
}: {
  rows: Customer360Purchase[];
  onOpen: (row: Customer360Purchase) => void;
}) {
  if (!rows.length) return <Empty text="No product sales for this customer." />;
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((row) => (
        <li key={row.id}>
          <button type="button" onClick={() => onOpen(row)} className="flex w-full items-start justify-between gap-3 py-3 text-left text-sm hover:bg-violet-50/60">
            <div className="min-w-0">
              <p className="flex items-center gap-1 font-bold text-violet-700"><Receipt size={14} /> {row.code || "Invoice"}</p>
              <p className="mt-0.5 text-xs text-slate-600">
                {(row.items || []).map((item) => item.name).filter(Boolean).join(", ") || "No products"}
              </p>
              <p className="text-xs text-slate-500">
                {whenStamp(row.invoiceDate, row.createdAt)}
                {monthOf(row.invoiceDate) ? ` · ${monthOf(row.invoiceDate)}` : ""}
                {` · Discount ${money(row.discountTotal)}`}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-bold text-slate-900">{money(row.amount)}</p>
              <p className="text-xs text-slate-500">Paid {money(row.paidAmount)} · Due {money(row.dueAmount)}</p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function BookingList({ rows }: { rows: Customer360Booking[] }) {
  if (!rows.length) return <Empty text="No bookings for this customer." />;
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((row) => (
        <li key={`${row.kind}-${row.id}`} className="flex items-start justify-between gap-3 py-3 text-sm">
          <div>
            <p className="flex items-center gap-1 font-bold text-slate-900">
              <CalendarDays size={14} /> {row.title}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{row.kind}</span>
            </p>
            <p className="text-xs text-slate-500">
              {whenStamp(row.bookingDate, row.createdAt)}
              {row.startTime ? ` · ${row.startTime}${row.endTime ? `–${row.endTime}` : ""}` : ""}
              {row.status ? ` · ${row.status}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-900">{money(row.amount)}</p>
            <p className="text-xs text-slate-500">Paid {money(row.paidAmount)} · Due {money(row.dueAmount)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function MembershipList({ rows }: { rows: Customer360Membership[] }) {
  if (!rows.length) return <Empty text="No memberships for this customer." />;
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((row) => (
        <li key={row.id} className="flex items-start justify-between gap-3 py-3 text-sm">
          <div>
            <p className="flex items-center gap-1 font-bold capitalize text-slate-900">
              <Crown size={14} /> {row.plan || "Membership"}
              {row.current || row.code === "Current" ? (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-700">Current</span>
              ) : null}
            </p>
            <p className="text-xs text-slate-500">
              {row.code ? `${row.code} · ` : ""}
              {whenStamp(row.startDate || row.invoiceDate, row.createdAt)}
              {row.months ? ` · ${row.months} months` : row.term === "lifetime" ? " · Lifetime" : ""}
              {row.endDate ? ` – ${when(row.endDate)}` : ""}
              {row.status ? ` · ${row.status}` : ""}
            </p>
          </div>
          <p className="font-bold text-slate-900">{money(row.amount)}</p>
        </li>
      ))}
    </ul>
  );
}

function WalletList({ rows }: { rows: Customer360WalletTx[] }) {
  if (!rows.length) return <Empty text="No wallet credits or debits in this period." />;
  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">Wallet only. Credits add money. Debits spend it. Product sales stay in Sell Product and Activity.</p>
      <ul className="divide-y divide-slate-100">
      {rows.map((row) => (
        <li key={row.id} className="flex items-start justify-between gap-3 py-3 text-sm">
          <div>
            <p className="flex items-center gap-1 font-bold capitalize text-slate-900"><Wallet size={14} /> {row.type} · {row.reason || row.walletType || "Wallet"}</p>
            <p className="text-xs text-slate-500">
              {whenStamp(row.createdAt)}
              {row.note ? ` · ${row.note}` : ""}
              {row.by ? ` · ${row.by}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className={`font-bold ${row.type === "debit" ? "text-rose-600" : "text-emerald-700"}`}>
              {row.type === "debit" ? "−" : "+"}{money(row.amount)}
            </p>
            <p className="text-xs text-slate-500">Balance {money(row.balanceAfter)}</p>
          </div>
        </li>
      ))}
    </ul>
    </div>
  );
}
function TimelineList({ rows }: { rows: Customer360TimelineItem[] }) {
  if (!rows.length) return <Empty text="No activity in this period." />;
  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">
        Activity is the history. A product sale, a payment, a membership, a booking, and a wallet credit or debit each show their own details.
      </p>
      <ol className="space-y-3">
        {rows.map((item) => (
          <li key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-violet-600">{activityLabel(item.type)}</p>
                <p className="text-sm font-bold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{whenStamp(item.createdAt || item.at, item.createdAt || item.at)}</p>
              </div>
              {item.amount ? <p className="shrink-0 text-sm font-bold text-slate-900">{money(item.amount)}</p> : null}
            </div>
            <ActivityFacts item={item} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function activityLabel(type: string) {
  if (type === "sale") return "Product sale";
  if (type === "payment") return "Payment";
  if (type === "wallet") return "Wallet";
  if (type === "membership") return "Membership";
  if (type === "booking") return "Booking";
  return "Activity";
}

function ActivityFacts({ item }: { item: Customer360TimelineItem }) {
  if (item.type === "sale") {
    return (
      <p className="mt-1 text-xs text-slate-600">
        Products: {item.products?.length ? item.products.join(", ") : "—"}
        {` · Discount ${money(item.discount)}`}
        {` · Paid ${money(item.paidAmount)} · Due ${money(item.dueAmount)}`}
      </p>
    );
  }
  if (item.type === "payment") {
    return (
      <p className="mt-1 text-xs text-slate-600">
        Payment activity{item.paymentMode ? ` · ${item.paymentMode}` : ""}
        {item.detail ? ` · ${item.detail}` : ""}
      </p>
    );
  }
  if (item.type === "wallet") {
    return (
      <p className="mt-1 text-xs text-slate-600">
        {item.credit ? `Credit ${money(item.credit)}` : `Debit ${money(item.debit)}`}
        {item.detail ? ` · ${item.detail}` : ""}
      </p>
    );
  }
  if (item.type === "membership") {
    return (
      <p className="mt-1 text-xs text-slate-600">
        {item.months ? `${item.months} months` : "Lifetime"}
        {item.detail ? ` · ${item.detail}` : ""}
      </p>
    );
  }
  return item.detail ? <p className="mt-1 text-xs text-slate-600">{item.detail}</p> : null;
}

function SaleDetail({ sale, onClose }: { sale: Customer360Purchase; onClose: () => void }) {
  const discounts = [
    ["Line and bill discount", sale.discountTotal],
    ["Membership discount", sale.membershipDiscount],
    ["Coupon", sale.couponDiscount],
    ["Referral", sale.referralDiscount],
    ["Manual discount", sale.manualDiscount],
  ].filter(([, amount]) => Number(amount) > 0);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-600">Shopping</p>
            <h3 className="text-lg font-bold text-slate-900">{sale.code || "Invoice"}</h3>
            <p className="text-xs text-slate-500">
              {whenStamp(sale.invoiceDate, sale.createdAt)}
              {monthOf(sale.invoiceDate) ? ` · ${monthOf(sale.invoiceDate)}` : ""}
              {sale.membershipType ? ` · ${sale.membershipType}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
            Close
          </button>
        </div>

        <h4 className="mt-4 text-sm font-bold text-slate-900">Products</h4>
        <ul className="mt-2 divide-y divide-slate-100">
          {(sale.items || []).length === 0 ? <li className="py-2 text-sm text-slate-500">No products on this invoice.</li> : null}
          {(sale.items || []).map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex items-start justify-between gap-3 py-2 text-sm">
              <div>
                <p className="font-semibold text-slate-800">{item.name || "Product"}</p>
                <p className="text-xs text-slate-500">Qty {item.qty} · {money(item.unitPrice)} · Discount {money(item.discount)}</p>
              </div>
              <p className="font-semibold text-slate-900">{money(item.lineTotal)}</p>
            </li>
          ))}
        </ul>

        <h4 className="mt-4 text-sm font-bold text-slate-900">Discount</h4>
        {discounts.length === 0 ? <p className="mt-1 text-sm text-slate-500">No discount</p> : (
          <ul className="mt-1 space-y-1 text-sm text-slate-600">
            {discounts.map(([label, amount]) => (
              <li key={String(label)} className="flex justify-between">
                <span>{label}</span>
                <span>{money(Number(amount))}</span>
              </li>
            ))}
          </ul>
        )}

        <h4 className="mt-4 text-sm font-bold text-slate-900">Payment summary</h4>
        <ul className="mt-1 space-y-1 text-sm text-slate-600">
          <li className="flex justify-between"><span>Subtotal</span><span>{money(sale.subTotal)}</span></li>
          <li className="flex justify-between"><span>Bill total</span><span>{money(sale.amount)}</span></li>
          <li className="flex justify-between"><span>Cash</span><span>{money(sale.payment?.cash)}</span></li>
          <li className="flex justify-between"><span>UPI</span><span>{money(sale.payment?.upi)}</span></li>
          <li className="flex justify-between"><span>Card</span><span>{money(sale.payment?.card)}</span></li>
          <li className="flex justify-between"><span>Wallet</span><span>{money(sale.payment?.wallet)}</span></li>
          <li className="flex justify-between font-semibold text-slate-900"><span>Paid</span><span>{money(sale.paidAmount)}</span></li>
          <li className="flex justify-between font-semibold text-slate-900"><span>Due</span><span>{money(sale.dueAmount)}</span></li>
        </ul>
        {(sale.paymentHistory || []).length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs text-slate-500">
            {sale.paymentHistory.map((payment, index) => (
              <li key={`${payment.date}-${index}`}>
                Payment · {whenStamp(payment.date)} · {payment.mode || "—"} · {money(payment.amount)}
                {payment.receivedBy ? ` · ${payment.receivedBy}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
