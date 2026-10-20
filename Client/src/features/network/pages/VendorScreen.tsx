import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import { Eye, FileSpreadsheet, Trash2,SquarePen } from "lucide-react";
import Swal from "sweetalert2";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import LedgerModal from "@/features/network/components/LedgerModal";
import ImportVendorModal from "@/features/network/components/ImportVendorModal";
import { type VendorDetails } from "@/features/network/components/VendorDetailsModal";
import Vendor360Modal from "@/features/network/components/Vendor360Modal";
import AddVendorModal from "@/features/purchase/Modal/AddVendorModal";
import {
  handleCreateVendor,
  handleDeleteVendor,
  handleGetVendors,
  handleImportVendors,
  handleUpdateVendor,
  type CustomerPayload,
  type VendorImportRow,
  type VendorPayload,
  type VendorPointOfContact,
} from "@/services/apiClient";

type VendorRow = VendorDetails & {
  _id: string;
  name: string;
  mobile: string;
  cspLabel?: string;
  totalPurchase?: number;
  purchaseFrequency?: number;
  totalPaid?: number;
  outstandingAmount?: number;
  lastPurchaseDate?: string | null;
  status?: string;
  isActive?: boolean;
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
    businessPhoneNumber: payload.businessPhoneNumber,
    brandName: payload.brandName,
    website: payload.website,
    businessEmail: payload.businessEmail,
    msme: payload.msme,
    udyamNumber: payload.udyamNumber,
    cinNumber: payload.cinNumber,
    pointsOfContact: payload.pointsOfContact,
    documents: payload.documents,
  };
}

function vendorToFormValues(vendor: VendorRow): Partial<CustomerPayload> {
  const companyName = vendor.companyName ?? "";
  const businessPhone = vendor.businessPhoneNumber ?? "";
  const storedAsCompany =
    Boolean(companyName) &&
    vendor.name === companyName &&
    Boolean(businessPhone) &&
    vendor.mobile === businessPhone;
  const savedContacts = Array.isArray(vendor.pointsOfContact)
    ? vendor.pointsOfContact
    : [];
  const personName = storedAsCompany ? "" : String(vendor.name ?? "").trim();
  const personPhone = storedAsCompany ? "" : String(vendor.mobile ?? "").trim();
  const pointsOfContact: VendorPointOfContact[] =
    savedContacts.length > 0
      ? savedContacts.map((row, index) =>
          index === 0 && personName && !String(row.name ?? "").trim()
            ? { ...row, name: personName, mobile: row.mobile || personPhone }
            : row,
        )
      : personName || vendor.email || vendor.AlternateMobile || vendor.dob || vendor.gender
        ? [
            {
              name: personName,
              mobile: personPhone,
              email: vendor.email ?? "",
              alternateMobile: vendor.AlternateMobile ?? "",
              dob: vendor.dob ?? "",
              gender: vendor.gender ?? "",
            },
          ]
        : [];
  return {
    name: "",
    mobile: "",
    email: vendor.email ?? "",
    gstin: vendor.gstin ?? "",
    companyName: vendor.companyName ?? "",
    address: String(vendor.address || vendor.billingAddress1 || "").trim(),
    pincode: vendor.pincode ?? "",
    city: vendor.city ?? "",
    state: vendor.state ?? "",
    country: vendor.country || "India",
    adharNumber: vendor.adharNumber ?? "",
    dob: vendor.dob ?? "",
    gender: normalizeVendorGender(vendor.gender),
    whatsappNumber: vendor.whatsappNumber ?? "",
    AlternateMobile: vendor.AlternateMobile ?? "",
    IFSCcode: vendor.IFSCcode ?? "",
    bankName: vendor.bankName ?? "",
    branchName: vendor.branchName ?? "",
    accountNumber: vendor.accountNumber ?? "",
    panNumber: vendor.panNumber ?? "",
    accountHolderName: vendor.accountHolderName ?? "",
    UPIID: vendor.UPIID ?? "",
    businessPhoneNumber: businessPhone,
    brandName: vendor.brandName ?? "",
    website: vendor.website ?? "",
    businessEmail: vendor.businessEmail ?? "",
    msme: vendor.msme ?? "",
    udyamNumber: vendor.udyamNumber ?? "",
    cinNumber: vendor.cinNumber ?? "",
    pointsOfContact,
    documents: Array.isArray(vendor.documents) ? vendor.documents : [],
  };
}

function inr(value?: number | null) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function whenDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function VendorScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [openCreateVendorModal, setOpenCreateVendorModal] = useState(false);
  const [creatingVendor, setCreatingVendor] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorRow | null>(null);
  const [updatingVendor, setUpdatingVendor] = useState(false);
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
    if (searchParams.get("create") !== "1") return;
    setOpenCreateVendorModal(true);
    const next = new URLSearchParams(searchParams);
    next.delete("create");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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

  const handleUpdateVendorSubmit = async ({
    payload,
  }: {
    payload: CustomerPayload;
    profileImageFile?: File | null;
  }) => {
    if (!editingVendor?._id) return;
    try {
      setUpdatingVendor(true);
      await handleUpdateVendor(editingVendor._id, toVendorPayload(payload));
      setEditingVendor(null);
      await fetchVendors();
      await Swal.fire({
        title: "Updated",
        text: "Vendor updated successfully.",
        icon: "success",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Update failed",
        err?.response?.data?.message ?? "Could not update vendor. Try again.",
        "error",
      );
    } finally {
      setUpdatingVendor(false);
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
      {
        accessorKey: "name",
        header: "Vendor Name",
        Cell: ({ row, cell }) => (
          <button
            type="button"
            onClick={() => openVendorDetails(row.original)}
            className="text-left font-semibold text-blue-700 underline-offset-2 hover:underline"
            title="Open vendor 360"
          >
            <span>{cell.getValue<string>() || "—"}</span>
            {row.original.cspLabel ? (
              <span className="ml-2 inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                {row.original.cspLabel}
              </span>
            ) : null}
          </button>
        ),
      },
      {
        id: "contact",
        header: "Point of Contact",
        accessorFn: (row) =>
          (row.pointsOfContact || [])
            .flatMap((item) => [item.name, item.mobile])
            .filter(Boolean)
            .join(" "),
        Cell: ({ row }) => {
          const contacts = (row.original.pointsOfContact || []).filter(
            (item) => item.name?.trim() || item.mobile?.trim(),
          );
          if (!contacts.length) return <span className="text-slate-400">—</span>;
          return (
            <div className="min-w-0 space-y-1">
              {contacts.map((item, index) => (
                <div key={`${item.mobile || item.name}-${index}`}>
                  <p className="text-slate-800">{item.mobile || "—"}</p>
                  {item.name ? (
                    <p className="truncate text-xs text-slate-500">{item.name}</p>
                  ) : null}
                </div>
              ))}
            </div>
          );
        },
      },
      {
        id: "company",
        header: "Company",
        accessorFn: (row) =>
          [row.companyName || row.company, row.businessPhoneNumber].filter(Boolean).join(" "),
        Cell: ({ row }) => {
          const company = row.original.companyName || row.original.company;
          const phone = row.original.businessPhoneNumber;
          return (
            <div className="min-w-0">
              <p className="font-medium text-slate-800">{company || "—"}</p>
              {phone ? <p className="text-xs text-slate-500">{phone}</p> : null}
            </div>
          );
        },
      },
      {
        accessorKey: "totalPurchase",
        header: "Total Purchase",
        Cell: ({ cell }) => inr(cell.getValue<number>()),
      },
      { accessorKey: "purchaseFrequency", header: "Purchase Frequency" },
      {
        accessorKey: "totalPaid",
        header: "Total Paid",
        Cell: ({ cell }) => inr(cell.getValue<number>()),
      },
      {
        accessorKey: "outstandingAmount",
        header: "Outstanding Amount",
        Cell: ({ cell }) => inr(cell.getValue<number>()),
      },
      {
        accessorKey: "lastPurchaseDate",
        header: "Last Purchase Date",
        Cell: ({ cell }) => whenDate(cell.getValue<string | null>()),
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => row.status || (row.isActive === false ? "Inactive" : "Active"),
        filterVariant: "select",
        filterSelectOptions: ["Active", "Inactive"],
      },
      {
        id: "actions",
        header: "Actions",
        size: 120,
        enableSorting: false,
        enableColumnFilter: false,
       
Cell: ({ row }) => (
  <div className="flex items-center gap-2">
    {/* View Ledger */}
    <button
      type="button"
      onClick={() => {
        setSelectedVendorForLedger(row.original);
        setOpenLedgerModal(true);
      }}
      title="View Ledger"
      aria-label="View Ledger"
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg
        border border-slate-200 bg-white text-slate-600
        transition-colors duration-150
        hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <Eye size={18} strokeWidth={1.8} />
    </button>

    {/* Edit Vendor */}
    <Can permission={PERMISSIONS.VENDOR_UPDATE}>
      <button
        type="button"
        onClick={() => {
          setOpenCreateVendorModal(false);
          setEditingVendor(row.original);
        }}
        title="Edit Vendor"
        aria-label="Edit Vendor"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg
          border border-slate-200 bg-white text-slate-600
          transition-colors duration-150
          hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <SquarePen size={18} strokeWidth={1.8} />
      </button>
    </Can>

    {/* Delete Vendor */}
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
              "error"
            );
          }
        }}
        title="Delete Vendor"
        aria-label="Delete Vendor"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg
          border border-slate-200 bg-white text-slate-600
          transition-colors duration-150
          hover:border-red-200 hover:bg-red-50 hover:text-red-600
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        <Trash2 size={18} strokeWidth={1.8} />
      </button>
    </Can>
  </div>
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
    enableGlobalFilter: true,
    enableColumnFilters: true,
    enableSorting: true,
    initialState: {
      density: "compact",
      showGlobalFilter: true,
      pagination: { pageIndex: 0, pageSize: 10 },
    },
    muiTablePaperProps: {
      elevation: 0,
      square: true,
      sx: {
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
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-3">
          <Can permission={PERMISSIONS.VENDOR_CREATE}>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 sm:w-auto"
              onClick={() => setOpenImportVendorModal(true)}
            >
              <FileSpreadsheet size={16} />
              Excel Import
            </button>
            <button
              type="button"
              className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-900 sm:w-auto"
              onClick={() => {
                setEditingVendor(null);
                setOpenCreateVendorModal(true);
              }}
            >
              Create New Vendor
            </button>
          </Can>
        </div>
      </div>

      <MaterialReactTable table={table} />

      {openCreateVendorModal ? (
        <AddVendorModal
          mode="create"
          onClose={() => setOpenCreateVendorModal(false)}
          onSubmit={handleCreateVendorSubmit}
          loading={creatingVendor}
        />
      ) : null}

      {editingVendor ? (
        <AddVendorModal
          mode="edit"
          initialValues={vendorToFormValues(editingVendor)}
          onClose={() => setEditingVendor(null)}
          onSubmit={handleUpdateVendorSubmit}
          loading={updatingVendor}
        />
      ) : null}

      <ImportVendorModal
        open={openImportVendorModal}
        loading={importingVendor}
        onClose={() => setOpenImportVendorModal(false)}
        onImport={handleImport}
      />

      {detailsOpen && selectedVendorDetails?._id ? (
        <Vendor360Modal
          vendor={selectedVendorDetails}
          onClose={() => {
            setDetailsOpen(false);
            setSelectedVendorDetails(null);
          }}
          onChanged={() => {
            void fetchVendors();
          }}
        />
      ) : null}

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
