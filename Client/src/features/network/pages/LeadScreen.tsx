import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import {
  Pencil,
  Trash2,
  Plus,
  Eye,
  Phone,
  Mail,
 
} from "lucide-react";
import Swal from "sweetalert2";

import CreateLeadModal from "../components/CreateLeadModal";
import LeadDetailsModal from "../components/LeadDetailsModal";
import {
  handleGetLeads,
  handleCreateLead,
  handleUpdateLead,
  handleDeleteLead,
  type LeadItem,
  type LeadPayload,
  type LeadStatus,
  type LeadSources,
  type LeadPurpose,
} from "@/services/apiClient";
import { type DatePreset, rangeForPreset } from "@/utils/datePresets";

const DATE_PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All Dates" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "lastWeek", label: "Last Week" },
  { value: "month", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "year", label: "This Year" },
  { value: "lastYear", label: "Last Year" },
  { value: "custom", label: "Custom Date" },
];

const STATUS_OPTIONS: LeadStatus[] = [
  "New",
  "Contacted",
  "Interested",
  "Not Interested",
  "Need to message",
];

const getStatusBadgeStyle = (status: LeadStatus) => {
  switch (status) {
    case "New":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "Contacted":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Interested":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "Not Interested":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Need to message":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};
const SOURCE_OPTIONS: LeadSources[] = [
  "Instagram",
  "WhatsApp",
  "Walk-in",
  "Reference",
  "Member",
  "Events",
];
const getSourceBadgeStyle = (source: LeadSources) => {
  switch (source) {
    case "Instagram":
      return "bg-pink-50 text-pink-700 border-pink-200";

    case "WhatsApp":
      return "bg-green-50 text-green-700 border-green-200";

    case "Walk-in":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "Reference":
      return "bg-purple-50 text-purple-700 border-purple-200";

    case "Member":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "Events":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";

    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const PURPOSE_OPTIONS: LeadPurpose[] = [
  "Events",
  "Supplies",
  "Space Booking (Exhibition)",
  "Space Booking (Corporate Booking)",
  "Framing",
  "Private Booking",
  "Birthday Party",
  "Membership",
  "Volunteering",
  "CSP",
  "Customer Art Work",
  "Co-Working",
  "Handmade Gift",
  "Saler Program",
];



 export const getPurposeBadgeStyle = (source: LeadPurpose) => {
  switch (source) {
    case "Events":
      return "bg-pink-50 text-pink-700 border-pink-200";

    case "Supplies":
      return "bg-green-50 text-green-700 border-green-200";

    case "Space Booking (Exhibition)":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "Space Booking (Corporate Booking)":
      return "bg-purple-50 text-purple-700 border-purple-200";

    case "Framing":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "Private Booking":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";

    case "Birthday Party":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";

    case "Membership":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";

    case "Volunteering":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";

    case "CSP":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";

    case "Customer Art Work":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";

    case "Co-Working":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";


    case "Handmade Gift":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";


    case "Saler Program":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";

    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};


const LeadScreen = () => {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date filter state
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [selectedPurpose, setSelectedPurpose] = useState<string>("all");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<LeadItem | null>(null);

  const [selectedLeadForDetails, setSelectedLeadForDetails] =
    useState<LeadItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Fetch leads from backend API: GET /api/lead
  const fetchLeads = useCallback(
    async (
      customFrom?: string,
      customTo?: string,
      customPurpose?: string,
      signal?: AbortSignal
    ) => {
      try {
        setLoading(true);
        const fDate = customFrom !== undefined ? customFrom : fromDate;
        const tDate = customTo !== undefined ? customTo : toDate;
        const pPurpose =
          customPurpose !== undefined ? customPurpose : selectedPurpose;
        const res = await handleGetLeads(
          {
            fromDate: fDate || undefined,
            toDate: tDate || undefined,
            purpose: pPurpose && pPurpose !== "all" ? pPurpose : undefined,
          },
          signal
        );
        let leadList: LeadItem[] = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        if (pPurpose && pPurpose !== "all") {
          leadList = leadList.filter((item) => item.purpose === pPurpose);
        }
        setLeads(leadList);
      } catch (error: any) {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
          return;
        }
        console.error("Failed to fetch leads:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error?.response?.data?.message || "Failed to load leads from server.",
        });
      } finally {
        setLoading(false);
      }
    },
    [fromDate, toDate, selectedPurpose]
  );

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value as DatePreset;
    setDatePreset(preset);

    if (preset === "all") {
      setFromDate("");
      setToDate("");
      fetchLeads("", "", selectedPurpose);
    } else if (preset === "custom") {
      // User can pick from/to dates
    } else {
      const range = rangeForPreset(preset);
      setFromDate(range.from);
      setToDate(range.to);
      fetchLeads(range.from, range.to, selectedPurpose);
    }
  };

  const handlePurposeFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const nextPurpose = e.target.value;
    setSelectedPurpose(nextPurpose);
    fetchLeads(fromDate, toDate, nextPurpose);
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchLeads(undefined, undefined, undefined, controller.signal);
    return () => controller.abort();
  }, [fetchLeads]);

  // Create or Update lead: POST /api/lead or PATCH /api/lead/:id
  const handleSaveLead = async (payload: LeadPayload, id?: string) => {
    try {
      setIsSubmitting(true);
      if (id) {
        await handleUpdateLead(id, payload);
        Swal.fire({
          icon: "success",
          title: "Lead Updated",
          text: "Lead details have been updated successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await handleCreateLead(payload);
        Swal.fire({
          icon: "success",
          title: "Lead Created",
          text: "New lead has been created successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      }
      setIsCreateModalOpen(false);
      setLeadToEdit(null);
      await fetchLeads();
    } catch (error: any) {
      console.error("Failed to save lead:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error?.response?.data?.message ||
          (Array.isArray(error?.response?.data?.errors)
            ? error.response.data.errors.join(", ")
            : "Failed to save lead."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete lead: DELETE /api/lead/:id
  const handleDelete = async (lead: LeadItem) => {
    const result = await Swal.fire({
      title: "Delete Lead?",
      text: `Are you sure you want to delete lead "${lead.name}"? This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await handleDeleteLead(lead._id);
        setLeads((prev) => prev.filter((item) => item._id !== lead._id));
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Lead has been deleted successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error: any) {
        console.error("Failed to delete lead:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error?.response?.data?.message || "Failed to delete lead.",
        });
      }
    }
  };

  // Inline status change: PATCH /api/lead/:id
   const handleStatusChange = async (lead: LeadItem, newStatus: LeadStatus) => {
    if (lead.status === newStatus) return;

    // Optimistic UI update
    setLeads((prev) =>
      prev.map((item) =>
        item._id === lead._id ? { ...item, status: newStatus } : item
      )
    );
  

    try {
      await handleUpdateLead(lead._id, { status: newStatus });
    } catch (error: any) {
      console.error("Failed to update status:", error);
      await fetchLeads();
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.response?.data?.message || "Failed to update lead status.",
      });
    }
  };

  // Inline source change: PATCH /api/lead/:id
  const handleSourcesChange = async (lead: LeadItem, newSource: LeadSources) => {
    if (lead.source === newSource) return;

    // Optimistic UI update
    setLeads((prev) =>
      prev.map((item) =>
        item._id === lead._id ? { ...item, source: newSource } : item
      )
    );

    try {
      await handleUpdateLead(lead._id, { source: newSource });
    } catch (error: any) {
      console.error("Failed to update source:", error);
      await fetchLeads();
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.response?.data?.message || "Failed to update lead source.",
      });
    }
  };

  // Inline purpose change: PATCH /api/lead/:id
  const handlePurposeChange = async (lead: LeadItem, newPurpose: LeadPurpose) => {
    if (lead.purpose === newPurpose) return;

    // Optimistic UI update
    setLeads((prev) =>
      prev.map((item) =>
        item._id === lead._id ? { ...item, purpose: newPurpose } : item
      )
    );

    try {
      await handleUpdateLead(lead._id, { purpose: newPurpose });
    } catch (error: any) {
      console.error("Failed to update purpose:", error);
      await fetchLeads();
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.response?.data?.message || "Failed to update lead purpose.",
      });
    }
  };

  // Open Edit Modal
  const handleEdit = (lead: LeadItem) => {
    setLeadToEdit(lead);
    setIsCreateModalOpen(true);
  };

  // Open Details Modal
  const handleViewDetails = (lead: LeadItem) => {
    setSelectedLeadForDetails(lead);
    setIsDetailsModalOpen(true);
  };

  const columns = useMemo<MRT_ColumnDef<LeadItem>[]>(
    () => [
      // Index / S.No
      {
        id: "index",
        header: "#",
        size: 50,
        enableSorting: false,
        Cell: ({ row }) => (
          <span className="text-xs font-semibold text-gray-400">
            {row.index + 1}
          </span>
        ),
      },

      // Name
      {
        accessorKey: "name",
        header: "Name",
        size: 170,
        Cell: ({ cell, row }) => (
          <div>
            <span
              onClick={() => handleViewDetails(row.original)}
              className="cursor-pointer font-semibold text-gray-900 hover:text-indigo-600 transition"
            >
              {cell.getValue<string>()}
            </span>
            {row.original.source && (
              <span className="block text-[11px] text-gray-400">
                via {row.original.source}
              </span>
            )}
          </div>
        ),
      },

      // Phone
      {
        accessorKey: "phone",
        header: "Phone Number",
        size: 140,
        Cell: ({ cell }) => {
          const phone = cell.getValue<string>();
          if (!phone) return <span className="text-gray-400 italic text-xs">-</span>;
          return (
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 hover:text-indigo-600"
            >
              <Phone size={13} className="text-gray-400" />
              <span>{phone}</span>
            </a>
          );
        },
      },

      // Email
      {
        accessorKey: "email",
        header: "Email",
        size: 180,
        Cell: ({ cell }) => {
          const email = cell.getValue<string>();
          if (!email) return <span className="text-gray-400 italic text-xs">-</span>;
          return (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-1.5 text-xs text-gray-700 hover:text-indigo-600 truncate max-w-[170px]"
              title={email}
            >
              <Mail size={13} className="text-gray-400 shrink-0" />
              <span className="truncate">{email}</span>
            </a>
          );
        },
      },

      // Status
      {
        accessorKey: "status",
        header: "Status",
        size: 150,
        filterVariant: "select",
        filterSelectOptions: STATUS_OPTIONS,
        Cell: ({ cell, row }) => {
          const currentStatus = (cell.getValue<LeadStatus>() || "New") as LeadStatus;

          return (
            <select
              value={currentStatus}
              onChange={(e) =>
                handleStatusChange(row.original, e.target.value as LeadStatus)
              }
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold outline-none transition cursor-pointer ${getStatusBadgeStyle(
                currentStatus
              )}`}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status} className="bg-white text-gray-800">
                  {status}
                </option>
              ))}
            </select>
          );
        },
      },

      // Source
     {
  accessorKey: "source",
  header: "Source",
  size: 150,
  filterVariant: "select",
  filterSelectOptions: SOURCE_OPTIONS,

  Cell: ({ cell, row }) => {
    const currentSource =
      (cell.getValue<LeadSources>() || "Instagram") as LeadSources;

    return (
      <select
        value={currentSource}
        onChange={(e) =>
          handleSourcesChange(
            row.original,
            e.target.value as LeadSources
          )
        }
        className={`rounded-lg border px-2.5 py-1 text-xs font-semibold outline-none transition cursor-pointer ${getSourceBadgeStyle(
          currentSource
        )}`}
      >
        {SOURCE_OPTIONS.map((source) => (
          <option
            key={source}
            value={source}
            className="bg-white text-gray-800"
          >
            {source}
          </option>
        ))}
      </select>
    );
  },
},

//purpose
{
  accessorKey: "purpose",
  header: "Purpose",
  size: 220,
  filterVariant: "select",
  filterSelectOptions: PURPOSE_OPTIONS,

  Cell: ({ cell, row }) => {
    const currentPurpose =
      (cell.getValue<LeadPurpose>() || "Events") as LeadPurpose;

    return (
      <select
        value={currentPurpose}
        onChange={(e) =>
          handlePurposeChange(
            row.original,
            e.target.value as LeadPurpose
          )
        }
        className="rounded-lg border px-2.5 py-1 text-xs font-semibold outline-none transition cursor-pointer bg-white text-gray-700 border-gray-200"
      >
        {PURPOSE_OPTIONS.map((purpose) => (
          <option
            key={purpose}
            value={purpose}
            className="bg-white text-gray-800"
          >
            {purpose}
          </option>
        ))}
      </select>
    );
  },
},

      // Reason / Note
      {
        accessorKey: "reasonNote",
        header: "Reason / Note",
        size: 200,
        Cell: ({ cell }) => {
          const note = cell.getValue<string>();
          if (!note) return <span className="text-gray-400 italic text-xs">-</span>;
          return (
            <span className="line-clamp-2 text-xs text-gray-600" title={note}>
              {note}
            </span>
          );
        },
      },

      // Date
      {
        accessorKey: "createdAt",
        header: "Date",
        size: 120,
        Cell: ({ cell, row }) => {
          const rawDate = cell.getValue<string>() || row.original.date;
          const staffName = row.original.createdBy?.m_staff_name;
          if (!rawDate && !staffName) return <span className="text-gray-400 italic text-xs">-</span>;
          let dateStr = "";
          if (rawDate) {
            try {
              dateStr = new Date(rawDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
            } catch {
              dateStr = String(rawDate);
            }
          }
          return (
            <div>
              {dateStr && (
                <span className="text-xs text-gray-500 whitespace-nowrap block">
                  {dateStr}
                </span>
              )}
              {staffName && (
                <span
                  className="block text-[11px] text-gray-400 truncate max-w-[120px]"
                  title={`Created by ${staffName}`}
                >
                  by {staffName}
                </span>
              )}
            </div>
          );
        },
      },

      // Actions
      {
        id: "actions",
        header: "Actions",
        size: 110,
        enableSorting: false,
        Cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {/* View Details */}
            <button
              onClick={() => handleViewDetails(row.original)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
              title="View Details"
            >
              <Eye size={16} />
            </button>

            {/* Edit */}
            <button
              onClick={() => handleEdit(row.original)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition"
              title="Edit Lead"
            >
              <Pencil size={16} />
            </button>

            {/* Delete */}
            <button
              onClick={() => handleDelete(row.original)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
              title="Delete Lead"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: leads,
    state: {
      isLoading: loading,
    },
    enableSorting: true,
    enableColumnFilters: true,
    enableGlobalFilter: true,
    positionActionsColumn: "last",
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    },
    muiTablePaperProps: {
      elevation: 0,
      className: "border border-gray-100 rounded-xl shadow-xs overflow-hidden",
    },
    muiTableHeadCellProps: {
      className: "bg-gray-50/80 text-gray-700 font-semibold text-xs py-3",
    },
    muiTableBodyCellProps: {
      className: "py-2.5 text-xs text-gray-700",
    },
  });

  return (
    <div className="w-full space-y-5 p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Leads Management
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Purpose Filter Dropdown */}
          <div className="relative inline-flex items-center">
            <select
              value={selectedPurpose}
              onChange={handlePurposeFilterChange}
              disabled={loading}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs hover:border-gray-300 focus:border-indigo-500 focus:outline-none cursor-pointer disabled:opacity-50"
            >
              <option value="all">All Purposes</option>
              {PURPOSE_OPTIONS.map((purpose) => (
                <option key={purpose} value={purpose}>
                  {purpose}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Preset Dropdown */}
          <div className="relative inline-flex items-center">
            <select
              value={datePreset}
              onChange={handlePresetChange}
              disabled={loading}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs hover:border-gray-300 focus:border-indigo-500 focus:outline-none cursor-pointer disabled:opacity-50"
            >
              {DATE_PRESET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Range Picker */}
          {datePreset === "custom" && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 shadow-xs focus:border-indigo-500 focus:outline-none"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 shadow-xs focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => fetchLeads(fromDate, toDate, selectedPurpose)}
                disabled={loading || (!fromDate && !toDate)}
                className="h-9 inline-flex items-center rounded-lg bg-indigo-600 px-3.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer"
              >
                Apply
              </button>
            </div>
          )}

          {/* Create Lead Button */}
          <button
            onClick={() => {
              setLeadToEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="h-9 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
          >
            <Plus size={18} />
            <span>Create Lead</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Total */}
        {/* <div className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-medium">Total</span>
            <Users size={16} className="text-indigo-500" />
          </div>
          <p className="mt-1.5 text-xl font-bold text-gray-900">{stats.total}</p>
        </div> */}

        {/* New */}
        {/* <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-xs font-medium">New</span>
            <Clock size={16} className="text-blue-500" />
          </div>
          <p className="mt-1.5 text-xl font-bold text-blue-900">{stats.newCount}</p>
        </div> */}

        {/* Contacted */}
        {/* <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-medium">Contacted</span>
            <Phone size={16} className="text-amber-500" />
          </div>
          <p className="mt-1.5 text-xl font-bold text-amber-900">{stats.contacted}</p>
        </div> */}

        {/* Interested */}
        {/* <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-xs font-medium">Interested</span>
            <HelpCircle size={16} className="text-purple-500" />
          </div>
          <p className="mt-1.5 text-xl font-bold text-purple-900">{stats.interested}</p>
        </div> */}

        {/* Converted */}
        {/* <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-medium">Converted</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="mt-1.5 text-xl font-bold text-emerald-900">{stats.converted}</p>
        </div> */}

        {/* Lost */}
        {/* <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-medium">Lost</span>
            <XCircle size={16} className="text-rose-500" />
          </div>
          <p className="mt-1.5 text-xl font-bold text-rose-900">{stats.lost}</p>
        </div> */}
      </div>

      {/* MRT Table */}
      <MaterialReactTable table={table} />

      {/* Create / Edit Lead Modal */}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setLeadToEdit(null);
        }}
        leadToEdit={leadToEdit}
        onSubmit={handleSaveLead}
        isSubmitting={isSubmitting}
      />

      {/* Lead Details Modal */}
      <LeadDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedLeadForDetails(null);
        }}
        lead={selectedLeadForDetails}
        onEdit={(lead) => handleEdit(lead)}
      />
    </div>
  );
};

export default LeadScreen;
