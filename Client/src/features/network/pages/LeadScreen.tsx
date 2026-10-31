import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import { Pencil,
  Search, Trash2, Plus, Eye, Phone, Paperclip } from "lucide-react";
import Swal from "sweetalert2";

import CreateLeadModal from "../components/CreateLeadModal";
import LeadDetailsModal from "../components/LeadDetailsModal";
import LeadMembershipBadge from "../components/LeadMembershipBadge";
import StaffVerifyModal from "@/features/sales/components/invoice/Modal/StaffVerifyModal";
import {
  handleGetLeads,
  handleCreateLead,
  handleUpdateLead,
  handleDeleteLead,
  handleGetAccessStaff,
  type LeadItem,
  type LeadPayload,
  type LeadStatus,
  type LeadSources,
  type LeadPurpose,
  type VerifiedStaff,
} from "@/services/apiClient";
import { type DatePreset, rangeForPreset } from "@/utils/datePresets";
import { UNSAFE_RSCDefaultRootErrorBoundary } from "react-router-dom";

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
  "Contact Tomorrow",
  "Contact in 2 Days",
  "Come for Visit",
  "Shared Quotation",
  "Negotiation",
  "Follow Up (Custom)",
  "Converted",
  "Not Interested",
  "Lost",
  "Need to message",
];

const SOURCE_OPTIONS: LeadSources[] = [
  "Instagram",
  "WhatsApp",
  "Walk-in",
  "Reference",
  "Member",
  "Events",
];

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
  "Hiring",
  "CSP",
  "Customer Art Work",
  "Co-Working",
  "Handmade Gift",
  "Atives",
  "Woorkshop",
  "Exhibition",
  "Other",
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

    case "Hiring":
      return "bg-green-50 text-green-700 border-green-200";

    case "Customer Art Work":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";

    case "Co-Working":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";

    case "Handmade Gift":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";

    case "Atives":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";

    case "Woorkshop":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";

    case "Exhibition":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";

    case "Other":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const LeadScreen = () => {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date filter state (default: this month)
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [fromDate, setFromDate] = useState<string>(
    () => rangeForPreset("month").from,
  );
  const [toDate, setToDate] = useState<string>(
    () => rangeForPreset("month").to,
  );
  const [selectedPurpose, setSelectedPurpose] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedAssign, setSelectedAssign] = useState<string>("all");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<LeadItem | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingLeadPayload, setPendingLeadPayload] =
    useState<LeadPayload | null>(null);

  const [selectedLeadForDetails, setSelectedLeadForDetails] =
    useState<LeadItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");

  const filteredLeads = useMemo(() => {
    if (!mobileSearch.trim()) return leads;
    const q = mobileSearch.toLowerCase();
    return leads.filter(
      (l) =>
        (l.name || "").toLowerCase().includes(q) ||
        (l.mobile || "").toLowerCase().includes(q) ||
        (l.email || "").toLowerCase().includes(q) ||
        (l.purpose || "").toLowerCase().includes(q) ||
        (l.status || "").toLowerCase().includes(q) ||
        (l.source || "").toLowerCase().includes(q) ||
        (l.assignedTo?.m_staff_name || "").toLowerCase().includes(q),
    );
  }, [leads, mobileSearch]);

  // Staff users for Assign dropdown filter
  const [staffUsers, setStaffUsers] = useState<{ id: string; name: string }[]>(
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    const loadStaff = async () => {
      try {
        const res = await handleGetAccessStaff("", controller.signal);
        const list = Array.isArray(res?.staff) ? res.staff : [];
        const mapped = list
          .map((item: any) => ({
            id: String(item?.m_staff_id ?? item?._id ?? "").trim(),
            name: String(item?.fullName ?? item?.name ?? "").trim(),
          }))
          .filter((item: { id: string; name: string }) => Boolean(item.name));
        setStaffUsers(mapped);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Failed to load staff users:", err);
        }
      }
    };
    loadStaff();
    return () => controller.abort();
  }, []);

  const availableStaffNames = useMemo(() => {
    const nameSet = new Set<string>();
    staffUsers.forEach((s) => {
      if (s.name) nameSet.add(s.name);
    });
    leads.forEach((l) => {
      const name = l.assignedTo?.m_staff_name?.trim();
      if (name && name !== "Assigned" && name !== "Unassigned") {
        nameSet.add(name);
      }
    });
    return Array.from(nameSet).sort((a, b) => a.localeCompare(b));
  }, [staffUsers, leads]);

  // Fetch leads from backend API: GET /api/lead
  const fetchLeads = useCallback(
    async (
      customFrom?: string,
      customTo?: string,
      customPurpose?: string,
      customStatus?: string,
      customSource?: string,
      customAssign?: string,
      signal?: AbortSignal,
    ) => {
      try {
        setLoading(true);
        const fDate = customFrom !== undefined ? customFrom : fromDate;
        const tDate = customTo !== undefined ? customTo : toDate;
        const pPurpose =
          customPurpose !== undefined ? customPurpose : selectedPurpose;
        const pStatus =
          customStatus !== undefined ? customStatus : selectedStatus;
        const pSource =
          customSource !== undefined ? customSource : selectedSource;
        const pAssign =
          customAssign !== undefined ? customAssign : selectedAssign;

        const res = await handleGetLeads(
          {
            fromDate: fDate || undefined,
            toDate: tDate || undefined,
            purpose: pPurpose && pPurpose !== "all" ? pPurpose : undefined,
            status: pStatus && pStatus !== "all" ? pStatus : undefined,
            source: pSource && pSource !== "all" ? pSource : undefined,
            assignedTo: pAssign && pAssign !== "all" ? pAssign : undefined,
          },
          signal,
        );

        let leadList: LeadItem[] = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];

        // Client-side fallback filtering
        if (pPurpose && pPurpose !== "all") {
          leadList = leadList.filter((item) => item.purpose === pPurpose);
        }
        if (pStatus && pStatus !== "all") {
          leadList = leadList.filter((item) => item.status === pStatus);
        }
        if (pSource && pSource !== "all") {
          leadList = leadList.filter((item) => item.source === pSource);
        }
        if (pAssign && pAssign !== "all") {
          if (pAssign === "unassigned") {
            leadList = leadList.filter(
              (item) =>
                !item.assignedTo ||
                (!item.assignedTo.m_staff_name &&
                  !item.assignedTo.m_staff_id) ||
                item.assignedTo.m_staff_name?.trim() === "",
            );
          } else {
            leadList = leadList.filter(
              (item) =>
                item.assignedTo?.m_staff_name?.toLowerCase() ===
                  pAssign.toLowerCase() ||
                item.assignedTo?.m_staff_id === pAssign,
            );
          }
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
          text:
            error?.response?.data?.message ||
            "Failed to load leads from server.",
        });
      } finally {
        setLoading(false);
      }
    },
    [
      fromDate,
      toDate,
      selectedPurpose,
      selectedStatus,
      selectedSource,
      selectedAssign,
    ],
  );

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value as DatePreset;
    setDatePreset(preset);

    if (preset === "all") {
      setFromDate("");
      setToDate("");
      fetchLeads(
        "",
        "",
        selectedPurpose,
        selectedStatus,
        selectedSource,
        selectedAssign,
      );
    } else if (preset === "custom") {
      // User can pick from/to dates
    } else {
      const range = rangeForPreset(preset);
      setFromDate(range.from);
      setToDate(range.to);
      fetchLeads(
        range.from,
        range.to,
        selectedPurpose,
        selectedStatus,
        selectedSource,
        selectedAssign,
      );
    }
  };

  const handleAssignFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const nextAssign = e.target.value;
    setSelectedAssign(nextAssign);
    fetchLeads(
      fromDate,
      toDate,
      selectedPurpose,
      selectedStatus,
      selectedSource,
      nextAssign,
    );
  };

  const handleStatusFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const nextStatus = e.target.value;
    setSelectedStatus(nextStatus);
    fetchLeads(
      fromDate,
      toDate,
      selectedPurpose,
      nextStatus,
      selectedSource,
      selectedAssign,
    );
  };

  const handleSourceFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const nextSource = e.target.value;
    setSelectedSource(nextSource);
    fetchLeads(
      fromDate,
      toDate,
      selectedPurpose,
      selectedStatus,
      nextSource,
      selectedAssign,
    );
  };

  const handlePurposeFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const nextPurpose = e.target.value;
    setSelectedPurpose(nextPurpose);
    fetchLeads(
      fromDate,
      toDate,
      nextPurpose,
      selectedStatus,
      selectedSource,
      selectedAssign,
    );
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchLeads(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      controller.signal,
    );
    return () => controller.abort();
  }, [fetchLeads]);

  // Refresh leads if created from global Header
  useEffect(() => {
    const handleLeadCreated = () => {
      fetchLeads();
    };
    window.addEventListener("lead-created", handleLeadCreated);
    return () => {
      window.removeEventListener("lead-created", handleLeadCreated);
    };
  }, [fetchLeads]);

  // Create or Update lead: POST /api/lead or PATCH /api/lead/:id
  const handleSaveLead = async (payload: LeadPayload, id?: string) => {
    if (id) {
      try {
        setIsSubmitting(true);
        await handleUpdateLead(id, payload);
        Swal.fire({
          icon: "success",
          title: "Lead Updated",
          text: "Lead details have been updated successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
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
              : "Failed to update lead."),
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // For creating new lead, stash payload and open PIN verification modal
      setPendingLeadPayload(payload);
      setIsPinModalOpen(true);
    }
  };

  // Called after Staff PIN is verified in StaffVerifyModal
  const handlePinVerified = async ({ staff }: { staff: VerifiedStaff }) => {
    if (!pendingLeadPayload) return;
    try {
      setIsSubmitting(true);
      const payloadWithStaff: LeadPayload = {
        ...pendingLeadPayload,
        createdBy: {
          m_staff_id: staff.staffId || staff.m_staff_id || staff._id,
          m_staff_name: staff.staffName || staff.name,
          m_staff_email: staff.email || "",
        },
      };

      await handleCreateLead(payloadWithStaff);

      setIsPinModalOpen(false);
      setIsCreateModalOpen(false);
      setPendingLeadPayload(null);
      setLeadToEdit(null);

      Swal.fire({
        icon: "success",
        title: "Lead Created",
        text: "New lead has been created successfully.",
        timer: 1500,
        showConfirmButton: false,
      });

      await fetchLeads();
    } catch (error: any) {
      console.error("Failed to create lead:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error?.response?.data?.message ||
          (Array.isArray(error?.response?.data?.errors)
            ? error.response.data.errors.join(", ")
            : "Failed to create lead."),
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
        item._id === lead._id ? { ...item, status: newStatus } : item,
      ),
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
  const handleSourcesChange = async (
    lead: LeadItem,
    newSource: LeadSources,
  ) => {
    if (lead.source === newSource) return;

    // Optimistic UI update
    setLeads((prev) =>
      prev.map((item) =>
        item._id === lead._id ? { ...item, source: newSource } : item,
      ),
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
  const handlePurposeChange = async (
    lead: LeadItem,
    newPurpose: LeadPurpose,
  ) => {
    if (lead.purpose === newPurpose) return;

    // Optimistic UI update
    setLeads((prev) =>
      prev.map((item) =>
        item._id === lead._id ? { ...item, purpose: newPurpose } : item,
      ),
    );

    try {
      await handleUpdateLead(lead._id, { purpose: newPurpose });
    } catch (error: any) {
      console.error("Failed to update purpose:", error);
      await fetchLeads();
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error?.response?.data?.message || "Failed to update lead purpose.",
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
        size: 15,
        enableSorting: false,
        Cell: ({ row }) => (
          <span className="text-xs font-semibold text-gray-400">
            {row.index + 1}
          </span>
        ),
      },

      // Lead ID
      {
        accessorKey: "leadId",
        header: "Lead ID",
        size: 110,
        Cell: ({ cell, row }) => {
          const id =
            cell.getValue<string>() ||
            (row.original._id
              ? `LEAD-${row.original._id.slice(-6).toUpperCase()}`
              : "-");
          return (
            <button
              type="button"
              onClick={() => handleViewDetails(row.original)}
              className="inline-flex cursor-pointer items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 shadow-2xs hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition"
              title="Click to view lead details"
            >
              {id}
            </button>
          );
        },
      },

      // Name
      {
        accessorKey: "name",
        header: "Name",
        size: 100,
        Cell: ({ cell, row }) => (
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                onClick={() => handleViewDetails(row.original)}
                className="cursor-pointer font-semibold text-gray-900 hover:text-indigo-600 transition"
              >
                {cell.getValue<string>()}
              </span>
              {row.original.attachments &&
                row.original.attachments.length > 0 && (
                  <span
                    onClick={() => handleViewDetails(row.original)}
                    className="inline-flex cursor-pointer items-center gap-0.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 hover:bg-indigo-100 transition"
                    title={`${row.original.attachments.length} media/document(s) attached`}
                  >
                    <Paperclip size={10} />
                    {row.original.attachments.length}
                  </span>
                )}
            </div>
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
        Cell: ({ cell, row }) => {
          const phone = cell.getValue<string>();
          if (!phone)
            return <span className="text-gray-400 italic text-xs">-</span>;
          return (
            <div className="flex flex-col items-start gap-1">
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 hover:text-indigo-600"
              >
                <Phone size={13} className="text-gray-400" />
                <span>{phone}</span>
              </a>
              <LeadMembershipBadge membership={row.original.membership} />
            </div>
          );
        },
      },

      // Status
      {
        accessorKey: "status",
        header: "Status",
        size: 140,
        Cell: ({ cell }) => {
          const status = cell.getValue<LeadStatus>();
          const badgeStyle =
            status === "Converted"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : status === "Interested"
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : status === "Contacted"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : status === "New"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : status === "Not Interested"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-gray-50 text-gray-700 border-gray-200";

          return (
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${badgeStyle}`}
            >
              {status}
            </span>
          );
        },
      },

      // Source
      {
        accessorKey: "source",
        header: "Source",
        size: 140,
      },

      //purpose
      {
        accessorKey: "purpose",
        header: "Purpose",
        size: 140,
      },

      //deadline

      {
        accessorKey: "deadline",
        header: "Deadline",
        size: 130,
        Cell: ({ row }) => {
          const deadline = row.original.deadline;

          if (!deadline) {
            return (
              <span className="text-gray-400 italic text-xs">No deadline</span>
            );
          }
          const deadlineStr =
            typeof deadline === "string" && deadline.includes("T")
              ? deadline.split("T")[0]
              : String(deadline).slice(0, 10);
          const deadlineDate = new Date(`${deadlineStr}T23:59:59`);
          const today = new Date();

          const isOverdue =
            !isNaN(deadlineDate.getTime()) && deadlineDate < today;

          return (
            <div className="flex flex-col gap-0.5">
              <span
                className={`inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                  isOverdue
                    ? "bg-red-50 text-red-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {new Date(`${deadlineStr}T00:00:00`).toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  },
                )}
              </span>

              {isOverdue && (
                <span className="text-[10px] font-medium text-red-500">
                  Overdue
                </span>
              )}
            </div>
          );
        },
      },

      // Assigned To
      {
        accessorKey: "assignedTo.m_staff_name",
        header: "Assigned To",
        size: 100,
        Cell: ({ row }) => {
          const assigned = row.original.assignedTo?.m_staff_name;
          return assigned ? (
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {assigned}
            </span>
          ) : (
            <span className="text-gray-400 italic text-xs">Unassigned</span>
          );
        },
      },

      // Reason / Note
      {
        accessorKey: "reasonNote",
        header: "Reason / Note",
        size: 100,
        Cell: ({ cell }) => {
          const note = cell.getValue<string>();
          if (!note)
            return <span className="text-gray-400 italic text-xs">-</span>;
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
        size: 100,
        Cell: ({ cell, row }) => {
          const rawDate = cell.getValue<string>() || row.original.date;
          const staffName = row.original.createdBy?.m_staff_name;
          if (!rawDate && !staffName)
            return <span className="text-gray-400 italic text-xs">-</span>;
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
        size: 140,
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
    [],
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
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
              Leads
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 sm:px-3 py-1 text-xs font-semibold text-indigo-700 shadow-2xs whitespace-nowrap">
              Total Leads:{" "}
              <span className="font-bold text-indigo-900">{leads.length}</span>
            </span>
          </div>

          {/* Create Lead Button on mobile parallel to Lead text */}
          <button
            type="button"
            onClick={() => {
              setLeadToEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="sm:hidden inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-[0.98] transition cursor-pointer shrink-0"
          >
            <Plus size={16} className="shrink-0" />
            <span>Create Lead</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5">
          {/* Assign Filter Dropdown (Staff names & Unassigned) */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedAssign}
              onChange={handleAssignFilterChange}
              disabled={loading}
              className="h-9 w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs hover:border-gray-300 focus:border-indigo-500 focus:outline-none cursor-pointer disabled:opacity-50 truncate"
            >
              <option value="all">Assign: All</option>
              <option value="unassigned">Unassigned</option>
              {availableStaffNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedStatus}
              onChange={handleStatusFilterChange}
              disabled={loading}
              className="h-9 w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs hover:border-gray-300 focus:outline-none cursor-pointer disabled:opacity-50 truncate"
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedSource}
              onChange={handleSourceFilterChange}
              disabled={loading}
              className="h-9 w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs hover:border-gray-300 focus:border-indigo-500 focus:outline-none cursor-pointer disabled:opacity-50 truncate"
            >
              <option value="all">All Sources</option>

              {SOURCE_OPTIONS.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>

          {/* Purpose Filter Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedPurpose}
              onChange={handlePurposeFilterChange}
              disabled={loading}
              className="h-9 w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs hover:border-gray-300 focus:border-indigo-500 focus:outline-none cursor-pointer disabled:opacity-50 truncate"
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
          <div className="relative col-span-2 sm:col-span-1 w-full sm:w-auto">
            <select
              value={datePreset}
              onChange={handlePresetChange}
              disabled={loading}
              className="h-9 w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs hover:border-gray-300 focus:border-indigo-500 focus:outline-none cursor-pointer disabled:opacity-50 truncate"
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
            <div className="col-span-2 flex items-center gap-1.5 w-full sm:w-auto">
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 flex-1 sm:w-auto rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 shadow-xs focus:border-indigo-500 focus:outline-none"
              />
              <span className="text-xs text-gray-400 shrink-0">to</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 flex-1 sm:w-auto rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 shadow-xs focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  fetchLeads(
                    fromDate,
                    toDate,
                    selectedPurpose,
                    selectedStatus,
                    selectedSource,
                    selectedAssign,
                  )
                }
                disabled={loading || (!fromDate && !toDate)}
                className="h-9 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer shrink-0"
              >
                Apply
              </button>
            </div>
          )}

          {/* Create Lead Button (Desktop only) */}
          <button
            type="button"
            onClick={() => {
              setLeadToEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="hidden sm:inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
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
            value={mobileSearch}
            onChange={(e) => setMobileSearch(e.target.value)}
            placeholder="Search leads..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-slate-400"
          />
        </div>

        {loading && leads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            Loading leads...
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            No leads found
          </div>
        ) : (
          filteredLeads.map((lead, idx) => {
            const status = lead.status;
            const badgeStyle =
              status === "Converted"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : status === "Interested"
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : status === "Contacted"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : status === "New"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : status === "Not Interested" || status === "Lost"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-gray-50 text-gray-700 border-gray-200";

            return (
              <div
                key={lead._id || idx}
                onClick={() => handleViewDetails(lead)}
                className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition hover:border-slate-300 active:bg-slate-50/70"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-slate-900">
                        {lead.name}
                      </span>
                      {lead.purpose && (
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.2 text-[10px] font-semibold ${getPurposeBadgeStyle(
                            lead.purpose,
                          )}`}
                        >
                          {lead.purpose}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {lead.mobile && (
                        <span className="font-medium text-slate-700">
                          {lead.mobile}
                        </span>
                      )}
                      {lead.email && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[150px]">
                            {lead.email}
                          </span>
                        </>
                      )}
                      {lead.source && (
                        <>
                          <span>•</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600">
                            {lead.source}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badgeStyle}`}
                  >
                    {lead.status || "New"}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <div className="text-xs text-slate-500">
                    {lead.assignedTo?.m_staff_name ? (
                      <span>
                        Assigned:{" "}
                        <b className="text-slate-700">
                          {lead.assignedTo.m_staff_name}
                        </b>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </div>

                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {lead.mobile && (
                      <a
                        href={`tel:${lead.mobile}`}
                        className="cursor-pointer rounded-lg bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100"
                        title="Call Lead"
                      >
                        <Phone size={15} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(lead);
                      }}
                      className="cursor-pointer rounded-lg bg-indigo-50 p-1.5 text-indigo-700 hover:bg-indigo-100"
                      title="View Details"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(lead)}
                      className="cursor-pointer rounded-lg bg-blue-50 p-1.5 text-blue-700 hover:bg-blue-100"
                      title="Edit Lead"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(lead._id)}
                      className="cursor-pointer rounded-lg bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100"
                      title="Delete Lead"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Lead Modal */}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setLeadToEdit(null);
          setPendingLeadPayload(null);
        }}
        leadToEdit={leadToEdit}
        onSubmit={handleSaveLead}
        isSubmitting={isSubmitting}
      />

      {/* Staff PIN Verification Modal */}
      <StaffVerifyModal
        open={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onVerified={handlePinVerified}
      />

      {/* Lead Details Modal */}
      <LeadDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedLeadForDetails(null);
        }}
        lead={selectedLeadForDetails}
        onEdit={(lead) => {
          setIsDetailsModalOpen(false);
          handleEdit(lead);
        }}
        onUpdated={(next) => {
          setSelectedLeadForDetails(next);
          setLeads((prev) =>
            prev.map((item) =>
              item._id === next._id
                ? {
                    ...item,
                    ...next,
                    membership: next.membership ?? item.membership,
                  }
                : item,
            ),
          );
        }}
      />
    </div>
  );
};

export default LeadScreen;
