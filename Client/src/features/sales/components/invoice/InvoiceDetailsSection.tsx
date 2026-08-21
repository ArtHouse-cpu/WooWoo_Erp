import { CalendarDays, PhoneIcon, Search, UserPlus } from "lucide-react";
import type { MembershipPlanPayload } from "@/services/apiClient";
import { getMembershipBadgeLabel } from "../../utils/membershipInvoiceUtils";
import MembershipBadge from "./MembershipBadge";

type CustomerOption = {
  _id: string;
  name: string;
  mobile: string;
  companyName?: string;
  membershipType?: string;
  membershipPlanId?: string;
};

type Props = {
  customer: string;
  phone: string;
  membership?: string;
  membershipPlanId?: string | null;
  membershipPlans?: MembershipPlanPayload[];
  customerOptions: CustomerOption[];
  loadingCustomers: boolean;
  customerDropdownOpen: boolean;
  invoiceDate: string;
  dueDate?: string;
  dueDateMin?: string;
  salesPerson: string;
  dateLabel?: string;
  billedByLabel?: string;
  selectorLabel?: string;
  createLabel?: string;
  phoneLabel?: string;
  searchPlaceholder?: string;
  showDueDate?: boolean;
  /** Section card title */
  sectionTitle?: string;
  /** View mode: show locked invoice customer only (no search / create). */
  readOnly?: boolean;
  /** PIN-verified billing staff (Billed By / invoiceBy). Shown when provided. */
  billBy?: string;
  /** When true, renders without its own card chrome (for merged panels). */
  embedded?: boolean;
  onCustomerChange: (value: string) => void;
  onPickCustomer: (customer: CustomerOption) => void;
  onOpenCreateCustomer: () => void;
  onOpenCustomerDropdown: () => void;
  onCloseCustomerDropdown: () => void;
  onPhoneChange: (value: string) => void;
  onInvoiceDateChange: (value: string) => void;
  onDueDateChange?: (value: string) => void;
};

const inputStyle =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelStyle = "mb-1.5 block text-xs font-semibold text-slate-600";

export default function InvoiceDetailsSection({
  customer,
  phone,
  membership,
  membershipPlanId = null,
  membershipPlans = [],
  customerOptions,
  loadingCustomers,
  customerDropdownOpen,
  invoiceDate,
  dueDate,
  dueDateMin,
  salesPerson,
  dateLabel,
  billedByLabel,
  selectorLabel,
  createLabel,
  phoneLabel,
  searchPlaceholder,
  showDueDate = true,
  sectionTitle = "Invoice Details",
  readOnly = false,
  billBy,
  embedded = false,
  onCustomerChange,
  onPickCustomer,
  onOpenCreateCustomer,
  onOpenCustomerDropdown,
  onCloseCustomerDropdown,
  onPhoneChange,
  onInvoiceDateChange,
  onDueDateChange,
}: Props) {
  return (
    <div
      className={
        embedded
          ? "space-y-3"
          : "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-sm font-semibold text-slate-800">
            {sectionTitle}
          </h2>
          {/* Tiny Created By / Billed By — desktop only */}
          <div className="hidden items-center gap-2 sm:flex">
            <span className="inline-flex max-w-[10rem] items-center gap-1 truncate rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500 ring-1 ring-inset ring-slate-200">
              <span className="shrink-0 text-slate-400">By</span>
              <span className="truncate font-medium text-slate-600">
                {salesPerson || "—"}
              </span>
            </span>
            {billBy !== undefined && (
              <span
                className="inline-flex max-w-[10rem] items-center gap-1 truncate rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500 ring-1 ring-inset ring-slate-200"
                title="Staff verified via billing PIN at checkout (invoiceBy)"
              >
                <span className="shrink-0 text-slate-400">
                  {billedByLabel || "Billed"}
                </span>
                <span className="truncate font-medium text-slate-600">
                  {billBy || "—"}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-12 lg:gap-4">
        <div className="relative col-span-1 min-w-0 lg:col-span-4">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className="block text-xs font-semibold text-slate-600">
              {readOnly ? "Customer" : selectorLabel || "Select Customer"}
            </label>
            {!readOnly && (
              <button
                type="button"
                onClick={onOpenCreateCustomer}
                className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-100 transition hover:bg-blue-100"
              >
                <UserPlus size={12} />
                {createLabel || "Customer"}
              </button>
            )}
          </div>
          <div className="relative">
            {!readOnly && (
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 sm:left-3.5"
              />
            )}
            <input
              value={customer}
              onChange={(e) => {
                if (readOnly) return;
                onCustomerChange(e.target.value);
              }}
              onFocus={() => {
                if (readOnly) return;
                onOpenCustomerDropdown();
              }}
              onBlur={() => {
                if (readOnly) return;
                window.setTimeout(() => onCloseCustomerDropdown(), 150);
              }}
              readOnly={readOnly}
              disabled={readOnly}
              placeholder={
                readOnly
                  ? "Customer on this invoice"
                  : searchPlaceholder || "Search customer…"
              }
              className={`${inputStyle} ${
                readOnly
                  ? "cursor-not-allowed bg-slate-50 text-slate-700"
                  : "pl-8 sm:pl-10"
              }`}
            />
          </div>
          {!readOnly && customerDropdownOpen && !!customerOptions.length && (
            <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg sm:right-auto sm:w-80">
              {customerOptions.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onMouseDown={() => onPickCustomer(item)}
                  className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-slate-50"
                >
                  <div className="min-w-0 truncate">
                    <div className="font-medium text-slate-800">
                      {item.name}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {item.mobile}
                      {item.companyName ? ` · ${item.companyName}` : ""}
                      {item.membershipType
                        ? ` · ${getMembershipBadgeLabel(
                            membershipPlans,
                            item.membershipType,
                            item.membershipPlanId,
                          )}`
                        : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {!readOnly &&
            customerDropdownOpen &&
            !customerOptions.length &&
            customer.trim() &&
            !loadingCustomers && (
              <p className="mt-2 text-xs text-slate-500">No customers found.</p>
            )}
          {!readOnly && customerDropdownOpen && loadingCustomers && (
            <p className="mt-2 text-xs text-slate-500">Loading customers…</p>
          )}
        </div>

        <div className="col-span-1 min-w-0 lg:col-span-4">
          <div className="mb-1.5 flex items-center justify-between gap-1">
            <label className="block text-xs font-semibold text-slate-600">
              {phoneLabel || "Phone"}
            </label>
            {membership ? (
              <div className="max-w-[50%] origin-right scale-90 sm:max-w-none sm:scale-100">
                <MembershipBadge
                  membershipType={membership}
                  membershipPlanId={membershipPlanId}
                  membershipPlans={membershipPlans}
                />
              </div>
            ) : null}
          </div>
          <div className="relative">
            <PhoneIcon
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 sm:left-3.5"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                if (readOnly) return;
                onPhoneChange(e.target.value);
              }}
              readOnly={readOnly}
              disabled={readOnly}
              placeholder="Phone"
              className={`${inputStyle} pl-8 sm:pl-10 ${
                readOnly ? "cursor-not-allowed bg-slate-50 text-slate-700" : ""
              }`}
            />
          </div>
        </div>

        <div className="col-span-1 lg:col-span-2">
          <label className={labelStyle}>
            {dateLabel || "Invoice Date"}
          </label>
          <div className="relative">
            <CalendarDays
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 sm:right-3"
            />
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => onInvoiceDateChange(e.target.value)}
              readOnly={readOnly}
              disabled={readOnly}
              className={`${inputStyle} pr-8 ${
                readOnly ? "cursor-not-allowed bg-slate-50" : ""
              }`}
            />
          </div>
        </div>

        {showDueDate ? (
          <div className="col-span-1 lg:col-span-2">
            <label className={labelStyle}>Due Date</label>
            <input
              type="date"
              value={dueDate ?? ""}
              min={dueDateMin}
              onChange={(e) => onDueDateChange?.(e.target.value)}
              readOnly={readOnly}
              disabled={readOnly}
              className={`${inputStyle} ${
                readOnly ? "cursor-not-allowed bg-slate-50" : ""
              }`}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
