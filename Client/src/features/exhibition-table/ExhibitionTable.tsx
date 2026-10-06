import { useCallback, useEffect, useMemo, useState } from "react";

import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";

import { Eye, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import {
  handleGetExhibitionPasses,
  type ExhibitionPassRecord,
} from "@/services/apiClient";

const getErrorMessage = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { message?: string } } };
  return err?.response?.data?.message || fallback;
};

const STATUS_STYLES: Record<string, string> = {
  Active: "border-green-200 bg-green-50 text-green-700",
  Expired: "border-gray-200 bg-gray-50 text-gray-600",
  Cancelled: "border-red-200 bg-red-50 text-red-600",
};

const ExhibitionTable = () => {
  const [data, setData] = useState<ExhibitionPassRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPasses = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await handleGetExhibitionPasses(signal);
      setData(res.exhibitions || []);
    } catch (error) {
      if ((error as { code?: string })?.code === "ERR_CANCELED") return;
      toast.error(getErrorMessage(error, "Failed to load exhibition visitors."));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadPasses(controller.signal);
    return () => controller.abort();
  }, [loadPasses]);

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
        header: "Full Name",
        size: 180,
      },
      {
        accessorKey: "phone",
        header: "Phone Number",
        size: 150,
        Cell: ({ cell }) => `+91 ${cell.getValue<string>()}`,
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
          (row.interests?.length ? row.interests : row.interest ? [row.interest] : []).join(", "),
        Cell: ({ row }) => {
          const { interests, interest } = row.original;
          const list = interests?.length ? interests : interest ? [interest] : [];
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
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data,
    getRowId: (row) => row._id,

    enableColumnActions: false,
    enableColumnFilters: true,
    enableSorting: true,
    enablePagination: true,

    state: {
      isLoading: loading && data.length === 0,
      showProgressBars: loading && data.length > 0,
    },

    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    },

    renderTopToolbarCustomActions: () => (
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-700">
          {data.length} visitor{data.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={() => loadPasses()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:text-orange-600 disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>
    ),

    muiTableHeadCellProps: {
      sx: {
        fontWeight: 700,
        fontSize: "14px",
      },
    },

    muiTableBodyCellProps: {
      sx: {
        fontSize: "14px",
      },
    },
  });

  return (
    <div className="w-full">
      <MaterialReactTable table={table} />
    </div>
  );
};

export default ExhibitionTable;
