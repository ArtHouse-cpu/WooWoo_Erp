import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Download,
  Eye,
  FileSpreadsheet,
  Hourglass,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  SquarePen,
  Store,
  Trash2,
  Wallet,
  Columns3,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Check,
} from "lucide-react";
import * as XLSX from "xlsx";
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

type SortKey =
  | "name"
  | "company"
  | "totalPurchase"
  | "purchaseFrequency"
  | "totalPaid"
  | "outstandingAmount"
  | "lastPurchaseDate";

const AVATAR_PALETTES = [
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-amber-100", text: "text-amber-800" },
  { bg: "bg-teal-100", text: "text-teal-700" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
];

function getVendorInitials(name?: string): string {
  const cleaned = String(name ?? "").trim();
  if (!cleaned) return "V";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

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
  return `₹${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;
}

function whenDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Smooth SVG Sparkline Graph */
function Sparkline({
  color,
  points,
  fillGradient,
}: {
  color: string;
  points: number[];
  fillGradient?: boolean;
}) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 64;
  const height = 24;
  const step = width / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / range) * (height - 6) - 3;
    return [x, y];
  });

  let path = `M ${coords[0][0]} ${coords[0][1]}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const [x0, y0] = coords[i];
    const [x1, y1] = coords[i + 1];
    const mx = (x0 + x1) / 2;
    path += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
  }

  const fillPath = `${path} L ${width} ${height} L 0 ${height} Z`;
  const gradId = `grad-${color.replace("#", "")}`;

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0">
      {fillGradient && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
      )}
      {fillGradient && <path d={fillPath} fill={`url(#${gradId})`} />}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  const [search, setSearch] = useState("");
  const [kpiFilter, setKpiFilter] = useState<"all" | "csp">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);

  // Sorting state
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Selection state
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Pagination state
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    poc: true,
    company: true,
    totalPurchase: true,
    purchaseFrequency: true,
    totalPaid: true,
    pendingAmount: true,
    lastPurchaseDate: true,
    status: true,
  });

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

  const handleDelete = async (vendor: VendorRow) => {
    const result = await Swal.fire({
      title: "Delete vendor?",
      text: `Are you sure you want to delete ${vendor.name || "this vendor"}? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      await handleDeleteVendor(vendor._id);
      await fetchVendors();
      await Swal.fire({
        title: "Deleted",
        text: "Vendor removed successfully.",
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
  };

  // KPI calculations
  const totalVendors = vendors.length;
  const totalCsp = useMemo(
    () =>
      vendors.filter(
        (v) =>
          Boolean(v.cspLabel) ||
          Boolean((v as unknown as { isCsp?: boolean }).isCsp),
      ).length,
    [vendors],
  );

  const totalPurchaseSum = useMemo(
    () => vendors.reduce((sum, v) => sum + (Number(v.totalPurchase) || 0), 0),
    [vendors],
  );

  const totalPaidSum = useMemo(
    () => vendors.reduce((sum, v) => sum + (Number(v.totalPaid) || 0), 0),
    [vendors],
  );

  const pendingPaymentsSum = useMemo(
    () => vendors.reduce((sum, v) => sum + (Number(v.outstandingAmount) || 0), 0),
    [vendors],
  );

  // Filtered & Searched Data
  const filteredData = useMemo(() => {
    let list = vendors.map((vendor, index) => ({
      id: index + 1,
      ...vendor,
      company: vendor.companyName ?? "",
    }));

    // KPI tab filter
    if (kpiFilter === "csp") {
      list = list.filter(
        (v) =>
          Boolean(v.cspLabel) ||
          Boolean((v as unknown as { isCsp?: boolean }).isCsp),
      );
    }

    // Status filter
    if (statusFilter === "active") {
      list = list.filter((v) => v.status === "Active" || v.isActive !== false);
    } else if (statusFilter === "inactive") {
      list = list.filter((v) => v.status === "Inactive" || v.isActive === false);
    }

    // Search query
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((v) => {
        const pocNames = (v.pointsOfContact || []).map((p) => `${p.name} ${p.mobile}`).join(" ");
        return (
          (v.name || "").toLowerCase().includes(q) ||
          (v.company || "").toLowerCase().includes(q) ||
          (v.mobile || "").toLowerCase().includes(q) ||
          (v.gstin || "").toLowerCase().includes(q) ||
          (v.city || "").toLowerCase().includes(q) ||
          pocNames.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [vendors, kpiFilter, statusFilter, search]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;

      if (sortKey === "name") {
        aVal = a.name?.toLowerCase() || "";
        bVal = b.name?.toLowerCase() || "";
      } else if (sortKey === "company") {
        aVal = (a.companyName || a.company || "").toLowerCase();
        bVal = (b.companyName || b.company || "").toLowerCase();
      } else if (sortKey === "totalPurchase") {
        aVal = Number(a.totalPurchase || 0);
        bVal = Number(b.totalPurchase || 0);
      } else if (sortKey === "purchaseFrequency") {
        aVal = Number(a.purchaseFrequency || 0);
        bVal = Number(b.purchaseFrequency || 0);
      } else if (sortKey === "totalPaid") {
        aVal = Number(a.totalPaid || 0);
        bVal = Number(b.totalPaid || 0);
      } else if (sortKey === "outstandingAmount") {
        aVal = Number(a.outstandingAmount || 0);
        bVal = Number(b.outstandingAmount || 0);
      } else if (sortKey === "lastPurchaseDate") {
        aVal = a.lastPurchaseDate ? new Date(a.lastPurchaseDate).getTime() : 0;
        bVal = b.lastPurchaseDate ? new Date(b.lastPurchaseDate).getTime() : 0;
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const currentPage = Math.min(pageIndex, totalPages);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Selection handlers
  const isAllPageSelected =
    paginatedData.length > 0 && paginatedData.every((r) => selectedRowIds.has(r._id));

  const toggleSelectAllPage = () => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        paginatedData.forEach((r) => next.delete(r._id));
      } else {
        paginatedData.forEach((r) => next.add(r._id));
      }
      return next;
    });
  };

  const toggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else {
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Export to Excel
  const handleExport = () => {
    const exportData = sortedData.map((v, i) => ({
      "#": i + 1,
      "Vendor Name": v.name || "",
      "Point of Contact":
        (v.pointsOfContact || [])
          .map((p) => `${p.name || ""} ${p.mobile || ""}`.trim())
          .filter(Boolean)
          .join(", ") || "—",
      Company: v.companyName || v.company || "—",
      "Company Phone": v.businessPhoneNumber || "",
      "Total Purchase": Number(v.totalPurchase || 0),
      "Purchase Frequency": Number(v.purchaseFrequency || 0),
      "Total Paid": Number(v.totalPaid || 0),
      "Pending Amount": Number(v.outstandingAmount || 0),
      "Last Purchase Date": whenDate(v.lastPurchaseDate),
      Status: v.status || (v.isActive === false ? "Inactive" : "Active"),
      Mobile: v.mobile || "",
      Email: v.email || "",
      City: v.city || "",
      GSTIN: v.gstin || "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendors");
    XLSX.writeFile(wb, `Vendors_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const openVendorDetails = (vendor: VendorTableRow) => {
    setSelectedVendorDetails(vendor);
    setDetailsOpen(true);
  };

  // Generate page numbers array
  const paginationRange = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  }, [currentPage, totalPages]);

  return (
    <div className="p-3 sm:p-5 space-y-4 max-w-[1600px] mx-auto text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Vendors</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Manage all your vendors, purchases, and pending payments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Button */}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer"
          >
            <Download size={15} className="stroke-[2.2]" />
            <span>Export</span>
          </button>

          {/* Import Button */}
          <Can permission={PERMISSIONS.VENDOR_CREATE}>
            <button
              type="button"
              onClick={() => setOpenImportVendorModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-600 shadow-xs hover:bg-slate-50 transition cursor-pointer"
              title="Import Vendors Spreadsheet"
            >
              <FileSpreadsheet size={15} className="text-emerald-600" />
              <span className="hidden md:inline">Import</span>
            </button>
          </Can>

          {/* + Add Vendor Button */}
          <Can permission={PERMISSIONS.VENDOR_CREATE}>
            <button
              type="button"
              onClick={() => {
                setEditingVendor(null);
                setOpenCreateVendorModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6344E7] hover:bg-[#5235D9] text-xs sm:text-sm font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Add Vendor</span>
            </button>
          </Can>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Card 1: Total Vendors */}
        <div className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5F3FF] text-[#7C3AED]">
                <Store size={15} />
              </div>
              <span className="text-xs font-semibold text-slate-500 truncate">Total Vendors</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {loadingVendors ? "..." : totalVendors.toLocaleString("en-IN")}
              </span>
              <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full">
                ↑ +8.7%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">vs last month</span>
          </div>
          <Sparkline color="#7C3AED" points={[10, 18, 14, 25, 20, 28, 24]} />
        </div>

        {/* Card 2: Total CSP */}
        <div className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#059669]">
                <ShieldCheck size={15} />
              </div>
              <span className="text-xs font-semibold text-slate-500 truncate">Total CSP</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {loadingVendors ? "..." : totalCsp.toLocaleString("en-IN")}
              </span>
              <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full">
                ↑ +12.5%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">vs last month</span>
          </div>
          <Sparkline color="#059669" points={[8, 14, 11, 20, 18, 25, 22]} />
        </div>

        {/* Card 3: Total Purchase */}
        <div className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                <ShoppingCart size={15} />
              </div>
              <span className="text-xs font-semibold text-slate-500 truncate">Total Purchase</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                {loadingVendors ? "..." : inr(totalPurchaseSum)}
              </span>
              <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full">
                ↑ +24.8%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">vs last month</span>
          </div>
          <Sparkline color="#2563EB" points={[10, 12, 16, 15, 22, 19, 28]} fillGradient />
        </div>

        {/* Card 4: Total Paid */}
        <div className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFFBEB] text-[#D97706]">
                <Wallet size={15} />
              </div>
              <span className="text-xs font-semibold text-slate-500 truncate">Total Paid</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                {loadingVendors ? "..." : inr(totalPaidSum)}
              </span>
              <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full">
                ↑ +24.8%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">vs last month</span>
          </div>
          <Sparkline color="#D97706" points={[8, 12, 14, 18, 17, 24, 26]} />
        </div>

        {/* Card 5: Pending Payments */}
        <div className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs flex items-center justify-between col-span-2 md:col-span-1">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFF1F2] text-[#E11D48]">
                <Hourglass size={15} />
              </div>
              <span className="text-xs font-semibold text-slate-500 truncate">Pending Payments</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                {loadingVendors ? "..." : inr(pendingPaymentsSum)}
              </span>
              <span className="inline-flex items-center text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded-full">
                0.0%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">vs last month</span>
          </div>
          <Sparkline color="#E11D48" points={[15, 15, 14, 14, 15, 13, 14]} />
        </div>
      </div>

      {/* Filter Tabs & Search / Action Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Left Side: Segmented Filter Tabs */}
        <div className="flex items-center gap-2">
          {/* All Vendors Tab */}
          <button
            type="button"
            onClick={() => {
              setKpiFilter("all");
              setPageIndex(1);
            }}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
              kpiFilter === "all"
                ? "bg-[#6344E7] text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <span>All Vendors</span>
            <span
              className={`rounded-full px-2 py-0.2 text-[10px] font-black ${
                kpiFilter === "all" ? "bg-white/25 text-white" : "bg-white text-slate-600"
              }`}
            >
              {totalVendors}
            </span>
          </button>

          {/* CSP Vendors Tab */}
          <button
            type="button"
            onClick={() => {
              setKpiFilter("csp");
              setPageIndex(1);
            }}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
              kpiFilter === "csp"
                ? "bg-[#6344E7] text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <span>CSP Vendors</span>
            <span
              className={`rounded-full px-2 py-0.2 text-[10px] font-black ${
                kpiFilter === "csp" ? "bg-white/25 text-white" : "bg-white text-slate-600"
              }`}
            >
              {totalCsp}
            </span>
          </button>
        </div>

        {/* Right Side: Search + Filters + Column Visibility */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-72 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPageIndex(1);
              }}
              placeholder="Search vendor by name, phone, company..."
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#6344E7] focus:outline-hidden focus:ring-1 focus:ring-[#6344E7]"
            />
          </div>

          {/* Filters Toggle Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowFiltersDropdown(!showFiltersDropdown);
                setShowColumnsDropdown(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                statusFilter !== "all" || showFiltersDropdown
                  ? "border-[#6344E7] bg-purple-50/70 text-[#6344E7]"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Filters</span>
              {statusFilter !== "all" && (
                <span className="h-2 w-2 rounded-full bg-[#6344E7]" />
              )}
            </button>

            {/* Filters Dropdown Menu */}
            {showFiltersDropdown && (
              <div className="absolute right-0 top-full mt-1.5 z-30 w-52 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl">
                <span className="block text-xs font-black text-slate-700 mb-2">Filter by Status</span>
                <div className="space-y-1">
                  {(["all", "active", "inactive"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setStatusFilter(st);
                        setPageIndex(1);
                        setShowFiltersDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                        statusFilter === st
                          ? "bg-[#6344E7] text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>{st === "all" ? "All Statuses" : st}</span>
                      {statusFilter === st && <Check size={13} strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columns Visibility Toggle Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowColumnsDropdown(!showColumnsDropdown);
                setShowFiltersDropdown(false);
              }}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              title="Column Visibility"
            >
              <Columns3 size={15} />
            </button>

            {/* Column Visibility Dropdown */}
            {showColumnsDropdown && (
              <div className="absolute right-0 top-full mt-1.5 z-30 w-56 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl">
                <span className="block text-xs font-black text-slate-700 mb-2">Toggle Columns</span>
                <div className="space-y-1.5 text-xs">
                  {Object.entries({
                    poc: "Point of Contact",
                    company: "Company",
                    totalPurchase: "Total Purchase",
                    purchaseFrequency: "Purchase Frequency",
                    totalPaid: "Total Paid",
                    pendingAmount: "Pending Amount",
                    lastPurchaseDate: "Last Purchase Date",
                    status: "Status",
                  }).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900">
                      <input
                        type="checkbox"
                        checked={visibleColumns[key] ?? true}
                        onChange={(e) =>
                          setVisibleColumns((prev) => ({
                            ...prev,
                            [key]: e.target.checked,
                          }))
                        }
                        className="rounded border-slate-300 text-[#6344E7] focus:ring-[#6344E7]"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Card (Desktop WebView) */}
      <div className="hidden md:block rounded-2xl border border-slate-100 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-slate-100 bg-white text-slate-700 font-bold">
                {/* Index Col */}
                <th className="py-3 px-3 w-10 text-center text-slate-400 font-semibold">#</th>

                {/* Checkbox Col */}
                <th className="py-3 px-2 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleSelectAllPage}
                    className="h-4 w-4 rounded border-slate-300 text-[#6344E7] focus:ring-[#6344E7] cursor-pointer"
                  />
                </th>

                {/* Vendor Name */}
                <th className="py-3 px-3">
                  <button
                    type="button"
                    onClick={() => handleSort("name")}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    <span>Vendor Name</span>
                    {sortKey === "name" ? (
                      sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                    ) : (
                      <ArrowUpDown size={12} className="text-slate-400" />
                    )}
                  </button>
                </th>

                {/* Point of Contact */}
                {visibleColumns.poc && <th className="py-3 px-3">Point of Contact</th>}

                {/* Company */}
                {visibleColumns.company && (
                  <th className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => handleSort("company")}
                      className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                    >
                      <span>Company</span>
                      {sortKey === "company" ? (
                        sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                      ) : (
                        <ArrowUpDown size={12} className="text-slate-400" />
                      )}
                    </button>
                  </th>
                )}

                {/* Total Purchase */}
                {visibleColumns.totalPurchase && (
                  <th className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => handleSort("totalPurchase")}
                      className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                    >
                      <span>Total Purchase</span>
                      {sortKey === "totalPurchase" ? (
                        sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                      ) : (
                        <ArrowUpDown size={12} className="text-slate-400" />
                      )}
                    </button>
                  </th>
                )}

                {/* Purchase Frequency */}
                {visibleColumns.purchaseFrequency && (
                  <th className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => handleSort("purchaseFrequency")}
                      className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                    >
                      <span>Purchase Frequency</span>
                      {sortKey === "purchaseFrequency" ? (
                        sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                      ) : (
                        <ArrowUpDown size={12} className="text-slate-400" />
                      )}
                    </button>
                  </th>
                )}

                {/* Total Paid */}
                {visibleColumns.totalPaid && (
                  <th className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => handleSort("totalPaid")}
                      className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                    >
                      <span>Total Paid</span>
                      {sortKey === "totalPaid" ? (
                        sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                      ) : (
                        <ArrowUpDown size={12} className="text-slate-400" />
                      )}
                    </button>
                  </th>
                )}

                {/* Pending Amount */}
                {visibleColumns.pendingAmount && (
                  <th className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => handleSort("outstandingAmount")}
                      className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                    >
                      <span>Pending Amount</span>
                      {sortKey === "outstandingAmount" ? (
                        sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                      ) : (
                        <ArrowUpDown size={12} className="text-slate-400" />
                      )}
                    </button>
                  </th>
                )}

                {/* Last Purchase Date */}
                {visibleColumns.lastPurchaseDate && (
                  <th className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => handleSort("lastPurchaseDate")}
                      className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                    >
                      <span>Last Purchase Date</span>
                      {sortKey === "lastPurchaseDate" ? (
                        sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                      ) : (
                        <ArrowUpDown size={12} className="text-slate-400" />
                      )}
                    </button>
                  </th>
                )}

                {/* Status */}
                {visibleColumns.status && <th className="py-3 px-3">Status</th>}

                {/* Actions */}
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-50">
              {loadingVendors && sortedData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    Loading vendors...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    No vendors found
                  </td>
                </tr>
              ) : (
                paginatedData.map((vendor, index) => {
                  const globalIndex = (currentPage - 1) * pageSize + index + 1;
                  const isChecked = selectedRowIds.has(vendor._id);
                  const palette = AVATAR_PALETTES[index % AVATAR_PALETTES.length];
                  const initials = getVendorInitials(vendor.name);

                  // Points of Contact
                  const contacts = (vendor.pointsOfContact || []).filter(
                    (item) => item.name?.trim() || item.mobile?.trim(),
                  );
                  const primaryPoc = contacts[0];

                  const company = vendor.companyName || vendor.company;
                  const companyPhone = vendor.businessPhoneNumber;

                  const isActive = vendor.status === "Active" || vendor.isActive !== false;

                  return (
                    <tr
                      key={vendor._id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isChecked ? "bg-purple-50/30" : ""
                      }`}
                    >
                      {/* Index */}
                      <td className="py-3 px-3 text-center text-slate-500 font-medium">
                        {globalIndex}
                      </td>

                      {/* Checkbox */}
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectRow(vendor._id)}
                          className="h-4 w-4 rounded border-slate-300 text-[#6344E7] focus:ring-[#6344E7] cursor-pointer"
                        />
                      </td>

                      {/* Vendor Name + Initials Avatar */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black uppercase ${palette.bg} ${palette.text}`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => openVendorDetails(vendor)}
                              className="font-extrabold text-[#2563EB] hover:underline cursor-pointer text-left truncate block max-w-[200px]"
                              title={`View ${vendor.name} 360`}
                            >
                              {vendor.name || "—"}
                            </button>
                            {vendor.cspLabel && (
                              <span className="inline-flex rounded-full bg-violet-100 px-1.5 py-0.2 text-[9px] font-bold text-violet-700">
                                {vendor.cspLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Point of Contact */}
                      {visibleColumns.poc && (
                        <td className="py-3 px-3">
                          {primaryPoc ? (
                            <div className="min-w-0 leading-tight">
                              {primaryPoc.mobile ? (
                                <p className="font-medium text-slate-800">{primaryPoc.mobile}</p>
                              ) : null}
                              {primaryPoc.name ? (
                                <p className="text-[11px] text-slate-500 truncate">{primaryPoc.name}</p>
                              ) : null}
                            </div>
                          ) : vendor.mobile ? (
                            <span className="font-medium text-slate-800">{vendor.mobile}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      )}

                      {/* Company */}
                      {visibleColumns.company && (
                        <td className="py-3 px-3">
                          {company ? (
                            <div className="min-w-0 leading-tight">
                              <p className="font-semibold text-slate-800 truncate max-w-[180px]">
                                {company}
                              </p>
                              {companyPhone ? (
                                <p className="text-[11px] text-slate-500">{companyPhone}</p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      )}

                      {/* Total Purchase */}
                      {visibleColumns.totalPurchase && (
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {inr(vendor.totalPurchase)}
                        </td>
                      )}

                      {/* Purchase Frequency */}
                      {visibleColumns.purchaseFrequency && (
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          {Number(vendor.purchaseFrequency || 0)}
                        </td>
                      )}

                      {/* Total Paid */}
                      {visibleColumns.totalPaid && (
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {inr(vendor.totalPaid)}
                        </td>
                      )}

                      {/* Pending Amount */}
                      {visibleColumns.pendingAmount && (
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {inr(vendor.outstandingAmount)}
                        </td>
                      )}

                      {/* Last Purchase Date */}
                      {visibleColumns.lastPurchaseDate && (
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {whenDate(vendor.lastPurchaseDate)}
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.status && (
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              isActive
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                : "bg-rose-50 text-rose-700 border border-rose-200/60"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isActive ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                            />
                            <span>{isActive ? "Active" : "Inactive"}</span>
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Ledger */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVendorForLedger(vendor);
                              setOpenLedgerModal(true);
                            }}
                            title="View Ledger"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Edit Vendor */}
                          <Can permission={PERMISSIONS.VENDOR_UPDATE}>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenCreateVendorModal(false);
                                setEditingVendor(vendor);
                              }}
                              title="Edit Vendor"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition cursor-pointer"
                            >
                              <SquarePen size={14} />
                            </button>
                          </Can>

                          {/* Delete Vendor */}
                          <Can permission={PERMISSIONS.VENDOR_DELETE}>
                            <button
                              type="button"
                              onClick={() => handleDelete(vendor)}
                              title="Delete Vendor"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </Can>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-100 text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-bold text-slate-800">
              {sortedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>
            –
            <span className="font-bold text-slate-800">
              {Math.min(currentPage * pageSize, sortedData.length)}
            </span>{" "}
            of <span className="font-bold text-slate-800">{sortedData.length}</span> vendors
          </div>

          <div className="flex items-center gap-3">
            {/* Rows per page */}
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPageIndex(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                {[10, 25, 50, 100].map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              {/* First Page */}
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPageIndex(1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft size={14} />
              </button>

              {/* Prev Page */}
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Page Number Buttons */}
              {paginationRange.map((pageItem, idx) =>
                pageItem === "..." ? (
                  <span key={`dots-${idx}`} className="px-1 text-slate-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${pageItem}`}
                    type="button"
                    onClick={() => setPageIndex(Number(pageItem))}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition cursor-pointer ${
                      currentPage === pageItem
                        ? "bg-[#6344E7] text-white shadow-2xs"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {pageItem}
                  </button>
                ),
              )}

              {/* Next Page */}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setPageIndex((p) => Math.min(totalPages, p + 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Next Page"
              >
                <ChevronRight size={14} />
              </button>

              {/* Last Page */}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setPageIndex(totalPages)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Card List View (Small Screens) */}
      <div className="block md:hidden space-y-2.5">
        {loadingVendors && sortedData.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            Loading vendors...
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            No vendors found
          </div>
        ) : (
          paginatedData.map((vendor, index) => {
            const palette = AVATAR_PALETTES[index % AVATAR_PALETTES.length];
            const initials = getVendorInitials(vendor.name);
            const isActive = vendor.status === "Active" || vendor.isActive !== false;

            return (
              <div
                key={vendor._id}
                onClick={() => openVendorDetails(vendor)}
                className="cursor-pointer rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs transition hover:border-slate-300 active:bg-slate-50/70"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black uppercase ${palette.bg} ${palette.text}`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-bold text-slate-900">
                          {vendor.name}
                        </span>
                        {vendor.cspLabel && (
                          <span className="inline-flex rounded-full bg-violet-100 px-1.5 py-0.2 text-[9px] font-bold text-violet-700">
                            {vendor.cspLabel}
                          </span>
                        )}
                      </div>
                      {vendor.company && vendor.company !== "—" && (
                        <p className="mt-0.5 text-xs font-medium text-slate-600 truncate">
                          {vendor.company}
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1 ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                        : "bg-rose-50 text-rose-700 border border-rose-200/60"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-rose-500"}`}
                    />
                    <span>{isActive ? "Active" : "Inactive"}</span>
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="block text-[10px] font-medium uppercase text-slate-400">
                        Total Purchase
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {inr(vendor.totalPurchase)}
                      </span>
                    </div>
                    {vendor.outstandingAmount !== undefined && (
                      <div>
                        <span className="block text-[10px] font-medium uppercase text-slate-400">
                          Due
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            Number(vendor.outstandingAmount) > 0
                              ? "text-rose-600"
                              : "text-slate-600"
                          }`}
                        >
                          {inr(vendor.outstandingAmount)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVendorForLedger(vendor);
                        setOpenLedgerModal(true);
                      }}
                      className="cursor-pointer rounded-lg bg-indigo-50 p-1.5 text-indigo-700 hover:bg-indigo-100"
                      title="View Ledger"
                    >
                      <Eye size={15} />
                    </button>
                    <Can permission={PERMISSIONS.VENDOR_UPDATE}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenCreateVendorModal(false);
                          setEditingVendor(vendor);
                        }}
                        className="cursor-pointer rounded-lg bg-blue-50 p-1.5 text-blue-700 hover:bg-blue-100"
                        title="Edit Vendor"
                      >
                        <SquarePen size={15} />
                      </button>
                    </Can>
                    <Can permission={PERMISSIONS.VENDOR_DELETE}>
                      <button
                        type="button"
                        onClick={() => handleDelete(vendor)}
                        className="cursor-pointer rounded-lg bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100"
                        title="Delete Vendor"
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setPageIndex((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
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
