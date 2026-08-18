import { useEffect, useMemo, useRef, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import { ChevronDown, Search, X } from "lucide-react";
import Swal from "sweetalert2";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import {
  handleEnrollCsp,
  handleGetAllCustomers,
  handleGetCspEnrollments,
  handleUpdateCsp,
  type CspEnrollment,
} from "@/services/apiClient";

type CustomerOption = {
  _id: string;
  name?: string;
  mobile?: string;
  email?: string;
  membershipType?: string;
};

const enrollmentCustomerId = (row: CspEnrollment): string => {
  if (typeof row.customerId === "string" && row.customerId.trim()) {
    return row.customerId.trim();
  }
  if (
    row.customerId &&
    typeof row.customerId === "object" &&
    row.customerId._id
  ) {
    return String(row.customerId._id).trim();
  }
  if (row.customer?._id) return String(row.customer._id).trim();
  return "";
};

export default function CspScreen() {
  const [rows, setRows] = useState<CspEnrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [enrolledCustomerIds, setEnrolledCustomerIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">(
    "active",
  );
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const fetchRows = async () => {
    try {
      setLoading(true);
      const res = await handleGetCspEnrollments({ status: statusFilter });
      const list = Array.isArray(res?.enrollments)
        ? res.enrollments
        : Array.isArray(res?.csps)
          ? res.csps
          : [];
      setRows(list);
    } catch (error) {
      console.error("Failed to load CSP:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [statusFilter]);

  useEffect(() => {
    if (!showEnroll) return;

    let cancelled = false;
    (async () => {
      try {
        setLoadingCustomers(true);
        const [customerRes, enrollmentRes] = await Promise.all([
          handleGetAllCustomers(),
          handleGetCspEnrollments({ status: "all" }),
        ]);

        if (cancelled) return;

        const enrollmentList = Array.isArray(enrollmentRes?.enrollments)
          ? enrollmentRes.enrollments
          : Array.isArray(enrollmentRes?.csps)
            ? enrollmentRes.csps
            : [];

        const enrolledIds = new Set(
          enrollmentList
            .map((row) => enrollmentCustomerId(row))
            .filter(Boolean),
        );
        setEnrolledCustomerIds(enrolledIds);

        const list = Array.isArray(customerRes?.customers)
          ? customerRes.customers
          : [];
        setCustomers(
          list
            .filter(
              (c: any) =>
                String(c.membershipType || "")
                  .trim()
                  .toLowerCase() === "premium",
            )
            .map((c: any) => ({
              _id: String(c._id),
              name: c.name,
              mobile: c.mobile,
              email: c.email,
              membershipType: c.membershipType,
            })),
        );
      } catch (error) {
        console.error("Failed to load customers:", error);
        if (!cancelled) {
          setCustomers([]);
          setEnrolledCustomerIds(new Set());
        }
      } finally {
        if (!cancelled) setLoadingCustomers(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showEnroll]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [dropdownOpen]);

  const availableCustomers = useMemo(
    () =>
      customers.filter((customer) => !enrolledCustomerIds.has(customer._id)),
    [customers, enrolledCustomerIds],
  );

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) return availableCustomers;
    return availableCustomers.filter((customer) => {
      const name = String(customer.name || "").toLowerCase();
      const mobile = String(customer.mobile || "").toLowerCase();
      const email = String(customer.email || "").toLowerCase();
      return (
        name.includes(term) || mobile.includes(term) || email.includes(term)
      );
    });
  }, [availableCustomers, customerSearch]);

  const selectedCustomer = useMemo(
    () =>
      availableCustomers.find((customer) => customer._id === selectedCustomerId) ||
      null,
    [availableCustomers, selectedCustomerId],
  );

  const closeEnrollModal = () => {
    setShowEnroll(false);
    setSelectedCustomerId("");
    setCustomerSearch("");
    setDropdownOpen(false);
  };

  const handleSelectCustomer = (customer: CustomerOption) => {
    setSelectedCustomerId(customer._id);
    setCustomerSearch(
      `${customer.name || "Customer"}${
        customer.mobile ? ` (${customer.mobile})` : ""
      } · Premium`,
    );
    setDropdownOpen(false);
  };

  const clearSelectedCustomer = () => {
    setSelectedCustomerId("");
    setCustomerSearch("");
    setDropdownOpen(true);
  };

  const handleEnroll = async () => {
    if (!selectedCustomerId) {
      Swal.fire("Customer required", "Select a customer to enroll.", "warning");
      return;
    }
    try {
      setEnrolling(true);
      const res = await handleEnrollCsp({ customerId: selectedCustomerId });
      if (!res?.success) {
        throw new Error(res?.message || "Enrollment failed");
      }
      Swal.fire(
        "Enrolled",
        res.message || "CSP seller enrolled (Customer + Vendor linked).",
        "success",
      );
      closeEnrollModal();
      await fetchRows();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to enroll CSP seller.";
      Swal.fire("Error", msg, "error");
    } finally {
      setEnrolling(false);
    }
  };

  const toggleStatus = async (row: CspEnrollment) => {
    const next = row.status === "active" ? "inactive" : "active";
    try {
      await handleUpdateCsp(row._id, { status: next });
      await fetchRows();
    } catch (error: any) {
      Swal.fire(
        "Error",
        error?.response?.data?.message || "Failed to update status.",
        "error",
      );
    }
  };

  const columns = useMemo<MRT_ColumnDef<CspEnrollment>[]>(
    () => [
       {
        id: "customer",
        header: "Customer",
        Cell: ({ row }) =>
          row.original.customer?.name || row.original.displayName || "—",
      },
      // {
      //   accessorKey: "label",
      //   header: "CSP Label",
      //   Cell: ({ row }) => (
      //     <span className="font-semibold text-slate-800">
      //       {row.original.label ||
      //         `${row.original.displayName || row.original.customer?.name || "Seller"}`}
      //     </span>
      //   ),
      // },
      {
        accessorKey: "mobile",
        header: "Mobile",
        Cell: ({ row }) =>
          row.original.mobile ||
          row.original.customer?.mobile ||
          row.original.vendor?.mobile ||
          "—",
      },
     
      {
        id: "vendor",
        header: "Linked Vendor",
        Cell: ({ row }) => row.original.vendor?.name || "—",
      },
      {
        accessorKey: "sailorSharePercent",
        header: "Seller %",
        Cell: ({ cell }) => `${Number(cell.getValue() ?? 70)}%`,
      },
      {
        accessorKey: "status",
        header: "Status",
        Cell: ({ cell }) => {
          const status = String(cell.getValue() || "active");
          return (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {status}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        Cell: ({ row }) => (
          <Can anyOf={[PERMISSIONS.CSP_WRITE, PERMISSIONS.CUSTOMER_UPDATE]}>
            <button
              type="button"
              onClick={() => toggleStatus(row.original)}
              className="rounded bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
            >
              {row.original.status === "active" ? "Deactivate" : "Activate"}
            </button>
          </Can>
        ),
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: rows,
    state: { isLoading: loading },
    enableColumnActions: false,
    enableDensityToggle: false,
    initialState: { density: "compact" },
  });

  return (
    <div className="min-w-0 space-y-4 p-1 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Customer Seller Program (CSP)
          </h1>
          <p className="text-sm text-slate-500">
            Enroll Premium customers as sellers. A vendor record is linked
            automatically. CSP products credit 70% to the seller wallet on invoice.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "active" | "inactive" | "all")
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
          <Can anyOf={[PERMISSIONS.CSP_WRITE, PERMISSIONS.CUSTOMER_CREATE]}>
            <button
              type="button"
              onClick={() => setShowEnroll(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Enroll Seller
            </button>
          </Can>
        </div>
      </div>

      <MaterialReactTable table={table} />

      {showEnroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">
              Enroll CSP Seller
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Only <span className="font-medium text-slate-700">Premium</span>{" "}
              members can become CSP sellers. Already enrolled sellers are hidden
              from this list.
            </p>

            <label className="mt-4 mb-1 block text-sm font-medium text-slate-700">
              Premium Customer *
            </label>
            <div ref={searchWrapRef} className="relative">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setDropdownOpen(true);
                    if (selectedCustomerId) setSelectedCustomerId("");
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder="Search by name, mobile, or email..."
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-16 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  autoComplete="off"
                />
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  {(selectedCustomerId || customerSearch) && (
                    <button
                      type="button"
                      onClick={clearSelectedCustomer}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="Clear"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </div>
              </div>

              {dropdownOpen && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                  {loadingCustomers ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Loading Premium customers…
                    </div>
                  ) : filteredCustomers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      {availableCustomers.length === 0
                        ? "No available Premium customers to enroll."
                        : "No matches for your search."}
                    </div>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <button
                        key={customer._id}
                        type="button"
                        onClick={() => handleSelectCustomer(customer)}
                        className={`flex w-full flex-col border-b border-slate-50 p-3 text-left last:border-0 hover:bg-slate-50 ${
                          selectedCustomerId === customer._id
                            ? "bg-blue-50"
                            : ""
                        }`}
                      >
                        <span className="text-sm font-semibold text-slate-800">
                          {customer.name || "Customer"}
                        </span>
                        <span className="text-xs text-slate-500">
                          {customer.mobile || "No mobile"}
                          {customer.email ? ` · ${customer.email}` : ""} · Premium
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedCustomer && (
              <p className="mt-2 text-xs text-emerald-700">
                Selected: {selectedCustomer.name}
                {selectedCustomer.mobile
                  ? ` (${selectedCustomer.mobile})`
                  : ""}
              </p>
            )}

            {!loadingCustomers && availableCustomers.length === 0 && (
              <p className="mt-2 text-xs text-amber-600">
                {customers.length === 0
                  ? "No Premium customers found. Activate Premium membership first, then enroll."
                  : "All Premium customers are already enrolled as CSP sellers."}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEnrollModal}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                disabled={enrolling}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEnroll}
                disabled={enrolling || !selectedCustomerId}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {enrolling ? "Enrolling…" : "Enroll"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
