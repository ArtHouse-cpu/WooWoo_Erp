import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { Boxes, Briefcase, LayoutList, SquarePen, Trash2 } from "lucide-react";
import {
  handleGetServices,
  handleCreateService,
  handleUpdateService,
  handleDeleteService,
} from "@/services/apiClient";
import CreateServiceModal from "@/features/sales/components/invoice/Modal/CreateServiceModal";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";

type ServiceRow = {
  _id?: string;
  productName?: string;
  serviceName?: string;
  category?: string;
  sellingPrice?: number;
  purchasePrice?: number;
  primaryUnit?: string;
  itemCode?: string;
  barCode?: string;
  barcode?: string;
  description?: string;
  discountType?: "flat" | "percentage";
  discountValue?: number;
  imageUrl?: string | null;
  images?: string[];
};

export default function ServiceScreen() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editService, setEditService] = useState<ServiceRow | null>(null);

  const fetchData = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const res = await handleGetServices("", signal);
      const list = Array.isArray(res?.services)
        ? res.services
        : Array.isArray(res?.products)
          ? res.products
          : Array.isArray(res)
            ? res
            : [];
      setServices(list);
    } catch (error) {
      console.error("Error fetching services:", error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchData(controller.signal);
    return () => controller.abort();
  }, []);

  const handleSubmitService = async (formData: FormData) => {
    try {
      setLoading(true);
      if (editService?._id) {
        await handleUpdateService(editService._id, formData);
      } else {
        await handleCreateService(formData);
      }
      await fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Error",
        err?.response?.data?.message ?? "Failed to save service.",
        "error",
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Delete service?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      await handleDeleteService(id);
      await fetchData();
      await Swal.fire({
        title: "Deleted",
        text: "Service removed.",
        icon: "success",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Error",
        err?.response?.data?.message ?? "Failed to delete service.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "serial",
        header: "No.",
        size: 60,
        Cell: ({ row, table }: { row: { index: number }; table: any }) => {
          const pageIndex = table.getState().pagination.pageIndex;
          const pageSize = table.getState().pagination.pageSize;
          return (
            <span className="text-xs text-gray-500">
              {pageIndex * pageSize + row.index + 1}
            </span>
          );
        },
      },
      {
        id: "images",
        header: "Image",
        size: 120,
        accessorFn: (row: ServiceRow) => row.imageUrl,
        Cell: ({ cell }: { cell: { getValue: () => unknown } }) => {
          const imageUrl = cell.getValue() as string;

          return imageUrl ? (
            <img
              src={imageUrl}
              alt="Service"
              className="h-16 w-16 rounded-lg object-cover border"
            />
          ) : (
            <span>—</span>
          );
        },
      },
      {
        id: "name",
        header: "Service Name",
        size: 200,
        accessorFn: (row: ServiceRow) =>
          row.serviceName || row.productName || "—",
        Cell: ({ cell }: { cell: { getValue: () => unknown } }) => (
          <span className="font-semibold text-slate-800">
            {String(cell.getValue() || "—")}
          </span>
        ),
      },

      {
        accessorKey: "category",
        header: "Category",
        size: 140,
        Cell: ({ cell }: { cell: { getValue: () => unknown } }) => (
          <span className="text-slate-700">
            {String(cell.getValue() || "—")}
          </span>
        ),
      },
      {
        accessorKey: "sellingPrice",
        header: "Selling Price",
        Cell: ({ cell }: { cell: { getValue: () => unknown } }) => {
          const val = Number(cell.getValue() || 0);
          return <span>₹ {val.toLocaleString("en-IN")}</span>;
        },
      },
      {
        accessorKey: "purchasePrice",
        header: "Costing",
        Cell: ({ cell }: { cell: { getValue: () => unknown } }) => {
          const val = Number(cell.getValue() || 0);
          return <span>₹ {val.toLocaleString("en-IN")}</span>;
        },
      },
      {
        accessorKey: "primaryUnit",
        header: "Unit",
        size: 100,
        Cell: ({ cell }: { cell: { getValue: () => unknown } }) => (
          <span className="text-slate-600">
            {String(cell.getValue() || "—")}
          </span>
        ),
      },
      {
        accessorKey: "itemCode",
        header: "Item Code",
        size: 110,
        Cell: ({ cell }: { cell: { getValue: () => unknown } }) => (
          <span className="text-slate-600">
            {String(cell.getValue() || "—")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        size: 100,
        enableSorting: false,
        Cell: ({ row }: { row: { original: ServiceRow } }) => (
          <div className="flex items-center gap-2">
            <Can permission={PERMISSIONS.SERVICE_UPDATE}>
              <button
                type="button"
                onClick={() => {
                  setEditService(row.original);
                  setShowCreateModal(true);
                }}
                className="rounded bg-green-100 px-3 py-2 text-sm hover:bg-green-200"
                title="Edit Service"
              >
                <SquarePen color="green" size={18} />
              </button>
            </Can>
            <Can permission={PERMISSIONS.SERVICE_DELETE}>
              <button
                type="button"
                onClick={() => {
                  if (row.original._id) void handleDelete(row.original._id);
                }}
                className="rounded bg-red-100 px-3 py-2 text-sm hover:bg-red-200"
                title="Delete Service"
              >
                <Trash2 color="red" size={18} />
              </button>
            </Can>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: services,
    state: { isLoading: loading },
    enableDensityToggle: false,
    initialState: { density: "compact" },
    muiTablePaperProps: {
      elevation: 0,
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

  const uniqueCategories = useMemo(() => {
    const names = services
      .map((s) => String(s.category || "").trim())
      .filter(Boolean);
    return new Set(names).size;
  }, [services]);

  const cards = [
    {
      title: "Total Services",
      value: services.length,
      icon: <Briefcase size={22} className="text-gray-500" />,
    },
    {
      title: "Service Categories",
      value: uniqueCategories,
      icon: <LayoutList size={22} className="text-gray-500" />,
    },
    {
      title: "Active Services",
      value: services.length,
      icon: <Boxes size={22} className="text-gray-500" />,
    },
  ];

  return (
    <div className="p-1">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Services List</h1>
        <Can permission={PERMISSIONS.SERVICE_CREATE}>
          <button
            type="button"
            onClick={() => {
              setEditService(null);
              setShowCreateModal(true);
            }}
            className="cursor-pointer rounded bg-black px-4 py-2 text-[14px] font-semibold text-white transition"
          >
            + Create Service
          </button>
        </Can>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-gray-200 bg-white p-4 transition duration-300 hover:shadow-sm"
          >
            <div className="flex items-center gap-2 text-gray-600">
              {item.icon}
              <span className="font-medium">{item.title}</span>
            </div>
            <div className="mt-3 text-2xl font-semibold">{item.value}</div>
          </div>
        ))}
      </div>

      <MaterialReactTable table={table} />

      {showCreateModal && (
        <CreateServiceModal
          mode={editService ? "edit" : "create"}
          loading={loading}
          onClose={() => {
            setShowCreateModal(false);
            setEditService(null);
          }}
          onSubmit={handleSubmitService}
          initialData={
            editService
              ? {
                  type: "service",
                  serviceName:
                    editService.serviceName || editService.productName || "",
                  productName:
                    editService.productName || editService.serviceName || "",
                  sellingPrice: Number(editService.sellingPrice || 0),
                  purchasePrice: Number(editService.purchasePrice || 0),
                  primaryUnit: editService.primaryUnit || "",
                  itemCode: editService.itemCode || "",
                  barcode:
                    editService.barcode || editService.barCode || "",
                  category: String(editService.category || ""),
                  description: editService.description || "",
                  discountType: editService.discountType || "flat",
                  discountValue: Number(editService.discountValue || 0),
                  images: [],
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
