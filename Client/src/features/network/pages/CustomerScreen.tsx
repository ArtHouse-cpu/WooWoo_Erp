import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_PaginationState,
  type MRT_Row,
} from "material-react-table";
import { Eye, FileSpreadsheet, Loader2, MoreVertical, Phone, Search, SquarePen, Trash2, X } from "lucide-react";
import Swal from "sweetalert2";
import LedgerModal from "@/features/network/components/LedgerModal";
import CreateCustomerModal from "@/features/network/components/CreateCustomerModal";
import ImportCustomersModal from "@/features/network/components/ImportCustomersModal";
import UpdateCustomerModal from "@/features/network/components/UpdateCustomerModal";
import CustomerDetailsModal from "@/features/network/components/CustomerDetailsModal";
import Customer360Modal from "@/features/network/components/Customer360Modal";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import {
  customerPayloadToFormData,
  handleCreateCustomer,
  handleDeleteCustomer,
  handleGetCustomers,
  handleImportCustomers,
  handleUpdateCustomer,
  type CustomerImportRow,
  type CustomerPayload,
} from "@/services/apiClient";
import { useAppSelector } from "@/store/hooks";
import { billingMembershipFromCustomer } from "@/features/sales/utils/membershipInvoiceUtils";

const PAGE_SIZE_DEFAULT = 50;

type CustomerRow = {
  _id?: string;
  name?: string;
  mobile?: string;
  membershipType?: string;
  membershipExpired?: boolean;
  membershipStartDate?: string;
  membershipEndDate?: string;
  whatsappNumber?: string;
  email?: string;
  companyName?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  createdAt?: string;
  createdBy?: { m_staff_name?: string | null };
  closingBalance?: number;
  walletAmount?: number;
  profileImage?: string;
  dueAmount?: number;
};

const AVATAR_TONES = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-amber-100", text: "text-amber-800" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
];

function initials(name?: string) {
  const cleaned = String(name ?? "").trim();
  if (!cleaned) return "C";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "C";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + second).toUpperCase();
}

function formatJoinedDate(dateStr?: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function CustomerScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [openCreateCustomerModal, setOpenCreateCustomerModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [openLedgerModal, setOpenLedgerModal] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [pagination, setPagination] = useState<MRT_PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE_DEFAULT,
  });
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [importingCustomers, setImportingCustomers] = useState(false);
  const [updatingCustomer, setUpdatingCustomer] = useState(false);
  const staff = useAppSelector((state) => state.user);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsCustomer, setDetailsCustomer] = useState<CustomerRow | null>(
    null,
  );
  const [customer360, setCustomer360] = useState<CustomerRow | null>(null);
  const [actionMenuCustomerId, setActionMenuCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    setOpenCreateCustomerModal(true);
    const next = new URLSearchParams(searchParams);
    next.delete("create");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch]);

  const fetchCustomers = async (signal?: AbortSignal) => {
    try {
      setLoadingCustomers(true);
      const page = pagination.pageIndex + 1;
      const response = await handleGetCustomers(
        debouncedSearch,
        signal,
        pagination.pageSize,
        page,
      );
      const customerList: CustomerRow[] = Array.isArray(response?.customers)
        ? response.customers
        : [];

      setCustomers(
        customerList.map((customer) => ({
          ...customer,
          membershipType: customer.membershipType || "none",
          walletAmount: Number(
            customer?.walletAmount ?? customer?.closingBalance ?? 0,
          ),
          dueAmount: Number(customer?.dueAmount ?? 0),
        })),
      );
      setRowCount(
        Number.isFinite(Number(response?.total))
          ? Number(response.total)
          : customerList.length,
      );
    } catch (error) {
      if (
        (error as { name?: string; code?: string })?.name === "CanceledError" ||
        (error as { name?: string; code?: string })?.code === "ERR_CANCELED"
      ) {
        return;
      }
      console.error("fetchCustomers error:", error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchCustomers(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on page/search
  }, [debouncedSearch, pagination.pageIndex, pagination.pageSize]);

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await handleDeleteCustomer(id);

        await Swal.fire({
          title: "Deleted!",
          text: "Customer has been deleted.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });

        setCustomers((prev) => prev.filter((c) => c._id !== id));
        setRowCount((prev) => Math.max(0, prev - 1));
        await fetchCustomers();
      } catch (error) {
        const err = error as { response?: { data?: { message?: string } } };
        Swal.fire({
          title: "Error!",
          text: err?.response?.data?.message ?? "Something went wrong.",
          icon: "error",
        });
      }
    }
  };

  const handleCreateCustomerSubmit = async (args: {
    payload: CustomerPayload;
    profileImageFile?: File | null;
  }) => {
    try {
      setCreatingCustomer(true);
      const createdBy = {
        m_staff_id: staff?.m_staff_id,
        m_staff_name: staff?.m_staff_name,
        m_staff_email: staff?.m_staff_email,
      };

      if (args.profileImageFile) {
        const fd = customerPayloadToFormData(
          {
            ...args.payload,
            createdBy,
          },
          args.profileImageFile,
        );
        await handleCreateCustomer(fd);
      } else {
        await handleCreateCustomer({
          ...args.payload,
          createdBy,
        });
      }
      setOpenCreateCustomerModal(false);
      await fetchCustomers();
      Swal.fire("Customer created", "Customer saved successfully.", "success");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Create failed",
        err?.response?.data?.message ?? "Could not create customer. Try again.",
        "error",
      );
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleUpdateCustomerSubmit = async (args: {
    payload: CustomerPayload;
    profileImageFile?: File | null;
  }) => {
    const id = selectedCustomer?._id;
    if (!id) {
      Swal.fire("Update failed", "Customer id not found.", "error");
      return;
    }
    try {
      setUpdatingCustomer(true);
      const createdBy = {
        m_staff_id: staff?.m_staff_id,
        m_staff_name: staff?.m_staff_name,
        m_staff_email: staff?.m_staff_email,
      };
      if (args.profileImageFile) {
        const fd = customerPayloadToFormData(
          {
            ...args.payload,
            createdBy,
          },
          args.profileImageFile,
        );
        await handleUpdateCustomer(id, fd);
      } else {
        await handleUpdateCustomer(id, {
          ...args.payload,
          createdBy,
        });
      }
      setEditOpen(false);
      setSelectedCustomer(null);
      await fetchCustomers();
      Swal.fire("Updated", "Customer updated successfully.", "success");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Update failed",
        err?.response?.data?.message ?? "Could not update customer. Try again.",
        "error",
      );
    } finally {
      setUpdatingCustomer(false);
    }
  };

  const data = useMemo(() => customers, [customers]);
  const columns = useMemo<MRT_ColumnDef<CustomerRow>[]>(
    () => [
      {
        header: "Customer",
        accessorKey: "name",
        size: 260,
        Cell: ({ row, renderedCellValue }) => {
          const membershipType = billingMembershipFromCustomer(row.original);
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-slate-800">
                {renderedCellValue}
              </span>

              <span className="text-xs text-slate-500">
                Membership: {membershipType || "none"}
              </span>
            </div>
          );
        },
      },
      {
        header: "Contact Info",
        id: "contactInfo",
        accessorFn: (row: CustomerRow) =>
          [row.mobile, row.email].filter(Boolean).join(" ") || "-",
        size: 220,
        Cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-slate-800">{row.original.mobile || "—"}</p>
            {row.original.email ? (
              <p className="truncate text-xs text-slate-500">{row.original.email}</p>
            ) : null}
          </div>
        ),
      },
      {
        header: "Wallet Amount",
        id: "walletAmount",
        accessorFn: (row: CustomerRow) =>
          Number.isFinite(Number(row.walletAmount))
            ? Number(row.walletAmount)
            : 0,
        Cell: ({ cell }) => {
          const value = Number(cell.getValue() ?? 0);
          return (
            <span className="tabular-nums">
              ₹ {value.toLocaleString("en-IN")}
            </span>
          );
        },
        size: 140,
      },
      {
        header: "Due Amount",
        id: "dueAmount",
        accessorFn: (row: CustomerRow) => row.dueAmount || 0,
        Cell: ({ cell }) => {
          const value = Number(cell.getValue() ?? 0);
          if (value <= 0) return "-";
          return (
            <span className="font-semibold text-amber-700 tabular-nums">
              ₹ {value.toLocaleString("en-IN")}
            </span>
          );
        },
        size: 140,
      },
      {
        header: "Ledger",
        accessorKey: "ledger",
        size: 30,
        Cell: ({ row }: { row: MRT_Row<CustomerRow> }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDetailsOpen(false);
              setDetailsCustomer(null);
              setSelectedCustomer(row.original);
              setOpenLedgerModal(true);
            }}
            title="View Ledger"
            className="px-3 py-2 bg-indigo-100 rounded hover:bg-indigo-200 cursor-pointer"
          >
            <Eye size={18} className="text-indigo-600" />
          </button>
        ),
      },
      {
        header: "Actions",
        accessorKey: "actions",
        size: 60,
        Cell: ({ row }: { row: MRT_Row<CustomerRow> }) => (
          <div className="flex items-center gap-2">
            <Can permission={PERMISSIONS.CUSTOMER_UPDATE}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCustomer(row.original);
                  setEditOpen(true);
                }}
                className="px-3 py-2 bg-green-100 rounded hover:bg-green-200 cursor-pointer"
              >
                <SquarePen size={18} className="text-green-600" />
              </button>
            </Can>

            <Can permission={PERMISSIONS.CUSTOMER_DELETE}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const id = row.original._id;
                  if (id) void handleDelete(id);
                }}
                className="px-3 py-2 bg-red-100 rounded hover:bg-red-200 cursor-pointer"
              >
                <Trash2 size={18} className="text-red-600" />
              </button>
            </Can>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useMaterialReactTable<CustomerRow>({
    columns,
    data,
    rowCount,
    manualPagination: true,
    manualFiltering: true,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setSearch,
    state: {
      isLoading: loadingCustomers,
      globalFilter: search,
      pagination,
    },
    enableGlobalFilter: true,
    muiTablePaperProps: {
      elevation: 0,
      style: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
      },
    },
    muiTableContainerProps: {
      sx: {
        maxWidth: "100%",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      },
    },
    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        if (!row.original._id) return;
        setCustomer360(row.original);
      },
      sx: { cursor: "pointer" },
    }),
  });
  return (
    <div className="p-1">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Customers</h1>
          <div className="text-sm text-slate-500">
            {loadingCustomers
              ? "Loading..."
              : `${rowCount.toLocaleString("en-IN")} customers`}
          </div>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto sm:flex-1 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
          <Can permission={PERMISSIONS.CUSTOMER_CREATE}>
            <button
              type="button"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 sm:flex-initial sm:px-4 sm:py-2.5 sm:text-sm"
              onClick={() => setOpenImportModal(true)}
            >
              <FileSpreadsheet size={16} />
              Excel Import
            </button>
            <button
              type="button"
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:flex-initial sm:px-4 sm:py-2.5 sm:text-sm"
              onClick={() => setOpenCreateCustomerModal(true)}
            >
              + New Customer
            </button>
          </Can>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <MaterialReactTable table={table} />
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-2.5">
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-slate-400"
          />
        </div>

        {loadingCustomers && customers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            Loading customers...
          </div>
        ) : customers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            No customers found
          </div>
        ) : (
          customers.map((customer, idx) => {
            const tone = AVATAR_TONES[idx % AVATAR_TONES.length];
            const membershipLabel =
              billingMembershipFromCustomer(customer) ||
              customer.membershipType ||
              "Visitor";
            const joined = formatJoinedDate(customer.createdAt);
            const phoneNum = String(customer.mobile || customer.whatsappNumber || "").trim();
            const hasPhone = Boolean(phoneNum && phoneNum !== "—" && phoneNum !== "-");
            const customerKey = customer._id || String(idx);

            return (
              <div
                key={customerKey}
                onClick={() => {
                  setDetailsCustomer(customer);
                  setDetailsOpen(true);
                }}
                className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition hover:border-blue-300 hover:shadow-md cursor-pointer active:scale-[0.99]"
              >
                {/* Left: Avatar + Name + Membership + Joined Date */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${tone.bg} ${tone.text}`}
                  >
                    {initials(customer.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className="text-sm font-bold text-slate-900 truncate transition group-hover:text-blue-600"
                        title={customer.name}
                      >
                        {customer.name || "Unnamed Customer"}
                      </h4>
                      <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-200/70">
                        {membershipLabel}
                      </span>
                    </div>
                    {joined && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        Joined {joined}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Phone Direct Contact + 3 Dots Action Menu */}
                <div
                  className="flex items-center justify-between sm:justify-end gap-2 border-t border-slate-100 sm:border-0 pt-2.5 sm:pt-0 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {hasPhone ? (
                    <a
                      href={`tel:${phoneNum.replace(/[^0-9+]/g, "")}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition active:scale-95 cursor-pointer"
                      title={`Call ${phoneNum}`}
                    >
                      <Phone size={13} className="shrink-0 fill-emerald-600/20 text-emerald-600" />
                      <span>{phoneNum}</span>
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Phone size={12} className="text-slate-300" />
                      <span>No phone</span>
                    </span>
                  )}

                  {/* 3-Dots Action Menu */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionMenuCustomerId(
                          actionMenuCustomerId === customerKey ? null : customerKey,
                        );
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition active:scale-95 cursor-pointer"
                      aria-label="Customer actions"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {actionMenuCustomerId === customerKey && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuCustomerId(null);
                          }}
                        />
                        <div
                          className="absolute right-0 top-full z-40 mt-1.5 w-38 rounded-xl border border-slate-100 bg-white py-1 text-left shadow-xl animate-in fade-in zoom-in-95 duration-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuCustomerId(null);
                              setSelectedCustomer(null);
                              setOpenLedgerModal(false);
                              setDetailsCustomer(customer);
                              setDetailsOpen(true);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            <Eye size={14} className="text-slate-400" />
                            <span>View Details</span>
                          </button>
                          <Can permission={PERMISSIONS.CUSTOMER_UPDATE}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuCustomerId(null);
                                setDetailsOpen(false);
                                setSelectedCustomer(customer);
                                setEditOpen(true);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              <SquarePen size={14} className="text-slate-400" />
                              <span>Edit Customer</span>
                            </button>
                          </Can>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuCustomerId(null);
                              setDetailsOpen(false);
                              setDetailsCustomer(null);
                              setSelectedCustomer(customer);
                              setOpenLedgerModal(true);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            <FileSpreadsheet size={14} className="text-slate-400" />
                            <span>View Ledger</span>
                          </button>
                          <Can permission={PERMISSIONS.CUSTOMER_DELETE}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuCustomerId(null);
                                if (customer._id) void handleDelete(customer._id);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 size={14} className="text-rose-500" />
                              <span>Delete Customer</span>
                            </button>
                          </Can>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Mobile Pagination */}
        {rowCount > pagination.pageSize && (
          <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
            <button
              type="button"
              disabled={pagination.pageIndex === 0}
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  pageIndex: Math.max(0, prev.pageIndex - 1),
                }))
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {pagination.pageIndex + 1} of{" "}
              {Math.ceil(rowCount / pagination.pageSize) || 1}
            </span>
            <button
              type="button"
              disabled={
                (pagination.pageIndex + 1) * pagination.pageSize >= rowCount
              }
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  pageIndex: prev.pageIndex + 1,
                }))
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {openCreateCustomerModal && (
        <CreateCustomerModal
          onClose={() => setOpenCreateCustomerModal(false)}
          onSubmit={handleCreateCustomerSubmit}
          loading={creatingCustomer}
        />
      )}

      <ImportCustomersModal
        open={openImportModal}
        loading={importingCustomers}
        onClose={() => setOpenImportModal(false)}
        onImport={async (rows: CustomerImportRow[]) => {
          try {
            setImportingCustomers(true);
            const response = await handleImportCustomers(rows);
            const summary = response?.summary;
            const createdRows = Array.isArray(response?.customers)
              ? response.customers
              : [];
            setOpenImportModal(false);

            if (createdRows.length) {
              setCustomers((prev) => {
                const seen = new Set(
                  createdRows.map((c: CustomerRow) =>
                    String(c._id || c.mobile),
                  ),
                );
                const rest = prev.filter(
                  (c) => !seen.has(String(c._id || c.mobile)),
                );
                return [...createdRows, ...rest];
              });
            }

            setSearch("");
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            await fetchCustomers();

            const created = Number(summary?.created || 0);
            const failed = Number(summary?.failed || 0);
            const skipped = Number(summary?.skipped || 0);
            const errorLines = Array.isArray(summary?.errors)
              ? summary.errors
                  .slice(0, 8)
                  .map(
                    (e: { row?: number; message?: string }) =>
                      `<li>Row ${e.row ?? "?"}: ${e.message || "Error"}</li>`,
                  )
                  .join("")
              : "";

            await Swal.fire({
              icon: created > 0 ? "success" : failed > 0 ? "error" : "info",
              title:
                created > 0
                  ? `${created} customer${created === 1 ? "" : "s"} saved`
                  : failed > 0
                    ? "Import finished with errors"
                    : "Nothing saved to database",
              html: `
                <div class="text-sm text-left space-y-1">
                  <p>${response?.message || "Import finished."}</p>
                  <p>Created in DB: <b>${created}</b> · Skipped: <b>${skipped}</b> · Failed: <b>${failed}</b></p>
                  ${
                    errorLines
                      ? `<ul class="mt-2 list-disc pl-4 text-xs text-slate-600">${errorLines}</ul>`
                      : ""
                  }
                </div>
              `,
              confirmButtonColor: "#2563eb",
            });
          } catch (error: unknown) {
            const err = error as {
              response?: {
                data?: {
                  message?: string;
                  summary?: {
                    errors?: { row?: number; message?: string }[];
                  };
                };
              };
            };
            const details = Array.isArray(err?.response?.data?.summary?.errors)
              ? err.response.data.summary.errors
                  .slice(0, 5)
                  .map((e) => `Row ${e.row ?? "?"}: ${e.message || "Error"}`)
                  .join("\n")
              : "";
            Swal.fire(
              "Import failed",
              [
                err?.response?.data?.message ?? "Could not import customers.",
                details,
              ]
                .filter(Boolean)
                .join("\n"),
              "error",
            );
          } finally {
            setImportingCustomers(false);
          }
        }}
      />

      <UpdateCustomerModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedCustomer(null);
        }}
        customer={
          selectedCustomer ? (selectedCustomer as CustomerPayload) : null
        }
        onUpdate={handleUpdateCustomerSubmit}
        loading={updatingCustomer}
      />

      {customer360?._id ? (
        <Customer360Modal
          customerId={customer360._id}
          customerName={customer360.name}
          onClose={() => setCustomer360(null)}
        />
      ) : null}

      <CustomerDetailsModal
        open={detailsOpen}
        customer={detailsCustomer as any}
        onClose={() => {
          setDetailsOpen(false);
          setDetailsCustomer(null);
        }}
        onUpdated={async () => {
          await fetchCustomers();
        }}
        onEdit={(cust) => {
          setDetailsOpen(false);
          setDetailsCustomer(null);
          setSelectedCustomer(cust as any);
          setEditOpen(true);
        }}
        onViewLedger={(cust) => {
          setDetailsOpen(false);
          setDetailsCustomer(null);
          setSelectedCustomer(cust as any);
          setOpenLedgerModal(true);
        }}
      />

      {openLedgerModal && (
        <LedgerModal
          customer={selectedCustomer}
          onClose={() => {
            setOpenLedgerModal(false);
            setSelectedCustomer(null);
          }}
        />
      )}
    </div>
  );
}
