import { useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
} from "material-react-table";
import { Eye, SquarePen, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import LedgerModal from "@/features/network/components/LedgerModal";
import CreateCustomerModal from "@/features/network/components/CreateCustomerModal";
import UpdateCustomerModal from "@/features/network/components/UpdateCustomerModal";
import CustomerDetailsModal from "@/features/network/components/CustomerDetailsModal";
import { useDebounce } from "@/hooks/useDebounce";
import {
  customerPayloadToFormData,
  handleCreateCustomer,
  handleDeleteCustomer,
  handleGetCustomers,
  handleGetSubscriptions,
  handleGetWallets,
  handleUpdateCustomer,
  type CustomerPayload,
} from "@/services/apiClient";
import { useAppSelector } from "@/store/hooks";

type CustomerRow = {
  _id?: string;
  name?: string;
  mobile?: string;
  membershipType?: string;
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
};
export default function CustomerScreen() {
  const [openCreateCustomerModal, setOpenCreateCustomerModal] = useState(false);
  const [openLedgerModal, setOpenLedgerModal] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 300);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
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
        await fetchCustomers(debouncedSearch);
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
      const [customerResponse, walletResponse] = await Promise.allSettled([
        handleGetCustomers(searchText, signal),
        handleGetWallets({ search: searchText }, signal),
      ]);
      const subscriptionResponse = await handleGetSubscriptions(
        searchText,
        300,
        signal,
      );

      const customerList =
        customerResponse.status === "fulfilled" &&
        Array.isArray(customerResponse.value?.customers)
          ? customerResponse.value.customers
          : [];

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
      const subscriptions = Array.isArray(subscriptionResponse?.subscriptions)
        ? subscriptionResponse.subscriptions
        : [];
      const membershipLookup = subscriptions.reduce(
        (acc: Record<string, string>, subscription: any) => {
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
            if (!acc[key]) acc[key] = membershipType;
          });
          return acc;
        },
        {},
      );


      setCustomers(
        customerList.map((customer: CustomerRow) => {
          const membershipType =
            membershipLookup[String(customer?._id ?? "").trim()] ??
            membershipLookup[String(customer?.mobile ?? "").trim()] ??
            "none";
          const walletAmount =
            nextWalletMap[String(customer?._id ?? "").trim()] ??
            nextWalletMap[String(customer?.mobile ?? "").trim()] ??
            Number(customer?.walletAmount ?? customer?.closingBalance ?? 0);
          return { ...customer, membershipType, walletAmount };
        }),
      );
    } catch {
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchCustomers(debouncedSearch, controller.signal);
    return () => controller.abort();
  }, [debouncedSearch]);

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
      await fetchCustomers(debouncedSearch);
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
      await fetchCustomers(debouncedSearch);
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
        size: 260,
        Cell: ({ row }: { row: any }) => {
          const name = row.original.name;
          const membershipType = row.original.membershipType;
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-slate-800">{name}</span>

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
          row.mobile || row.whatsappNumber || row.email || "-",
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
        header: "Date/Time",
        id: "notes",
        accessorFn: (row: CustomerRow) => {
          const creator = row.createdBy?.m_staff_name ?? "";
          const createdAt = row.createdAt ? new Date(row.createdAt) : null;
          const parts: string[] = [];
          if (createdAt && !Number.isNaN(createdAt.getTime())) {
            parts.push(
              `Created: ${createdAt.toLocaleDateString("en-IN")} ${createdAt.toLocaleTimeString(
                "en-IN",
                { hour: "2-digit", minute: "2-digit" },
              )}`,
            );
          }
          if (creator) parts.push(`By ${creator}`);
          return parts.join(" • ") || "-";
        },
        size: 320,
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
            {/* Edit */}
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

            {/* Delete */}
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
          </div>
        ),
      },
    ],
    [],
  );

  const table = useMaterialReactTable<CustomerRow>({
    columns,
    data,
    state: { isLoading: loadingCustomers },
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
          <div className="w-full max-w-md">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers by name, company, phone etc..."
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            onClick={() => setOpenCreateCustomerModal(true)}
          >
            + New Customer
          </button>
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
          await fetchCustomers(debouncedSearch);
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
