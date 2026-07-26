import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import { Eye, FileSpreadsheet, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import LedgerModal from "@/features/network/components/LedgerModal";
import ImportVendorModal from "@/features/network/components/ImportVendorModal";
import VendorDetailsModal, {
  type VendorDetails,
} from "@/features/network/components/VendorDetailsModal";
import AddVendorModal from "@/features/purchase/Modal/AddVendorModal";
import {
  handleCreateVendor,
  handleDeleteVendor,
  handleGetVendors,
  handleImportVendors,
  type CustomerPayload,
  type VendorImportRow,
  type VendorPayload,
} from "@/services/apiClient";

type VendorRow = VendorDetails & {
  _id: string;
  name: string;
  mobile: string;
};

type VendorTableRow = VendorRow & {
  id: number;
  company: string;
};

function normalizeVendorGender(raw?: string | null): "" | "Male" | "Female" | "Other" {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!value || value === "not specified" || value === "n/a" || value === "na") {
    return "";
  }
  if (value === "male") return "Male";
  if (value === "female") return "Female";
  if (value === "other") return "Other";
  return "";
}

function toVendorPayload(payload: CustomerPayload): VendorPayload {
  return {
    name: payload.name,
    mobile: payload.mobile,
    email: payload.email,
    gstin: payload.gstin,
    companyName: payload.companyName,
    address: payload.address,
    billingAddress1: payload.address,
    pincode: payload.pincode,
    city: payload.city,
    state: payload.state,
    country: payload.country || "India",
    adharNumber: payload.adharNumber,
    dob: payload.dob || undefined,
    gender: normalizeVendorGender(payload.gender),
    whatsappNumber: payload.whatsappNumber,
    AlternateMobile: payload.AlternateMobile,
    IFSCcode: payload.IFSCcode,
    bankName: payload.bankName,
    branchName: payload.branchName,
    accountNumber: payload.accountNumber,
    panNumber: payload.panNumber,
    accountHolderName: payload.accountHolderName,
    UPIID: payload.UPIID,
  };
}

export default function VendorScreen() {
  const [openCreateVendorModal, setOpenCreateVendorModal] = useState(false);
  const [creatingVendor, setCreatingVendor] = useState(false);
  const [openImportVendorModal, setOpenImportVendorModal] = useState(false);
  const [importingVendor, setImportingVendor] = useState(false);
  const [openLedgerModal, setOpenLedgerModal] = useState(false);
  const [selectedVendorForLedger, setSelectedVendorForLedger] =
    useState<VendorRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedVendorDetails, setSelectedVendorDetails] =
    useState<VendorRow | null>(null);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);

  const fetchVendors = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoadingVendors(true);
      const response = await handleGetVendors(signal);
      setVendors(Array.isArray(response?.vendors) ? response.vendors : []);
    } catch (error: unknown) {
      if ((error as { name?: string })?.name === "CanceledError") return;
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Error",
        err.response?.data?.message ?? "Failed to fetch vendors.",
        "error",
      );
    } finally {
      setLoadingVendors(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchVendors(controller.signal);
    return () => controller.abort();
  }, [fetchVendors]);

  const handleCreateVendorSubmit = async ({
    payload,
  }: {
    payload: CustomerPayload;
    profileImageFile?: File | null;
  }) => {
    try {
      setCreatingVendor(true);
      await handleCreateVendor(toVendorPayload(payload));
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

  const handleImport = async (rows: VendorImportRow[]) => {
    try {
      setImportingVendor(true);
      const response = await handleImportVendors(rows);
      const summary = response?.summary;
      const createdRows: VendorRow[] = Array.isArray(response?.vendors)
        ? response.vendors
        : [];

      setOpenImportVendorModal(false);

      if (createdRows.length) {
        setVendors((prev) => {
          const seen = new Set(
            createdRows.map((v) => String(v._id || v.mobile)),
          );
          const rest = prev.filter(
            (v) => !seen.has(String(v._id || v.mobile)),
          );
          return [...createdRows, ...rest];
        });
      }

      await fetchVendors();

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
            ? `${created} vendor${created === 1 ? "" : "s"} saved`
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
            summary?: { errors?: { row?: number; message?: string }[] };
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
          err?.response?.data?.message ?? "Could not import vendors.",
          details,
        ]
          .filter(Boolean)
          .join("\n"),
        "error",
      );
    } finally {
      setImportingVendor(false);
    }
  };

  const data = useMemo<VendorTableRow[]>(
    () =>
      vendors.map((vendor, index) => ({
        id: index + 1,
        ...vendor,
        company: vendor.companyName ?? "",
      })),
    [vendors],
  );

  const openVendorDetails = (vendor: VendorTableRow) => {
    setSelectedVendorDetails(vendor);
    setDetailsOpen(true);
  };

  const columns = useMemo<MRT_ColumnDef<VendorTableRow>[]>(
    () => [
      { accessorKey: "id", header: "ID", size: 70 },
      {
        accessorKey: "name",
        header: "Vendor Name",
        Cell: ({ row, cell }) => (
          <button
            type="button"
            onClick={() => openVendorDetails(row.original)}
            className="text-left font-semibold text-blue-700 underline-offset-2 hover:underline"
            title="View vendor details"
          >
            {cell.getValue<string>() || "—"}
          </button>
        ),
      },
      { accessorKey: "company", header: "Company" },
      { accessorKey: "mobile", header: "Mobile" },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "gstin", header: "GSTIN" },
      { accessorKey: "city", header: "City", size: 110 },
      {
        accessorKey: "createdAt",
        header: "Created At",
        size: 160,
        Cell: ({ cell }) => {
          const value = cell.getValue<string | undefined>();
          return value
            ? new Date(value).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "—";
        },
      },
      {
        id: "netBalance",
        header: "Net Balance",
        size: 130,
        accessorFn: (row) =>
          Number(row.netBalance ?? row.closingBalance ?? 0),
        Cell: ({ cell }) => {
          const value = Number(cell.getValue<number>() ?? 0);
          return `₹ ${value.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}`;
        },
      },
      {
        id: "ledger",
        header: "Ledger",
        size: 70,
        enableSorting: false,
        Cell: ({ row }) => (
          <button
            type="button"
            onClick={() => {
              setSelectedVendorForLedger(row.original);
              setOpenLedgerModal(true);
            }}
            title="View Ledger"
            className="rounded bg-indigo-100 px-3 py-2 text-sm hover:bg-indigo-200"
          >
            <Eye color="indigo" size={18} />
          </button>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        size: 90,
        enableSorting: false,
        Cell: ({ row }) => (
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
                  confirmButtonColor: "#dc2626",
                });
                if (!result.isConfirmed) return;
                try {
                  await handleDeleteVendor(row.original._id);
                  await fetchVendors();
                  await Swal.fire({
                    title: "Deleted",
                    text: "Vendor removed.",
                    icon: "success",
                    timer: 1400,
                    showConfirmButton: false,
                  });
                } catch (error: unknown) {
                  const err = error as {
                    response?: { data?: { message?: string } };
                  };
                  Swal.fire(
                    "Error",
                    err.response?.data?.message ?? "Failed to delete vendor.",
                    "error",
                  );
                }
              }}
              className="rounded bg-red-100 px-3 py-2 text-sm hover:bg-red-200"
            >
              <Trash2 color="red" size={18} />
            </button>
          </Can>
        ),
      },
    ],
    [fetchVendors],
  );

  const table = useMaterialReactTable({
    columns,
    data,
    state: { isLoading: loadingVendors },
    enableDensityToggle: false,
    initialState: { density: "compact" },
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Vendors List</h1>
          <p className="text-sm text-slate-500">
            {loadingVendors
              ? "Loading..."
              : `${vendors.length.toLocaleString("en-IN")} vendors`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Can permission={PERMISSIONS.VENDOR_CREATE}>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
              onClick={() => setOpenImportVendorModal(true)}
            >
              <FileSpreadsheet size={16} />
              Excel Import
            </button>
            <button
              type="button"
              className="rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-900"
              onClick={() => setOpenCreateVendorModal(true)}
            >
              Create New Vendor
            </button>
          </Can>
        </div>
      </div>

      <MaterialReactTable table={table} />

      {openCreateVendorModal ? (
        <AddVendorModal
          onClose={() => setOpenCreateVendorModal(false)}
          onSubmit={handleCreateVendorSubmit}
          loading={creatingVendor}
        />
      ) : null}

      <ImportVendorModal
        open={openImportVendorModal}
        loading={importingVendor}
        onClose={() => setOpenImportVendorModal(false)}
        onImport={handleImport}
      />

      <VendorDetailsModal
        open={detailsOpen}
        vendor={selectedVendorDetails}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedVendorDetails(null);
        }}
      />

      {openLedgerModal ? (
        <LedgerModal
          onClose={() => {
            setOpenLedgerModal(false);
            setSelectedVendorForLedger(null);
          }}
          vendor={selectedVendorForLedger}
        />
      ) : null}
    </div>
  );
}
