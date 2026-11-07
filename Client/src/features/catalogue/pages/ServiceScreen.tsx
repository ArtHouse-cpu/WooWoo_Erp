import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import {
  Boxes,
  Search,
  Briefcase,
  LayoutList,
  SquarePen,
  Trash2,
  X,
  Plus,
  ChevronDown,
  Armchair,
  Crown,
  ShoppingBag,
} from "lucide-react";
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
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [viewService, setViewService] = useState<ServiceRow | null>(null);
  const [viewAdditionalService, setViewAdditionalService] = useState<AdditionalServiceItem | null>(null);

  // Additional service modal state
  const [showAdditionalModal, setShowAdditionalModal] = useState(false);
  const [editAdditionalService, setEditAdditionalService] =
    useState<AdditionalServiceItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Top right Add button dropdown
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        addMenuRef.current &&
        !addMenuRef.current.contains(event.target as Node)
      ) {
        setAddMenuOpen(false);
      }
    };
    if (addMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [addMenuOpen]);

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const q = searchQuery.toLowerCase();
    return services.filter(
      (s) =>
        (s.serviceName || s.productName || "").toLowerCase().includes(q) ||
        (s.category || "").toLowerCase().includes(q) ||
        (s.barcode || s.barCode || s.itemCode || "")
          .toLowerCase()
          .includes(q),
    );
  }, [services, searchQuery]);

  const filteredAdditionalServices = useMemo(() => {
    if (!searchQuery.trim()) return additionalServices;
    const q = searchQuery.toLowerCase();
    return additionalServices.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q) ||
        (s.spaceType || "").toLowerCase().includes(q),
    );
  }, [additionalServices, searchQuery]);

  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    setEditService(null);
    setActiveTable("services");
    setShowCreateModal(true);
    const next = new URLSearchParams(searchParams);
    next.delete("create");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200/60">
            {String(cell.getValue() || "General")}
          </span>
        ),
      },
      {
        accessorKey: "sellingPrice",
        header: "Selling Price",
        Cell: ({ cell }: { cell: { getValue: () => unknown } }) => {
          const val = Number(cell.getValue() || 0);
          return (
            <span className="font-bold text-emerald-600">
              ₹ {val.toLocaleString("en-IN")}
            </span>
          );
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
          Icon: Briefcase,
          WatermarkIcon: ShoppingBag,
          bgClass: "bg-blue-50/60 border-blue-100/90 hover:border-blue-200",
          iconWrapClass: "bg-blue-600 text-white shadow-xs shadow-blue-500/20",
          watermarkClass: "text-blue-200/50",
          titleClass: "text-slate-900",
          valueClass: "text-slate-900",
        },
        {
          title: "Service Categories",
          value: uniqueCategories,
          Icon: Armchair,
          WatermarkIcon: Armchair,
          bgClass: "bg-purple-50/60 border-purple-100/90 hover:border-purple-200",
          iconWrapClass: "bg-purple-600 text-white shadow-xs shadow-purple-500/20",
          watermarkClass: "text-purple-200/50",
          titleClass: "text-slate-900",
          valueClass: "text-slate-900",
        },
        {
          title: "Active Services",
          value: services.length,
          Icon: Boxes,
          WatermarkIcon: Crown,
          bgClass: "bg-amber-50/60 border-amber-100/90 hover:border-amber-200",
          iconWrapClass: "bg-amber-500 text-white shadow-xs shadow-amber-500/20",
          watermarkClass: "text-amber-200/50",
          titleClass: "text-amber-950",
          valueClass: "text-slate-900",
        },
      ];
    }
    return [
      {
        title: "Total Additional Services",
        value: additionalServices.length,
        Icon: Briefcase,
        WatermarkIcon: ShoppingBag,
        bgClass: "bg-blue-50/60 border-blue-100/90 hover:border-blue-200",
        iconWrapClass: "bg-blue-600 text-white shadow-xs shadow-blue-500/20",
        watermarkClass: "text-blue-200/50",
        titleClass: "text-slate-900",
        valueClass: "text-slate-900",
      },
      {
        title: "Coworking Amenities",
        value: additionalServices.filter(
          (s) => s.spaceType === "all" || s.spaceType === "coworking",
        ).length,
        Icon: Armchair,
        WatermarkIcon: Armchair,
        bgClass: "bg-purple-50/60 border-purple-100/90 hover:border-purple-200",
        iconWrapClass: "bg-purple-600 text-white shadow-xs shadow-purple-500/20",
        watermarkClass: "text-purple-200/50",
        titleClass: "text-slate-900",
        valueClass: "text-slate-900",
      },
      {
        title: "Exclusive Amenities",
        value: additionalServices.filter(
          (s) => s.spaceType === "all" || s.spaceType === "exclusive",
        ).length,
        Icon: Boxes,
        WatermarkIcon: Crown,
        bgClass: "bg-amber-50/60 border-amber-100/90 hover:border-amber-200",
        iconWrapClass: "bg-amber-500 text-white shadow-xs shadow-amber-500/20",
        watermarkClass: "text-amber-200/50",
        titleClass: "text-amber-950",
        valueClass: "text-slate-900",
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
    <div className="min-w-0 p-1 space-y-3">
      {/* Top Header Row: Title on left, + Add dropdown on top right corner */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900">
          {activeTable === "services"
            ? "Services List"
            : "Additional Services List"}
        </h1>

        {/* Right: + Add Dropdown Button in the Top Right Corner */}
        <Can permission={PERMISSIONS.SERVICE_CREATE}>
          <div className="relative shrink-0" ref={addMenuRef}>
            <button
              type="button"
              onClick={() => setAddMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
            >
              <Plus size={15} />
              <span>Add</span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${addMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {addMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-40 w-48 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-xl ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setAddMenuOpen(false);
                    setEditService(null);
                    setActiveTable("services");
                    setShowCreateModal(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  <Briefcase size={16} className="text-slate-500" />
                  <span>Service</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddMenuOpen(false);
                    setEditAdditionalService(null);
                    setActiveTable("additional");
                    setShowAdditionalModal(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition border-t border-slate-100"
                >
                  <Boxes size={16} className="text-slate-500" />
                  <span>Additional Service</span>
                </button>
              </div>
            )}
          </div>
        </Can>
      </div>

      {/* Tabs Row */}
      <div>
        <div className="rounded-2xl border border-blue-100/80 bg-blue-50/20 p-1 flex items-center gap-1.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTable("services")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs sm:text-sm font-bold transition duration-200 ${
              activeTable === "services"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/20"
                : "bg-white/90 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-200/50"
            }`}
          >
            <Briefcase size={15} className={activeTable === "services" ? "text-white" : "text-slate-700"} />
            <span>Services</span>
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTable === "services"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "bg-blue-100/70 text-blue-800"
              }`}
            >
              {services.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTable("additional")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs sm:text-sm font-bold transition duration-200 ${
              activeTable === "additional"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/20"
                : "bg-white/90 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-200/50"
            }`}
          >
            <Boxes size={15} className={activeTable === "additional" ? "text-white" : "text-slate-700"} />
            <span>Additional Services</span>
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTable === "additional"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "bg-blue-100/70 text-blue-800"
              }`}
            >
              {additionalServices.length}
            </span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        {cards.map((item, index) => (
          <div
            key={item.title}
            className={`min-w-0 rounded-2xl border p-2.5 sm:p-3.5 shadow-2xs transition duration-300 hover:shadow-md relative overflow-hidden ${item.bgClass} ${
              index === 2 ? "col-span-2" : "col-span-1"
            }`}
          >
            {/* Watermark Icon */}
            <item.WatermarkIcon
              className={`absolute -right-2 -bottom-2 sm:-right-3 sm:-bottom-3 h-14 w-14 sm:h-20 sm:w-20 stroke-[1.2] pointer-events-none transition-transform duration-300 group-hover:scale-105 ${item.watermarkClass}`}
            />

            <div className="relative z-10 flex items-center gap-2 sm:gap-2.5">
              <div
                className={`flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl shadow-xs ${item.iconWrapClass}`}
              >
                <item.Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[10px] sm:text-xs font-bold ${item.titleClass}`}
                  title={item.title}
                >
                  {item.title}
                </span>
                <div
                  className={`mt-0.5 text-lg sm:text-2xl font-extrabold tabular-nums ${item.valueClass}`}
                >
                  {item.value}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop MRT Table View */}
      <div className="hidden md:block">
        {activeTable === "services" ? (
          <MaterialReactTable table={servicesTable} />
        ) : (
          <MaterialReactTable table={additionalTable} />
        )}
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-2.5">
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTable === "services" ? "Search services..." : "Search additional services..."}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-slate-400"
          />
        </div>

        {activeTable === "services" ? (
          loading && services.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
              Loading services...
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
              No services found
            </div>
          ) : (
            filteredServices.map((service, idx) => {
              const name = service.serviceName || service.productName || "Unnamed Service";

              return (
                <div
                  key={service._id || idx}
                  onClick={() => setViewService(service)}
                  className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition hover:border-slate-300 active:bg-slate-50/70"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-bold text-slate-900">
                          {name}
                        </span>
                        <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 ring-1 ring-inset ring-blue-200/60">
                          {service.category || "General"}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {service.primaryUnit && (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                            Unit: {service.primaryUnit}
                          </span>
                        )}
                        {(service.barcode || service.barCode || service.itemCode) && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono text-[11px] text-slate-400">
                              {service.barcode || service.barCode || service.itemCode}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Selling Price
                        </span>
                        <span className="text-sm font-bold text-emerald-600">
                          ₹{Number(service.sellingPrice || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      {service.purchasePrice !== undefined && (
                        <div>
                          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Cost
                          </span>
                          <span className="text-xs font-medium text-slate-600">
                            ₹{Number(service.purchasePrice || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div
                      className="flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Can permission={PERMISSIONS.SERVICE_UPDATE}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditService(service);
                            setShowCreateModal(true);
                          }}
                          className="cursor-pointer rounded-lg bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100"
                          title="Edit service"
                        >
                          <SquarePen size={15} />
                        </button>
                      </Can>
                      <Can permission={PERMISSIONS.SERVICE_DELETE}>
                        <button
                          type="button"
                          onClick={() => {
                            if (service._id) void handleDelete(service._id);
                          }}
                          className="cursor-pointer rounded-lg bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100"
                          title="Delete service"
                        >
                          <Trash2 size={15} />
                        </button>
                      </Can>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          loading && additionalServices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
              Loading additional services...
            </div>
          ) : filteredAdditionalServices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
              No additional services found
            </div>
          ) : (
            filteredAdditionalServices.map((item, idx) => {
              const IconComp = getIconComponent(item.icon);
              const title = item.title || item.name || "Unnamed Service";
              const amount = Number(item.amount ?? item.price ?? 0);
              const spaceType = item.spaceType || "all";

              return (
                <div
                  key={item._id || idx}
                  onClick={() => setViewAdditionalService(item)}
                  className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition hover:border-slate-300 active:bg-slate-50/70"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 flex items-center gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 text-indigo-600 shadow-2xs">
                        <IconComp size={19} />
                      </div>
                      <div className="min-w-0">
                        <span className="truncate text-sm font-bold text-slate-900 block">
                          {title}
                        </span>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              spaceType === "coworking"
                                ? "bg-purple-100 text-purple-700"
                                : spaceType === "exclusive"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {spaceType === "coworking"
                              ? "Coworking"
                              : spaceType === "exclusive"
                                ? "Exclusive"
                                : "All Spaces"}
                          </span>
                          {item.unit && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                              {item.unit}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-emerald-600 block">
                        ₹{amount.toLocaleString("en-IN")}
                      </span>
                      {item.priceLabel && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {item.priceLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {typeof (item as any).description === "string" && (item as any).description ? (
                    <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                      {(item as any).description}
                    </p>
                  ) : null}

                <div className="mt-3 flex items-center justify-end border-t border-slate-100 pt-2.5">
                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Can permission={PERMISSIONS.SERVICE_UPDATE}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditAdditionalService(item);
                          setShowAdditionalModal(true);
                        }}
                        className="cursor-pointer rounded-lg bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100"
                        title="Edit additional service"
                      >
                        <SquarePen size={15} />
                      </button>
                    </Can>
                    <Can permission={PERMISSIONS.SERVICE_DELETE}>
                      <button
                        type="button"
                        onClick={() => {
                          if (item._id) void handleDeleteAdditional(item._id);
                        }}
                        className="cursor-pointer rounded-lg bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100"
                        title="Delete additional service"
                      >
                        <Trash2 size={15} />
                      </button>
                    </Can>
                  </div>
                </div>
              </div>
              );
            })
          )
        )}
      </div>
      {/* Service View Details Modal */}
      {viewService && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setViewService(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Service Details
                  </h3>
                  <p className="text-xs text-slate-400">
                    {viewService.category || "General"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewService(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4">
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Service Name
                </span>
                <h4 className="text-lg font-bold text-slate-900 mt-0.5 truncate">
                  {viewService.serviceName || viewService.productName || "Unnamed Service"}
                </h4>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-3 text-center">
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Selling Price
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      ₹{Number(viewService.sellingPrice || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Cost Price
                    </span>
                    <span className="text-sm font-bold text-slate-600">
                      ₹{Number(viewService.purchasePrice || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Category</span>
                  <span className="font-semibold text-slate-800">
                    {viewService.category || "—"}
                  </span>
                </div>
                {viewService.primaryUnit && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Unit</span>
                    <span className="font-semibold text-slate-800">
                      {viewService.primaryUnit}
                    </span>
                  </div>
                )}
                {(viewService.barcode || viewService.barCode || viewService.itemCode) && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Barcode / Item Code</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {viewService.barcode || viewService.barCode || viewService.itemCode}
                    </span>
                  </div>
                )}
                {viewService.description && (
                  <div className="pt-1">
                    <span className="text-slate-500 block mb-1">Description</span>
                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {viewService.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setViewService(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Close
              </button>
              <Can permission={PERMISSIONS.SERVICE_UPDATE}>
                <button
                  type="button"
                  onClick={() => {
                    const s = viewService;
                    setViewService(null);
                    setEditService(s);
                    setShowCreateModal(true);
                  }}
                  className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-black/90 transition"
                >
                  Edit Service
                </button>
              </Can>
            </div>
          </div>
        </div>
      )}

      {/* Additional Service View Details Modal */}
      {viewAdditionalService && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setViewAdditionalService(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  {(() => {
                    const IconComp = getIconComponent(viewAdditionalService.icon);
                    return <IconComp size={20} />;
                  })()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Additional Service Details
                  </h3>
                  <p className="text-xs text-slate-400 capitalize">
                    {viewAdditionalService.spaceType || "All"} Spaces
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewAdditionalService(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4">
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Amenity / Service
                </span>
                <h4 className="text-lg font-bold text-slate-900 mt-0.5 truncate">
                  {viewAdditionalService.title || viewAdditionalService.name || "Unnamed"}
                </h4>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-3 text-center">
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Price / Amount
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      ₹{Number(viewAdditionalService.amount ?? viewAdditionalService.price ?? 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Unit / Frequency
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {viewAdditionalService.unit || "per month"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Applies To</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {viewAdditionalService.spaceType === "all" ? "All Spaces" : viewAdditionalService.spaceType || "All Spaces"}
                  </span>
                </div>
                {viewAdditionalService.description && (
                  <div className="pt-1">
                    <span className="text-slate-500 block mb-1">Description</span>
                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {viewAdditionalService.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setViewAdditionalService(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Close
              </button>
              <Can permission={PERMISSIONS.SERVICE_UPDATE}>
                <button
                  type="button"
                  onClick={() => {
                    const item = viewAdditionalService;
                    setViewAdditionalService(null);
                    setEditAdditionalService(item);
                    setShowAdditionalModal(true);
                  }}
                  className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-black/90 transition"
                >
                  Edit Service
                </button>
              </Can>
            </div>
          </div>
        </div>
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
