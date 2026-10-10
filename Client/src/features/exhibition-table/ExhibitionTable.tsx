import { useCallback, useEffect, useMemo, useState } from "react";

import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_VisibilityState,
} from "material-react-table";
import { useMediaQuery } from "@mui/material";
import ExhibitionCharts from "./ExhibitionCharts";
import { mrtMobileContainerProps, mrtMobilePaperProps } from "@/utils/mrtMobileDefaults";

import {
  CheckCircle2,
  Eye,
  Loader2,
  PieChart as PieChartIcon,
  Plus,
  RefreshCw,
  ScanLine,
  Undo2,
  UserCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  handleGetExhibitionPasses,
  handleMarkExhibitionAttendance,
  type ExhibitionPassRecord,
} from "@/services/apiClient";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import CreateExhibitionPassModal from "./CreateExhibitionPassModal";
import ScanPassModal from "./ScanPassModal";

const getErrorMessage = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { message?: string } } };
  return err?.response?.data?.message || fallback;
};

const STATUS_STYLES: Record<string, string> = {
  Active: "border-green-200 bg-green-50 text-green-700",
  Expired: "border-gray-200 bg-gray-50 text-gray-600",
  Cancelled: "border-red-200 bg-red-50 text-red-600",
};

type AttendanceTab = "all" | "present" | "absent";

/** On phones only Name (with phone + code inside) and Attendance fit; the rest is hidden. */
const MOBILE_COLUMN_VISIBILITY: MRT_VisibilityState = {
  passcode: false,
  phone: false,
  age: false,
  gender: false,
  interests: false,
  group: false,
  status: false,
  createdAt: false,
  actions: false,
};
const DESKTOP_COLUMN_VISIBILITY: MRT_VisibilityState = {};

const isPresent = (row: ExhibitionPassRecord) => Boolean(row.checkedInAt);

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });

const ExhibitionTable = () => {
  const [data, setData] = useState<ExhibitionPassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AttendanceTab>("all");
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [showChartsMobile, setShowChartsMobile] = useState(false);

  const isMobile = useMediaQuery("(max-width: 767px)");
  const { can } = usePermission();
  const canCreate = can(PERMISSIONS.EXHIBITION_CREATE);
  const canUpdate = can(PERMISSIONS.EXHIBITION_UPDATE);

  const loadPasses = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await handleGetExhibitionPasses(signal);
      setData(res.exhibitions || []);
    } catch (error) {
      if ((error as { code?: string })?.code === "ERR_CANCELED") return;
      toast.error(
        getErrorMessage(error, "Failed to load exhibition visitors."),
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadPasses(controller.signal);
    return () => controller.abort();
  }, [loadPasses]);

  const markAttendance = useCallback(async (id: string, present: boolean) => {
    setPendingIds((prev) => new Set(prev).add(id));
    try {
      const res = await handleMarkExhibitionAttendance(id, present);
      setData((prev) =>
        prev.map((row) =>
          row._id === id
            ? {
                ...row,
                checkedInAt: res.exhibition.checkedInAt ?? null,
                checkedInBy: res.exhibition.checkedInBy ?? null,
              }
            : row,
        ),
      );
      toast.success(
        present
          ? `${res.exhibition.fullName} marked present`
          : `${res.exhibition.fullName} marked absent`,
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update attendance."));
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const applyPassUpdate = useCallback((pass: ExhibitionPassRecord) => {
    setData((prev) =>
      prev.some((row) => row._id === pass._id)
        ? prev.map((row) =>
            row._id === pass._id
              ? {
                  ...row,
                  checkedInAt: pass.checkedInAt ?? null,
                  checkedInBy: pass.checkedInBy ?? null,
                }
              : row,
          )
        : [pass, ...prev],
    );
  }, []);

  const counts = useMemo(() => {
    const present = data.filter(isPresent).length;
    return { all: data.length, present, absent: data.length - present };
  }, [data]);

  const visibleData = useMemo(() => {
    if (tab === "present") return data.filter(isPresent);
    if (tab === "absent") return data.filter((row) => !isPresent(row));
    return data;
  }, [data, tab]);

  const columns = useMemo<MRT_ColumnDef<ExhibitionPassRecord>[]>(
    () => [
      {
        accessorKey: "passcode",
        header: "Pass Code",
        size: 150,
        Cell: ({ cell }) => (
          <span className="font-mono text-xs font-semibold tracking-wider">
            {cell.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "fullName",
        header: isMobile ? "Visitor" : "Full Name",
        size: isMobile ? 130 : 180,
        Cell: ({ row }) =>
          isMobile ? (
            <div className="min-w-0">
              <p className="font-medium leading-tight text-gray-800">
                {row.original.fullName}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">+91 {row.original.phone}</p>
              <p className="font-mono text-[11px] tracking-wider text-gray-400">
                {row.original.passcode}
              </p>
            </div>
          ) : (
            row.original.fullName
          ),
      },
      {
        accessorKey: "phone",
        header: "Phone Number",
        size: 150,
        Cell: ({ cell }) => `+91 ${cell.getValue<string>()}`,
      },
      {
        id: "attendance",
        header: "Attendance",
        size: isMobile ? 150 : 190,
        enableColumnFilter: false,
        accessorFn: (row) => (isPresent(row) ? "Present" : "Absent"),
        Cell: ({ row }) => {
          const pass = row.original;
          const pending = pendingIds.has(pass._id);

          if (isPresent(pass)) {
            return (
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700"
                  title={
                    pass.checkedInBy?.m_staff_name
                      ? `Checked in by ${pass.checkedInBy.m_staff_name}`
                      : undefined
                  }
                >
                  <CheckCircle2 size={13} />
                  <span className="hidden sm:inline">Present ·</span>
                  {formatTime(pass.checkedInAt as string)}
                </span>
                {canUpdate && (
                  <button
                    type="button"
                    onClick={() => markAttendance(pass._id, false)}
                    disabled={pending}
                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                    title="Undo – mark absent"
                  >
                    {pending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Undo2 size={14} />
                    )}
                  </button>
                )}
              </div>
            );
          }

          if (!canUpdate || pass.status === "Cancelled") {
            return (
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-500">
                Absent
              </span>
            );
          }

          return (
            <button
              type="button"
              onClick={() => markAttendance(pass._id, true)}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {pending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <UserCheck size={14} />
              )}
              Mark Present
            </button>
          );
        },
      },
      {
        accessorKey: "age",
        header: "Age",
        size: 80,
      },
      {
        accessorKey: "gender",
        header: "Gender",
        size: 130,
      },
      {
        id: "interests",
        header: "Interests",
        size: 250,
        accessorFn: (row) =>
          (row.interests?.length
            ? row.interests
            : row.interest
              ? [row.interest]
              : []
          ).join(", "),
        Cell: ({ row }) => {
          const { interests, interest } = row.original;
          const list = interests?.length
            ? interests
            : interest
              ? [interest]
              : [];
          return (
            <div className="flex flex-wrap gap-1">
              {list.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600"
                >
                  {item}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        id: "group",
        header: "Group",
        size: 90,
        accessorFn: (row) =>
          row.groupSize && row.groupSize > 1
            ? `${row.position} of ${row.groupSize}`
            : "Individual",
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 110,
        Cell: ({ cell }) => {
          const status = cell.getValue<string>();
          return (
            <span
              className={`rounded-full border px-2 py-1 text-xs font-medium ${
                STATUS_STYLES[status] ?? STATUS_STYLES.Expired
              }`}
            >
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Registered",
        size: 170,
        Cell: ({ cell }) =>
          new Date(cell.getValue<string>()).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
      },
      {
        id: "actions",
        header: "Actions",
        size: 90,
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => (
          <button
            type="button"
            onClick={() => {
              console.log("View visitor:", row.original);
            }}
            className="flex items-center justify-center rounded-md p-2 text-gray-600 hover:text-orange-600"
            title="View Pass"
          >
            <Eye size={18} />
          </button>
        ),
      },
    ],
    [pendingIds, canUpdate, markAttendance, isMobile],
  );

  const tabs: { id: AttendanceTab; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "present", label: "Present", count: counts.present },
    { id: "absent", label: "Absent", count: counts.absent },
  ];

  const table = useMaterialReactTable({
    columns,
    data: visibleData,
    getRowId: (row) => row._id,

    enableColumnActions: false,
    enableColumnFilters: true,
    enableSorting: true,
    enablePagination: true,
    autoResetPageIndex: false,

    enableHiding: !isMobile,

    state: {
      isLoading: loading && data.length === 0,
      showProgressBars: loading && data.length > 0,
      ...(isMobile ? { columnVisibility: MOBILE_COLUMN_VISIBILITY } : {}),
    },

    initialState: {
      columnVisibility: DESKTOP_COLUMN_VISIBILITY,
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    },

    enableStickyHeader: true,

    // Paper fills the remaining section height; only the rows container scrolls.
    muiTablePaperProps: {
      ...mrtMobilePaperProps,
      sx: {
        ...mrtMobilePaperProps.sx,
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: { xs: 0, md: 280 },
      },
    },
    muiTableContainerProps: {
      ...mrtMobileContainerProps,
      sx: {
        ...mrtMobileContainerProps.sx,
        flex: 1,
        minHeight: 0,
        maxHeight: "none",
        overflowY: "auto",
      },
    },

    renderTopToolbarCustomActions: () =>
      isMobile ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => loadPasses()}
            disabled={loading}
            className="flex items-center justify-center rounded-md p-2 text-gray-600 hover:text-orange-600 disabled:opacity-50"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          {data.length > 0 && (
            <button
              type="button"
              onClick={() => setShowChartsMobile((v) => !v)}
              className={`flex items-center justify-center rounded-md p-2 ${
                showChartsMobile ? "bg-orange-50 text-orange-600" : "text-gray-600"
              }`}
              title={showChartsMobile ? "Hide charts" : "Show charts"}
              aria-label={showChartsMobile ? "Hide charts" : "Show charts"}
              aria-pressed={showChartsMobile}
            >
              <PieChartIcon size={18} />
            </button>
          )}
        </div>
      ) : null,

    muiTopToolbarProps: {
      sx: { flexWrap: "wrap" },
    },

    muiTableHeadCellProps: {
      sx: {
        fontWeight: 700,
        fontSize: { xs: "13px", md: "14px" },
        px: { xs: 1.25, md: 2 },
      },
    },

    muiTableBodyCellProps: {
      sx: {
        fontSize: { xs: "13px", md: "14px" },
        px: { xs: 1.25, md: 2 },
        py: { xs: 1.25, md: 1.5 },
      },
    },

    muiPaginationProps: {
      rowsPerPageOptions: [10, 25, 50, 100],
      showRowsPerPage: !isMobile,
      showFirstButton: !isMobile,
      showLastButton: !isMobile,
    },
  });

  const selectTab = (id: AttendanceTab) => {
    setTab(id);
    table.setPageIndex(0);
  };

  // Marking a row present in the Absent tab removes it; step back if the page empties.
  const { pageIndex, pageSize } = table.getState().pagination;
  useEffect(() => {
    const lastPage = Math.max(0, Math.ceil(visibleData.length / pageSize) - 1);
    if (pageIndex > lastPage) table.setPageIndex(lastPage);
  }, [visibleData.length, pageIndex, pageSize, table]);

  return (
    // md+: section height = viewport minus the shell's top bar and main padding, so only
    // the table rows scroll. Phones: the table box alone is one screen tall (see below).
    <div
      className={`w-full md:flex md:h-[calc(100dvh-5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] md:flex-col md:pb-0 lg:h-[calc(100dvh-5.25rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] ${
        canUpdate ? "pb-14" : "pb-3"
      }`}
    >
      {/* Tabs + actions — pinned while charts scroll away on phones */}
      <div className="sticky -top-3 z-20 -mx-3 -mt-3 flex h-[4.25rem] shrink-0 items-center justify-between gap-2 bg-[#F7F8FA] px-3 py-3 sm:-mx-4 sm:px-4 md:static md:mx-0 md:mt-0 md:mb-3 md:h-auto md:bg-transparent md:px-0 md:py-0">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-none">
        <div
          role="tablist"
          className="grid min-w-0 flex-1 grid-cols-3 rounded-lg border border-gray-200 bg-gray-50 p-0.5 md:inline-flex md:flex-none"
        >
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(t.id)}
                className={`flex items-center justify-center gap-1 rounded-md px-1.5 py-2 text-[13px] font-medium transition sm:gap-1.5 sm:px-3 sm:text-sm md:py-1.5 ${
                  active ? "bg-white text-orange-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-1.5 text-xs font-semibold ${
                    active
                      ? t.id === "present"
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

          {canCreate && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md bg-orange-500 px-2.5 py-2 text-sm font-semibold text-white hover:bg-orange-600 sm:gap-1.5 sm:px-3 md:py-1.5"
            >
              <Plus size={16} />
              <span className="hidden min-[400px]:inline">Create</span> Pass
            </button>
          )}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => loadPasses()}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:text-orange-600 disabled:opacity-50"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          {canUpdate && (
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              <ScanLine size={16} />
              Scan Pass
            </button>
          )}
        </div>
      </div>

      {data.length > 0 && (!isMobile || showChartsMobile) && (
        <div className="shrink-0">
          <ExhibitionCharts passes={visibleData} />
        </div>
      )}

      {/* Phones: screen height minus top bar, main top padding, the 3.5rem tabs row and the
          section's bottom padding (5rem clear for the floating Scan button, else 0.75rem). */}
      <div
        className={`flex flex-col md:h-auto md:min-h-0 md:flex-1 ${
          canUpdate
            ? "h-[calc(100dvh-16.25rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))]"
            : "h-[calc(100dvh-13.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))]"
        }`}
      >
        <MaterialReactTable table={table} />
      </div>

      {/* Mobile: floating scan button, always within thumb reach at the gate */}
      {canUpdate && !scanOpen && !createOpen && (
        <button
          type="button"
          onClick={() => setScanOpen(true)}
          aria-label="Scan pass"
          className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-white py-3.5 pl-4 pr-5 text-sm font-bold text-green-600 shadow-lg shadow-slate-900/15 ring-2 ring-green-600 transition active:scale-95 md:hidden"
        >
          <ScanLine size={22} />
          Scan Pass
        </button>
      )}

      <CreateExhibitionPassModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => loadPasses()}
      />
      {scanOpen && (
        <ScanPassModal onClose={() => setScanOpen(false)} onCheckedIn={applyPassUpdate} />
      )}
    </div>
  );
};

export default ExhibitionTable;
