import { CalendarDays, PhoneIcon, Search } from "lucide-react";
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
  /** View mode: show locked invoice customer only (no search / create). */
  readOnly?: boolean;
  /** PIN-verified billing staff (Billed By / invoiceBy). Shown when provided. */
  billBy?: string;
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
  "h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-blue-500";

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
  readOnly = false,
  billBy,
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
    <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:grid-cols-12">
      <div className="lg:col-span-4">
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs font-semibold text-gray-600">
            {readOnly ? "Customer" : selectorLabel || "Select Customer"}
          </label>
          {!readOnly && (
            <button
              type="button"
              onClick={onOpenCreateCustomer}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              + {createLabel || "Create Customer"}
            </button>
          )}
        </div>
        <div className="relative">
          {!readOnly && (
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
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
                : searchPlaceholder ||
                  "Search customer by name, company, GSTIN..."
            }
            className={`${inputStyle} ${readOnly ? "cursor-not-allowed bg-gray-100 text-gray-700" : "pl-9"}`}
          />
        </div>
        {!readOnly && customerDropdownOpen && !!customerOptions.length && (
          <div className="mt-2 max-h-44 overflow-y-auto rounded-md border border-gray-200">
            {customerOptions.map((item) => (
              <button
                key={item._id}
                type="button"
                onMouseDown={() => onPickCustomer(item)}
                className="flex w-full items-center justify-between border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-gray-50"
              >
                <div className="truncate">
                  <div className="font-medium text-gray-800">{item.name}</div>
                  <div className="text-xs text-gray-500">
                    {item.mobile}
                    {item.companyName ? ` • ${item.companyName}` : ""}
                    {item.membershipType
                      ? ` • ${getMembershipBadgeLabel(
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
            <p className="mt-2 text-xs text-gray-500">No customers found.</p>
          )}
        {!readOnly && customerDropdownOpen && loadingCustomers && (
          <p className="mt-2 text-xs text-gray-500">Loading customers...</p>
        )}
        <div>
          <div className="mb-1 mt-3 flex items-center justify-between">
            <label className="block text-xs font-semibold text-gray-600">
              {phoneLabel || "Customer Phone"}
            </label>
            {membership && (
              <MembershipBadge
                membershipType={membership}
                membershipPlanId={membershipPlanId}
                membershipPlans={membershipPlans}
              />
            )}
          </div>
          <div className="relative">
            <PhoneIcon
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
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
              placeholder="Enter customer phone number"
              className={`${inputStyle} pl-9 ${readOnly ? "cursor-not-allowed bg-gray-100 text-gray-700" : ""}`}
            />
          </div>
        </div>
      </div>
      <div className="lg:col-span-2">
        <label className="mb-1 block text-xs font-semibold text-gray-600">
          {dateLabel || "Invoice Date"}
        </label>
        <div className="relative">
          <CalendarDays
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => onInvoiceDateChange(e.target.value)}
            readOnly={readOnly}
            disabled={readOnly}
            className={`${inputStyle} ${readOnly ? "cursor-not-allowed bg-gray-100" : ""}`}
          />
        </div>
      </div>
      {showDueDate && (
        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Due Date
          </label>
          <input
            type="date"
            value={dueDate ?? ""}
            min={dueDateMin}
            onChange={(e) => onDueDateChange?.(e.target.value)}
            readOnly={readOnly}
            disabled={readOnly}
            className={`${inputStyle} ${readOnly ? "cursor-not-allowed bg-gray-100" : ""}`}
          />
        </div>
      )}
      <div
        className={
          billBy
            ? showDueDate
              ? "lg:col-span-2"
              : "lg:col-span-3"
            : showDueDate
              ? "lg:col-span-4"
              : "lg:col-span-6"
        }
      >
        <label className="mb-1 block text-xs font-semibold text-gray-600">
          Created By
        </label>
        <input
          value={salesPerson}
          readOnly
          disabled
          className={`${inputStyle} cursor-not-allowed bg-gray-100 text-gray-500`}
        />
      </div>
      {billBy !== undefined && (
        <div className={showDueDate ? "lg:col-span-2" : "lg:col-span-3"}>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            {billedByLabel || "Billed By"}
          </label>
          <input
            value={billBy || "—"}
            readOnly
            disabled
            className={`${inputStyle} cursor-not-allowed bg-gray-100 text-gray-500`}
            title="Staff verified via billing PIN at checkout (invoiceBy)"
          />
        </div>
      )}
    </div>
  );
}
