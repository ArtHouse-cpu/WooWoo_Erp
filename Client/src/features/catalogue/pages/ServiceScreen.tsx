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
  handleGetAdditionalServices,
  handleCreateAdditionalService,
  handleUpdateAdditionalService,
  handleDeleteAdditionalService,
  type AdditionalServiceItem,
} from "@/services/apiClient";
import CreateServiceModal from "@/features/sales/components/invoice/Modal/CreateServiceModal";
import AddAdditionalServiceModal, {
  getIconComponent,
  type AdditionalServiceFormData,
} from "../components/AddAdditionalServiceModal";
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
  const [additionalServices, setAdditionalServices] = useState<
    AdditionalServiceItem[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [activeTable, setActiveTable] = useState<"services" | "additional">(
    "services",
  );

  // Regular service modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editService, setEditService] = useState<ServiceRow | null>(null);

  // Additional service modal state
  const [showAdditionalModal, setShowAdditionalModal] = useState(false);
  const [editAdditionalService, setEditAdditionalService] =
    useState<AdditionalServiceItem | null>(null);

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

  const fetchAdditionalData = async (signal?: AbortSignal) => {
    try {
      const items = await handleGetAdditionalServices(signal);
      setAdditionalServices(items || []);
    } catch (error) {
      console.error("Error fetching additional services:", error);
      setAdditionalServices([]);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchData(controller.signal);
    void fetchAdditionalData(controller.signal);
    return () => controller.abort();
  }, []);

  // Regular Service Handlers
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

  // Additional Service Handlers
  const handleSubmitAdditionalService = async (
    payload: AdditionalServiceFormData,
  ) => {
    try {
      setLoading(true);
      if (editAdditionalService?._id) {
        await handleUpdateAdditionalService(
          editAdditionalService._id,
          payload,
        );
        await Swal.fire({
          icon: "success",
          title: "Updated",
          text: "Additional service updated.",
          timer: 1400,
          showConfirmButton: false,
        });
      } else {
        await handleCreateAdditionalService(payload);
        await Swal.fire({
          icon: "success",
          title: "Created",
          text: "Additional service created.",
          timer: 1400,
          showConfirmButton: false,
        });
      }

      setShowAdditionalModal(false);
      setEditAdditionalService(null);
      setActiveTable("additional");
      await fetchAdditionalData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Error",
        err?.response?.data?.message ?? "Failed to save additional service.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdditional = async (id: string) => {
    const result = await Swal.fire({
      title: "Delete additional service?",
      text: "This service will be removed from catalogue and spaces.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      await handleDeleteAdditionalService(id);
      await fetchAdditionalData();
      await Swal.fire({
        title: "Deleted",
        text: "Additional service removed.",
        icon: "success",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Error",
        err?.response?.data?.message ?? "Failed to delete additional service.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // Regular Services Columns
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
                className="cursor-pointer rounded bg-green-100 px-3 py-2 text-sm hover:bg-green-200"
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
                className="cursor-pointer rounded bg-red-100 px-3 py-2 text-sm hover:bg-red-200"
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

  // Additional Services Columns
  const additionalColumns = useMemo(
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
        accessorKey: "icon",
        header: "Icon",
        size: 80,
        Cell: ({ cell }: { cell: { getValue: () => unknown } }) => {
          const iconName = String(cell.getValue() || "Car");
          const IconComp = getIconComponent(iconName);
          return (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-2xs">
              <IconComp size={18} />
            </div>
          );
        },
      },
      {
        accessorKey: "title",
        header: "Additional Service",
        size: 200,
        Cell: ({ row }: { row: { original: AdditionalServiceItem } }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900">
              {row.original.title || row.original.name || "—"}
            </span>
            <span className="text-xs text-slate-400">
              {row.original.key || "service"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        size: 130,
        Cell: ({ cell }: { cell: { getValue: () => unknown } }) => {
          const val = Number(cell.getValue() || 0);
          return (
            <span className="font-semibold text-emerald-700">
              ₹ {val.toLocaleString("en-IN")}
            </span>
          );
        },
      },
      {
        accessorKey: "unit",
        header: "Unit / Frequency",
        size: 150,
        Cell: ({ cell }: { cell: { getValue: () => unknown } }) => (
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            {String(cell.getValue() || "per month")}
          </span>
        ),
      },
      {
        accessorKey: "priceLabel",
        header: "Price Label",
        size: 160,
        Cell: ({
          cell,
          row,
        }: {
          cell: { getValue: () => unknown };
          row: { original: AdditionalServiceItem };
        }) => {
          const val =
            String(cell.getValue() || "") ||
            `₹${Number(row.original.amount || 0).toLocaleString("en-IN")} / ${row.original.unit || "per month"}`;
          return <span className="font-medium text-slate-600">{val}</span>;
        },
      },
     
      {
        accessorKey: "spaceType",
        header: "Applies To",
        size: 140,
        Cell: ({ cell }: { cell: { getValue: () => unknown } }) => {
          const val = String(cell.getValue() || "all");
          return (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                val === "coworking"
                  ? "bg-purple-100 text-purple-700"
                  : val === "exclusive"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {val === "coworking"
                ? "Coworking"
                : val === "exclusive"
                  ? "Exclusive"
                  : "All Spaces"}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        size: 100,
        enableSorting: false,
        Cell: ({ row }: { row: { original: AdditionalServiceItem } }) => (
          <div className="flex items-center gap-2">
            <Can permission={PERMISSIONS.SERVICE_UPDATE}>
              <button
                type="button"
                onClick={() => {
                  setEditAdditionalService(row.original);
                  setShowAdditionalModal(true);
                }}
                className="cursor-pointer rounded bg-green-100 px-3 py-2 text-sm hover:bg-green-200"
                title="Edit Additional Service"
              >
                <SquarePen color="green" size={18} />
              </button>
            </Can>
            <Can permission={PERMISSIONS.SERVICE_DELETE}>
              <button
                type="button"
                onClick={() => {
                  if (row.original._id) {
                    void handleDeleteAdditional(row.original._id);
                  }
                }}
                className="cursor-pointer rounded bg-red-100 px-3 py-2 text-sm hover:bg-red-200"
                title="Delete Additional Service"
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

  const servicesTable = useMaterialReactTable({
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

  const additionalTable = useMaterialReactTable({
    columns: additionalColumns,
    data: additionalServices,
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

  const cards = useMemo(() => {
    if (activeTable === "services") {
      return [
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
    }
    return [
      {
        title: "Total Additional Services",
        value: additionalServices.length,
        icon: <Briefcase size={22} className="text-gray-500" />,
      },
      {
        title: "Coworking Amenities",
        value: additionalServices.filter(
          (s) => s.spaceType === "all" || s.spaceType === "coworking",
        ).length,
        icon: <LayoutList size={22} className="text-gray-500" />,
      },
      {
        title: "Exclusive Amenities",
        value: additionalServices.filter(
          (s) => s.spaceType === "all" || s.spaceType === "exclusive",
        ).length,
        icon: <Boxes size={22} className="text-gray-500" />,
      },
    ];
  }, [
    activeTable,
    services.length,
    additionalServices.length,
    uniqueCategories,
    additionalServices,
  ]);

  return (
    <div className="min-w-0 p-1">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">
            {activeTable === "services"
              ? "Services List"
              : "Additional Services List"}
          </h1>

          {/* Toggle between Current MRT Table and Additional Service MRT Table */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTable("services")}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1 text-xs sm:text-sm font-semibold transition ${
                activeTable === "services"
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              <Briefcase size={15} />
              <span>Services</span>
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[11px] font-semibold ${
                  activeTable === "services"
                    ? "bg-black text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {services.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTable("additional")}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1 text-xs sm:text-sm font-semibold transition ${
                activeTable === "additional"
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              <Boxes size={15} />
              <span>Additional Services</span>
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[11px] font-semibold ${
                  activeTable === "additional"
                    ? "bg-black text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {additionalServices.length}
              </span>
            </button>
          </div>
        </div>

        <Can permission={PERMISSIONS.SERVICE_CREATE}>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setEditAdditionalService(null);
                setShowAdditionalModal(true);
              }}
              className="w-full cursor-pointer rounded bg-black px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-black/90 sm:w-auto"
            >
              + Additional Services
            </button>

            <button
              type="button"
              onClick={() => {
                setEditService(null);
                setActiveTable("services");
                setShowCreateModal(true);
              }}
              className="w-full cursor-pointer rounded bg-black px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-black/90 sm:w-auto"
            >
              + Create Service
            </button>
          </div>
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

      {/* Render the Active MRT Table */}
      {activeTable === "services" ? (
        <MaterialReactTable table={servicesTable} />
      ) : (
        <MaterialReactTable table={additionalTable} />
      )}

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

      {showAdditionalModal && (
        <AddAdditionalServiceModal
          open={showAdditionalModal}
          onClose={() => {
            setShowAdditionalModal(false);
            setEditAdditionalService(null);
          }}
          onSubmit={handleSubmitAdditionalService}
          loading={loading}
          initialData={editAdditionalService}
        />
      )}
    </div>
  );
}
