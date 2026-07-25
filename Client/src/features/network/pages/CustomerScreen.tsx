import { useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
} from "material-react-table";
import { Eye, FileSpreadsheet, SquarePen, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import LedgerModal from "@/features/network/components/LedgerModal";
import CreateCustomerModal from "@/features/network/components/CreateCustomerModal";
import ImportCustomersModal from "@/features/network/components/ImportCustomersModal";
import UpdateCustomerModal from "@/features/network/components/UpdateCustomerModal";
import CustomerDetailsModal from "@/features/network/components/CustomerDetailsModal";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import {
  customerPayloadToFormData,
  handleCreateCustomer,
  handleDeleteCustomer,
  handleGetCustomers,
  handleGetInvoices,
  handleGetSubscriptions,
  handleGetWallets,
  handleImportCustomers,
  handleUpdateCustomer,
  type CustomerImportRow,
  type CustomerPayload,
} from "@/services/apiClient";
import { useAppSelector } from "@/store/hooks";

type CustomerRow = {
  _id?: string;
  name?: string;
  mobile?: string;
  membershipType?: string;
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
  const [openCreateCustomerModal, setOpenCreateCustomerModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [openLedgerModal, setOpenLedgerModal] = useState(false);
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [importingCustomers, setImportingCustomers] = useState(false);
  const [updatingCustomer, setUpdatingCustomer] = useState(false);
  const staff = useAppSelector((state) => state.user);
  // console.log("staff", staff);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsCustomer, setDetailsCustomer] = useState<CustomerRow | null>(
    null,
  );

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

        // Update UI instantly + keep it consistent with backend
        setCustomers((prev) => prev.filter((c) => c._id !== id));
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

  const fetchCustomers = async (searchText = "", signal?: AbortSignal) => {
    try {
      setLoadingCustomers(true);
      const [
        customerResponse,
        walletResponse,
        invoiceResponse,
        subscriptionResponse,
      ] = await Promise.allSettled([
        handleGetCustomers(searchText, signal, 6000),
        handleGetWallets({ search: searchText }, signal),
        handleGetInvoices(searchText, signal),
        handleGetSubscriptions(searchText, 300, signal),
      ]);

      const customerList =
        customerResponse.status === "fulfilled" &&
        Array.isArray(customerResponse.value?.customers)
          ? customerResponse.value.customers
          : [];

      // Never wipe an existing table if only a secondary API failed
      if (
        customerResponse.status !== "fulfilled" &&
        !customerList.length
      ) {
        console.error(
          "Failed to fetch customers:",
          customerResponse.status === "rejected"
            ? customerResponse.reason
            : "unknown",
        );
        return;
      }

      const walletItems =
        walletResponse.status === "fulfilled"
          ? Array.isArray(walletResponse.value?.wallets)
            ? walletResponse.value.wallets
            : Array.isArray(walletResponse.value?.data)
              ? walletResponse.value.data
              : Array.isArray(walletResponse.value)
                ? walletResponse.value
                : []
          : [];

      const nextWalletMap = walletItems.reduce(
        (acc: Record<string, number>, wallet: any) => {
          const amountCandidates = [
            wallet?.walletAmount,
            wallet?.balance,
            wallet?.currentBalance,
            wallet?.availableBalance,
            wallet?.customer?.walletAmount,
          ];
          const amount =
            amountCandidates.find((value) => Number.isFinite(Number(value))) ?? 0;
          const keys = [
            wallet?.customerId,
            wallet?.customer?._id,
            wallet?.customer?.id,
            wallet?.customerPhone,
            wallet?.customer?.mobile,
          ]
            .map((value) => String(value ?? "").trim())
            .filter(Boolean);

          keys.forEach((key) => {
            acc[key] = Number(amount);
          });
          return acc;
        },
        {},
      );
      const subscriptions =
        subscriptionResponse.status === "fulfilled" &&
        Array.isArray(subscriptionResponse.value?.subscriptions)
          ? subscriptionResponse.value.subscriptions
          : [];
      const membershipLookup = subscriptions.reduce(
        (acc: Record<string, { type: string; startDate?: string; endDate?: string }>, subscription: any) => {
          const membershipType = String(
            subscription?.membershipType ??
              subscription?.membershipName ??
              subscription?.items?.[0]?.productName ??
              "",
          ).trim();
          if (!membershipType) return acc;
          const keys = [
            subscription?.customerId,
            subscription?.customer?._id,
            subscription?.customer?.id,
            subscription?.customerPhone,
            subscription?.customer?.mobile,
          ]
            .map((value) => String(value ?? "").trim())
            .filter(Boolean);
          keys.forEach((key) => {
            if (!acc[key]) {
              acc[key] = {
                type: membershipType,
                startDate: subscription?.startDate,
                endDate: subscription?.endDate || subscription?.dueDate,
              };
            }
          });
          return acc;
        },
        {},
      );

      const invoiceItems =
        invoiceResponse.status === "fulfilled" &&
        Array.isArray(invoiceResponse.value?.invoices)
          ? invoiceResponse.value.invoices
          : [];
      const dueLookup = invoiceItems.reduce(
        (acc: Record<string, number>, invoice: any) => {
          const dueAmount = Number(
            invoice?.pendingAmount ?? invoice?.paymentBreakdown?.dueAmount ?? 0,
          );
          if (dueAmount <= 0) return acc;
          const keys = [
            invoice?.customerPhone,
            invoice?.customerName,
          ]
            .map((value) => String(value ?? "").trim())
            .filter(Boolean);
          keys.forEach((key) => {
            acc[key] = (acc[key] || 0) + dueAmount;
          });
          return acc;
        },
        {},
      );


      setCustomers(
        customerList.map((customer: CustomerRow) => {
          const membershipInfo =
            membershipLookup[String(customer?._id ?? "").trim()] ??
            membershipLookup[String(customer?.mobile ?? "").trim()] ??
            { type: "none" };
          const walletAmount =
            nextWalletMap[String(customer?._id ?? "").trim()] ??
            nextWalletMap[String(customer?.mobile ?? "").trim()] ??
            Number(customer?.walletAmount ?? customer?.closingBalance ?? 0);
          const dueAmount =
            dueLookup[String(customer?.mobile ?? "").trim()] ??
            dueLookup[String(customer?.name ?? "").trim()] ??
            0;
          return {
            ...customer,
            membershipType: membershipInfo.type,
            membershipStartDate: membershipInfo.startDate,
            membershipEndDate: membershipInfo.endDate,
            walletAmount,
            dueAmount,
          };
        }),
      );
    } catch (error) {
      console.error("fetchCustomers error:", error);
      // Keep current rows — do not blank the grid on refresh errors
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    void fetchCustomers();
  }, []);

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

      console.log("createdBy", createdBy);
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
        m_staff_id: staff.m_staff_id,
        m_staff_name: staff.m_staff_name,
        m_staff_email: staff.m_staff_email,
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
          const membershipType = row.original.membershipType;
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
          `${row.mobile || ""} ${row.whatsappNumber || ""} ${row.email || ""}`.trim() || "-",
        size: 180,
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
      // {
      //   header: "Date/Time",
      //   id: "notes",
      //   accessorFn: (row: CustomerRow) => {
      //     const creator = row.createdBy?.m_staff_name ?? "";
      //     const createdAt = row.createdAt ? new Date(row.createdAt) : null;
      //     const parts: string[] = [];
      //     if (createdAt && !Number.isNaN(createdAt.getTime())) {
      //       parts.push(
      //         `Created: ${createdAt.toLocaleDateString("en-IN")} ${createdAt.toLocaleTimeString(
      //           "en-IN",
      //           { hour: "2-digit", minute: "2-digit" },
      //         )}`,
      //       );
      //     }
      //     if (creator) parts.push(`By ${creator}`);
      //     return parts.join(" • ") || "-";
      //   },
      //   size: 320,
      // },
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
    state: {
      isLoading: loadingCustomers,
      globalFilter: search,
    },
    onGlobalFilterChange: setSearch,
    enableGlobalFilter: true,
    muiTablePaperProps: {
      elevation: 0,
      style: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
      },
    },
    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        setDetailsCustomer(row.original);
        setDetailsOpen(true);
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
              : `${customers.length.toLocaleString("en-IN")} customers`}
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          <Can permission={PERMISSIONS.CUSTOMER_CREATE}>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
              onClick={() => setOpenImportModal(true)}
            >
              <FileSpreadsheet size={16} />
              Excel Import
            </button>
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              onClick={() => setOpenCreateCustomerModal(true)}
            >
              + New Customer
            </button>
          </Can>
        </div>
      </div>

      <MaterialReactTable table={table} />

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

            // Show created rows immediately even if list refresh is slow/fails
            if (createdRows.length) {
              setCustomers((prev) => {
                const seen = new Set(
                  createdRows.map((c: CustomerRow) => String(c._id || c.mobile)),
                );
                const rest = prev.filter(
                  (c) => !seen.has(String(c._id || c.mobile)),
                );
                return [...createdRows, ...rest];
              });
            }

            // Clear search so newly imported rows are not filtered out of the grid
            setSearch("");
            await fetchCustomers("");

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
              response?: { data?: { message?: string; summary?: { errors?: { row?: number; message?: string }[] } } };
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
