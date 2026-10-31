import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_PaginationState,
  type MRT_Row,
} from "material-react-table";
import { Eye, FileSpreadsheet, Loader2, Search, SquarePen, Trash2, X } from "lucide-react";
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

        <div className="flex w-full flex-col gap-2 sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
          <Can permission={PERMISSIONS.CUSTOMER_CREATE}>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 sm:w-auto"
              onClick={() => setOpenImportModal(true)}
            >
              <FileSpreadsheet size={16} />
              Excel Import
            </button>
            <button
              type="button"
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
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
            const hasMembership = Boolean(customer.membershipType && customer.membershipType !== "None");

            return (
              <div
                key={customer._id || idx}
                className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-slate-900">
                        {customer.name || "Unnamed Customer"}
                      </span>
                      {hasMembership && (
                        <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.2 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-200/60">
                          {customer.membershipType}
                        </span>
                      )}
                    </div>
                    {customer.companyName && (
                      <p className="mt-0.5 text-xs font-medium text-slate-600 truncate">
                        {customer.companyName}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {customer.mobile && (
                        <span className="font-medium text-slate-700">
                          {customer.mobile}
                        </span>
                      )}
                      {customer.city && (
                        <>
                          <span>•</span>
                          <span>{customer.city}</span>
                        </>
                      )}
                      {customer.email && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[140px]">
                            {customer.email}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {customer.dueAmount !== undefined && Number(customer.dueAmount) > 0 ? (
                    <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200/60">
                      Due: ₹{Number(customer.dueAmount).toLocaleString("en-IN")}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200/60">
                      Clear
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="block text-[10px] font-medium uppercase text-slate-400">
                        Wallet
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        ₹{Number(customer.walletAmount || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setOpenLedgerModal(true);
                      }}
                      className="cursor-pointer rounded-lg bg-indigo-50 p-1.5 text-indigo-700 hover:bg-indigo-100"
                      title="View Ledger"
                    >
                      <Eye size={15} />
                    </button>
                    <Can permission={PERMISSIONS.CUSTOMER_UPDATE}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setEditOpen(true);
                        }}
                        className="cursor-pointer rounded-lg bg-blue-50 p-1.5 text-blue-700 hover:bg-blue-100"
                        title="Edit Customer"
                      >
                        <SquarePen size={15} />
                      </button>
                    </Can>
                    <Can permission={PERMISSIONS.CUSTOMER_DELETE}>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!customer._id) return;
                          const res = await Swal.fire({
                            title: "Delete customer?",
                            text: "This action cannot be undone.",
                            icon: "warning",
                            showCancelButton: true,
                            confirmButtonText: "Delete",
                            confirmButtonColor: "#dc2626",
                          });
                          if (!res.isConfirmed) return;
                          try {
                            await handleDeleteCustomer(customer._id);
                            await fetchCustomers();
                            Swal.fire({
                              title: "Deleted",
                              text: "Customer removed.",
                              icon: "success",
                              timer: 1400,
                              showConfirmButton: false,
                            });
                          } catch (err: any) {
                            Swal.fire(
                              "Error",
                              err?.response?.data?.message ?? "Failed to delete customer.",
                              "error",
                            );
                          }
                        }}
                        className="cursor-pointer rounded-lg bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100"
                        title="Delete Customer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </Can>
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
