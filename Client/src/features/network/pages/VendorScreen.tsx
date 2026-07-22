import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import {
  Eye,
  SquarePen,
  Trash2,
} from "lucide-react";
import LedgerModal from "@/features/network/components/LedgerModal";
import Swal from "sweetalert2";
import {
  handleCreateVendor,
  handleDeleteVendor,
  handleGetVendors,
  type CustomerPayload,
} from "@/services/apiClient";
import AddVendorModal from "@/features/purchase/Modal/AddVendorModal";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";

type VendorRow = {
  _id: string;
  name: string;
  companyName?: string;
  mobile: string;
  email?: string;
  gstin?: string;
};

type VendorTableRow = VendorRow & {
  id: number;
  company: string;
  category: string;
  createdAt?: string;
  closingBalance?: number;
};

export default function VendorScreen() {
  const [openCreateVendorModal, setOpenCreateVendorModal] = useState(false);
  const [creatingVendor, setCreatingVendor] = useState(false);
  const [openLedgerModal, setOpenLedgerModal] = useState(false);
  const [selectedVendorForLedger, setSelectedVendorForLedger] =
    useState<VendorRow | null>(null);
  const [vendors, setVendors] = useState<VendorRow[]>([]);

  const fetchVendors = useCallback(async () => {
    try {
      const response = await handleGetVendors();
      setVendors(Array.isArray(response?.vendors) ? response.vendors : []);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Error",
        err.response?.data?.message ?? "Failed to fetch vendors.",
        "error",
      );
    }
  }, []);

  useEffect(() => {
    void fetchVendors();
  }, [fetchVendors]);

  const handleCreateVendorSubmit = async ({
    payload,
    profileImageFile: _profileImageFile,
  }: {
    payload: CustomerPayload;
    profileImageFile?: File | null;
  }) => {
    void _profileImageFile;
    try {
      setCreatingVendor(true);
      await handleCreateVendor({
        name: payload.name,
        mobile: payload.mobile,
        email: payload.email,
        gstin: payload.gstin,
        companyName: payload.companyName,
        address: payload.address,
        city: payload.city,
        state: payload.state,
        country: payload.country,
      });
      setOpenCreateVendorModal(false);
      await fetchVendors();
      await Swal.fire("Vendor created", "Vendor saved successfully.", "success");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Create failed",
        err?.response?.data?.message ?? "Could not create vendor. Try again.",
        "error",
      );
    } finally {
      setCreatingVendor(false);
    }
  };

  const data = useMemo(
    () =>
      vendors.map((vendor, index) => ({
        id: index + 1,
        ...vendor,
        company: vendor.companyName ?? "",
        category: "-",
      })),
    [vendors]
  );

  const columns = useMemo(
    () => [
      { accessorKey: "id", header: "ID", size: 90 },
      { accessorKey: "name", header: "Vendor Name" },
      { accessorKey: "company", header: "Company" },
      { accessorKey: "mobile", header: "Mobile" },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "gstin", header: "GSTIN" },
      {
        accessorKey: "createdAt",
        header: "Created At",
        size: 160,
        Cell: ({ cell }: any) => {
          const value = cell.getValue();

          return value
            ? new Date(value).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
            : "-";
        },
      },
      { accessorKey: "closingBalance", header: "Closing Balance", size: 120 },
      {
        header: "Ledger",
        accessorKey: "ledger",
        size: 40,
        Cell: ({ row }: { row: { original: VendorTableRow } }) => (
          <button
            type="button"
            onClick={() => {
              setSelectedVendorForLedger(row.original);
              setOpenLedgerModal(true);
            }}
            title="View Ledger"
            className="px-3 py-2 text-sm bg-indigo-100 rounded hover:bg-indigo-200 cursor-pointer"
          >
            <Eye color="indigo" size={18} />
          </button>
        ),
      },

      {
        header: "Actions",
        accessorKey: "actions",
        Cell: ({ row }: { row: { original: VendorTableRow } }) => (
          <div className="flex items-center gap-2">
            <Can permission={PERMISSIONS.VENDOR_UPDATE}>
              <button
                type="button"
                onClick={() => console.log("Edit:", row.original)}
                className="px-3 py-2 text-sm bg-green-100 rounded hover:bg-green-200 cursor-pointer"
              >
                <SquarePen color="green" size={18} />
              </button>
            </Can>
            <Can permission={PERMISSIONS.VENDOR_DELETE}>
              <button
                type="button"
                onClick={async () => {
                  const result = await Swal.fire({
                    title: "Delete vendor?",
                    text: "This action cannot be undone.",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Delete",
                  });
                  if (!result.isConfirmed) return;
                  try {
                    await handleDeleteVendor(row.original._id);
                    await fetchVendors();
                  } catch (error: unknown) {
                    const err = error as {
                      response?: { data?: { message?: string } };
                    };
                    Swal.fire(
                      "Error",
                      err.response?.data?.message ??
                        "Failed to delete vendor.",
                      "error",
                    );
                  }
                }}
                className="px-3 py-2 text-sm bg-red-100 rounded hover:bg-red-200 cursor-pointer"
              >
                <Trash2 color="red" size={18} />
              </button>
            </Can>
          </div>
        ),
      },
    ],
    [fetchVendors]
  );

  const table = useMaterialReactTable({
    columns,
    data,
    muiTablePaperProps: {
      elevation: 0,
      square: true,
      sx: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
      },
    },
  });

  return (
    <div className="p-1">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold ">Vendors List</h1>
        <div className="flex gap-3">
          <Can permission={PERMISSIONS.VENDOR_CREATE}>
            <button
              type="button"
              className="w-[150px] rounded bg-black px-2 py-2 text-center text-[14px] font-semibold text-white transition hover:bg-neutral-900"
              onClick={() => setOpenCreateVendorModal(true)}
            >
              Create New Vendor
            </button>
          </Can>
        </div>
      </div>

      <MaterialReactTable table={table} />

      {openCreateVendorModal && (
        <AddVendorModal
          onClose={() => setOpenCreateVendorModal(false)}
          onSubmit={handleCreateVendorSubmit}
          loading={creatingVendor}
        />
      )}

      {openLedgerModal && (
        <LedgerModal
          onClose={() => {
            setOpenLedgerModal(false);
            setSelectedVendorForLedger(null);
          }}
          vendor={selectedVendorForLedger}
        />
      )}
    </div>
  );
}
