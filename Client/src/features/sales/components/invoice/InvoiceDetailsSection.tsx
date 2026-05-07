import { CalendarDays, PhoneIcon, Search } from "lucide-react";

type CustomerOption = {
  _id: string;
  name: string;
  mobile: string;
  companyName?: string;
};

type Props = {
  customer: string;
  phone: string;
  customerOptions: CustomerOption[];
  loadingCustomers: boolean;
  customerDropdownOpen: boolean;
  invoiceDate: string;
  dueDate?: string;
  dueDateMin?: string;
  salesPerson: string;
  dateLabel?: string;
  selectorLabel?: string;
  createLabel?: string;
  phoneLabel?: string;
  searchPlaceholder?: string;
  showDueDate?: boolean;
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
  customerOptions,
  loadingCustomers,
  customerDropdownOpen,
  invoiceDate,
  dueDate,
  dueDateMin,
  salesPerson,
  dateLabel,
  selectorLabel,
  createLabel,
  phoneLabel,
  searchPlaceholder,
  showDueDate = true,
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
            {selectorLabel || "Select Customer"}
          </label>
          <button
            type="button"
            onClick={onOpenCreateCustomer}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            + {createLabel || "Create Customer"}
          </button>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={customer}
            onChange={(e) => onCustomerChange(e.target.value)}
            onFocus={onOpenCustomerDropdown}
            onBlur={() => {
              window.setTimeout(() => onCloseCustomerDropdown(), 150);
            }}
            placeholder={searchPlaceholder || "Search customer by name, company, GSTIN..."}
            className={`${inputStyle} pl-9`}
          />
        </div>
        {customerDropdownOpen && !!customerOptions.length && (  
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
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        {customerDropdownOpen && !customerOptions.length && customer.trim() && !loadingCustomers && (
          <p className="mt-2 text-xs text-gray-500">No customers found.</p>
        )}
        {customerDropdownOpen && loadingCustomers && (
          <p className="mt-2 text-xs text-gray-500">Loading customers...</p>
        )}
        <div>
          <label className="mb-1 mt-3 block text-xs font-semibold text-gray-600">
            {phoneLabel || "Customer Phone"}
          </label>
          <div className="relative">
            <PhoneIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="Enter customer phone number"
            className={`${inputStyle} pl-9`}
            />
          </div>
        </div>
      </div>
      <div className="lg:col-span-2">
        <label className="mb-1 block text-xs font-semibold text-gray-600">{dateLabel || "Invoice Date"}</label>
        <div className="relative">
          <CalendarDays size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => onInvoiceDateChange(e.target.value)}
            className={inputStyle}
          />
        </div>
      </div>
      {showDueDate && (
        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-gray-600">Due Date</label>
          <input
            type="date"
            value={dueDate ?? ""}
            min={dueDateMin}
            onChange={(e) => onDueDateChange?.(e.target.value)}
            className={inputStyle}
          />
        </div>
      )}
      <div className={showDueDate ? "lg:col-span-4" : "lg:col-span-6"}>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Sales Person</label>
        <input
          value={salesPerson}
          readOnly
          disabled
          className={`${inputStyle} cursor-not-allowed bg-gray-100 text-gray-500`}
        />
      </div>
    </div>
  );
}
