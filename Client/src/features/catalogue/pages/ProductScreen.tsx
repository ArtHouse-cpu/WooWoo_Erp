import {
  type UIEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_RowVirtualizer,
  type MRT_SortingState,
} from "material-react-table";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  ChevronDown,
  Package,
  LayoutList,
  Search,
  ShoppingBasket,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import {
  handleGetProducts,
  handleCreateProduct,
  handleUpdateProduct,
  handleDeleteProduct,
  handleBulkUploadProducts,
  handleCreateCategories,
  handleGetCategories,
} from "@/services/apiClient";
import CreateProductModal from "@/features/sales/components/invoice/Modal/CreateProductModal";
import UploadBulkProductModal, {
  type ProductBulkImportRow,
} from "@/features/sales/components/invoice/Modal/UploadBulkProductModal";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";

const PAGE_SIZE = 50;

const ENABLE_ROW_VIRTUALIZATION = false;

type ProductRow = {
  _id?: string;
  productName?: string;
  category?: string;
  subCategory?: string;
  sellingPrice?: number;
  purchasePrice?: number;
  stockQty?: number;
  isCsp?: boolean;
  cspLabel?: string | null;
  cspEnrollmentId?: string | null;
  barCode?: string;
  barcode?: string;
  categoryId?: string;
  subCategoryId?: string;
  variants?: Array<{ name?: string } | string>;
};

type ProductStats = {
  totalProducts: number;
  totalStockQty: number;
  inStockCount: number;
  outOfStockCount: number;
  categoryCount: number;
};

function getVariantNames(product: ProductRow): string[] {
  if (!Array.isArray(product.variants)) return [];
  return product.variants
    .map((v) =>
      typeof v === "string"
        ? v.trim()
        : String(v?.name ?? "").trim(),
    )
    .filter(Boolean);
}

function isAbortError(error: unknown) {
  return (
    (error as { name?: string; code?: string })?.name === "CanceledError" ||
    (error as { name?: string; code?: string })?.code === "ERR_CANCELED" ||
    (error as { name?: string })?.name === "AbortError"
  );
}

export default function ProductScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isError, setIsError] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkCreateModal, setBulkCreateModal] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [viewProduct, setViewProduct] = useState<any | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [categories, setCategories] = useState<{ _id?: string; name?: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    handleGetCategories()
      .then((res) => {
        const list = Array.isArray(res?.categories)
          ? res.categories
          : Array.isArray(res)
            ? res
            : [];
        setCategories(list);
      })
      .catch((err) => console.error("Error fetching categories:", err));
  }, []);

  const categoriesList = useMemo(() => {
    const fromApi = categories
      .map((c) => String(c?.name || "").trim())
      .filter(Boolean);
    const fromProducts = products
      .map((p) => String(p?.category || "").trim())
      .filter(Boolean);
    return Array.from(new Set([...fromApi, ...fromProducts]));
  }, [categories, products]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      const cat = String(p.category || "General").trim().toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [products]);

  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "out_of_stock">("all");

  const displayedMobileProducts = useMemo(() => {
    return products.filter((p) => {
      if (
        selectedCategory !== "all" &&
        String(p.category || "").trim().toLowerCase() !== selectedCategory.toLowerCase()
      ) {
        return false;
      }
      const stock = Number(p.stockQty ?? 0);
      const isOut = stock < 3;
      if (stockFilter === "in_stock" && isOut) return false;
      if (stockFilter === "out_of_stock" && !isOut) return false;
      return true;
    });
  }, [products, selectedCategory, stockFilter]);
  const [globalFilter, setGlobalFilter] = useState("");
  const search = String(globalFilter ?? "").trim();
  const [sorting, setSorting] = useState<MRT_SortingState>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalRowCount, setTotalRowCount] = useState(0);
  const [stats, setStats] = useState<ProductStats>({
    totalProducts: 0,
    totalStockQty: 0,
    inStockCount: 0,
    outOfStockCount: 0,
    categoryCount: 0,
  });

  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    setEditProduct(null);
    setShowCreateModal(true);
    const next = new URLSearchParams(searchParams);
    next.delete("create");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);
  const fetchLockRef = useRef(false);
  const requestIdRef = useRef(0);

  const sortParams = useMemo(() => {
    const first = sorting[0];
    if (!first?.id) {
      return { sortBy: "createdAt", sortDir: "desc" as const };
    }
    return {
      sortBy: first.id,
      sortDir: first.desc ? ("desc" as const) : ("asc" as const),
    };
  }, [sorting]);

  const fetchPage = useCallback(
    async ({
      pageToLoad,
      append,
      signal,
      withStats,
    }: {
      pageToLoad: number;
      append: boolean;
      signal?: AbortSignal;
      withStats?: boolean;
    }) => {
      const requestId = ++requestIdRef.current;
      try {
        if (append) setIsFetchingMore(true);
        else setLoading(true);

        const prodRes = await handleGetProducts({
          search,
          type: "product",
          page: pageToLoad,
          limit: PAGE_SIZE,
          sortBy: sortParams.sortBy,
          sortDir: sortParams.sortDir,
          includeStats: Boolean(withStats),
          signal,
        });

        if (requestId !== requestIdRef.current) return;

        const productList = Array.isArray(prodRes?.products)
          ? prodRes.products
          : [];
        const pagination = prodRes?.pagination || prodRes?.meta || {};
        const total = Number(
          pagination.total ?? pagination.totalRowCount ?? productList.length,
        );
        const more =
          typeof pagination.hasMore === "boolean"
            ? pagination.hasMore
            : pageToLoad * PAGE_SIZE < total;

        setTotalRowCount(total);
        setHasMore(more);
        setPage(pageToLoad);
        setIsError(false);
        setProducts((prev) => {
          if (!append) return productList;
          const seen = new Set(prev.map((p) => String(p._id)));
          const merged = [...prev];
          for (const row of productList) {
            const id = String(row?._id || "");
            if (!id || seen.has(id)) continue;
            seen.add(id);
            merged.push(row);
          }
          return merged;
        });

        if (withStats && prodRes?.stats) {
          setStats({
            totalProducts: Number(prodRes.stats.totalProducts ?? total),
            totalStockQty: Number(prodRes.stats.totalStockQty ?? 0),
            inStockCount: Number(prodRes.stats.inStockCount ?? 0),
            outOfStockCount: Number(prodRes.stats.outOfStockCount ?? 0),
            categoryCount: Number(prodRes.stats.categoryCount ?? 0),
          });
        } else if (!append) {
          setStats((prev) => ({ ...prev, totalProducts: total }));
        }
      } catch (error) {
        if (isAbortError(error)) return;
        console.error("Error fetching data:", error);
        if (requestId !== requestIdRef.current) return;
        setIsError(true);
        if (!append) {
          setProducts([]);
          setHasMore(false);
          setTotalRowCount(0);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setIsFetchingMore(false);
          fetchLockRef.current = false;
        }
      }
    },
    [search, sortParams.sortBy, sortParams.sortDir],
  );

  const reloadFromStart = useCallback(
    async (signal?: AbortSignal) => {
      fetchLockRef.current = false;
      setHasMore(true);
      setPage(1);
      try {
        rowVirtualizerInstanceRef.current?.scrollToIndex?.(0);
      } catch {
        /* ignore */
      }
      await fetchPage({
        pageToLoad: 1,
        append: false,
        signal,
        withStats: true,
      });
    },
    [fetchPage],
  );

  useEffect(() => {
    const controller = new AbortController();
    void reloadFromStart(controller.signal);
    return () => controller.abort();
  }, [reloadFromStart]);

  const fetchMoreOnBottomReached = useCallback(
    (container?: HTMLDivElement | null) => {
      if (!container || fetchLockRef.current || loading || isFetchingMore) {
        return;
      }
      if (!hasMore) return;
      const { scrollHeight, scrollTop, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < 400) {
        fetchLockRef.current = true;
        void fetchPage({
          pageToLoad: page + 1,
          append: true,
          withStats: false,
        });
      }
    },
    [fetchPage, hasMore, isFetchingMore, loading, page],
  );

  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached, products.length]);

  const handleSubmitProduct = async (formData: FormData) => {
    try {
      setLoading(true);
      if (editProduct && editProduct._id) {
        await handleUpdateProduct(editProduct._id, formData);
      } else {
        await handleCreateProduct(formData);
      }
      await reloadFromStart();
      setEditProduct(null);
    } catch (error) {
      console.error("Error saving product:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImportProducts = async (rows: ProductBulkImportRow[]) => {
    if (!rows.length) return;

    try {
      setBulkImporting(true);

      const normalizeKey = (value: string) =>
        String(value || "")
          .replace(/[\r\n\t]+/g, " ")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " ");

      const uniqueBarcodeKey = (value: string) => {
        const digits = String(value || "")
          .replace(/[\r\n\t\s]+/g, "")
          .trim();
        return /^\d{8,14}$/.test(digits) ? digits : "";
      };

      // Match server: Product+Variant primary; itemCode + real EAN secondary
      const rowIdentityKeys = (row: ProductBulkImportRow) => {
        const keys: string[] = [];
        const name = normalizeKey(row.productName || "");
        const variant = normalizeKey(row.variant || "");
        if (name) keys.push(`name:${name}|variant:${variant}`);
        const itemCode = normalizeKey(row.itemCode || "");
        if (itemCode) keys.push(`item:${itemCode}`);
        const barcode = uniqueBarcodeKey(row.barcode || "");
        if (barcode) keys.push(`barcode:${barcode}`);
        return keys;
      };

      // Drop true duplicate rows in the Excel before calling the API
      const seen = new Set<string>();
      const uniqueRows: ProductBulkImportRow[] = [];
      let clientSkippedDuplicates = 0;
      for (const row of rows) {
        const keys = rowIdentityKeys(row);
        if (!normalizeKey(row.productName || "")) continue;
        const isDup = keys.some((k) => seen.has(k));
        if (isDup) {
          clientSkippedDuplicates += 1;
          continue;
        }
        for (const k of keys) seen.add(k);
        uniqueRows.push({
          ...row,
          barcode: String(row.barcode || "")
            .replace(/[\r\n\t]+/g, "")
            .trim(),
        });
      }

      if (!uniqueRows.length) {
        await Swal.fire(
          "No products to import",
          clientSkippedDuplicates
            ? "Every row was a duplicate within the file."
            : "No valid product rows found.",
          "warning",
        );
        return;
      }

      const payload = uniqueRows.map((row) => {
        const category =
          String(row.category || "").trim() || "Uncategorized";
        return {
          productName: row.productName,
          variant: row.variant || "",
          category,
          categoryName: category,
          barcode: row.barcode || "",
          barCode: row.barcode || "",
          sellingPrice: row.sellingPrice,
          unitPrice: row.sellingPrice,
          itemCode: row.itemCode || "",
          stockQty: row.stockQty || 0,
          qty: row.stockQty || 0,
          purchasePrice: row.purchasePrice || 0,
          variants: row.variant
            ? [
                {
                  name: row.variant,
                  sellingPrice: row.sellingPrice,
                  purchasePrice: row.purchasePrice || 0,
                  barcode: row.barcode || "",
                },
              ]
            : [],
        };
      });

      // Pre-create unique categories via POST /api/categories (backend also ensures this)
      const uniqueCategories = [
        ...new Set(
          payload.map((row) => row.category || "Uncategorized").filter(Boolean),
        ),
      ];
      if (uniqueCategories.length) {
        try {
          await handleCreateCategories({
            categories: uniqueCategories.map((name) => ({ name })),
          });
        } catch (catError) {
          console.error("Category pre-create failed:", catError);
        }
      }

      const response = await handleBulkUploadProducts(payload);
      await reloadFromStart();
      setBulkCreateModal(false);

      const created = Number(
        response?.summary?.created ?? response?.products?.length ?? 0,
      );
      const failed = Number(response?.summary?.failed ?? 0);
      const skippedDuplicates =
        Number(response?.summary?.skippedDuplicates ?? 0) +
        clientSkippedDuplicates;
      const invalidRows = Array.isArray(response?.summary?.invalidRows)
        ? response.summary.invalidRows
        : [];
      const duplicateRows = Array.isArray(response?.summary?.duplicateRows)
        ? response.summary.duplicateRows
        : Array.isArray(response?.duplicateRows)
          ? response.duplicateRows
          : [];

      const issueLines = [...invalidRows, ...duplicateRows]
        .slice(0, 25)
        .map(
          (r: { row?: number; productName?: string; reason?: string }) =>
            `Row ${r.row ?? "?"} (${r.productName || "—"}): ${r.reason || "Skipped"}`,
        )
        .join("\n");

      if (failed > 0 || skippedDuplicates > 0 || issueLines) {
        await Swal.fire({
          icon: created > 0 ? "warning" : "error",
          title: "Bulk import finished",
          html: `<p class="text-sm text-left mb-2">Created <b>${created}</b> · Duplicates skipped <b>${skippedDuplicates || duplicateRows.length}</b> · Failed <b>${failed}</b></p>
            ${issueLines ? `<pre class="text-left text-xs max-h-48 overflow-auto whitespace-pre-wrap">${issueLines.replace(/</g, "&lt;")}</pre>` : ""}`,
        });
        return;
      }

      await Swal.fire(
        "Import complete",
        response?.message ||
          `Created ${created} product${created === 1 ? "" : "s"} successfully.`,
        "success",
      );
    } catch (error: any) {
      const data = error?.response?.data;
      const duplicateRows = Array.isArray(data?.duplicateRows)
        ? data.duplicateRows
        : Array.isArray(data?.summary?.duplicateRows)
          ? data.summary.duplicateRows
          : [];
      const invalidRows = Array.isArray(data?.invalidRows)
        ? data.invalidRows
        : Array.isArray(data?.summary?.invalidRows)
          ? data.summary.invalidRows
          : [];
      const issueLines = [...invalidRows, ...duplicateRows]
        .slice(0, 25)
        .map(
          (r: { row?: number; productName?: string; reason?: string }) =>
            `Row ${r.row ?? "?"} (${r.productName || "—"}): ${r.reason || "Skipped"}`,
        )
        .join("\n");

      await Swal.fire({
        icon: "error",
        title: "Import failed",
        html: issueLines
          ? `<p class="text-sm text-left mb-2">${(data?.message || "Could not bulk upload products.").replace(/</g, "&lt;")}</p>
             <pre class="text-left text-xs max-h-48 overflow-auto whitespace-pre-wrap">${issueLines.replace(/</g, "&lt;")}</pre>`
          : (data?.message ||
              error?.message ||
              "Could not bulk upload products."),
      });
    } finally {
      setBulkImporting(false);
    }
  };

  const handleDeleteProductClick = async (id: string) => {
    try {
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, delete it!",
      });

      if (result.isConfirmed) {
        setLoading(true);
        await handleDeleteProduct(id);
        await reloadFromStart();
        Swal.fire("Deleted!", "Your product has been deleted.", "success");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      Swal.fire("Error!", "Failed to delete product.", "error");
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "serial",
        header: "No.",
        size: 80,
        enableSorting: false,
        Cell: ({ row }: { row: any }) => (
          <span className="text-xs text-gray-500">{row.index + 1}</span>
        ),
      },
      {
        accessorKey: "productName",
        header: "Product Name",
        size: 220,
        Cell: ({ cell, row }: { cell: any; row: any }) => {
          const name = String(cell.getValue() || "").trim() || "—";
          const variantNames = getVariantNames(row.original as ProductRow);
          const variantLabel =
            variantNames.length > 0 ? ` (${variantNames.join(", ")})` : "";
          return (
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-slate-800">
                {name}
                {variantLabel ? (
                  <span className="font-medium text-slate-500">
                    {variantLabel}
                  </span>
                ) : null}
              </span>
              {row.original?.isCsp && (
                <span className="inline-flex w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                  {row.original.cspLabel || "CSP"}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "category",
        header: "Category",
        size: 150,
        Cell: ({ cell }: { cell: any }) => (
          <span className=" text-slate-800">{cell.getValue()}</span>
        ),
      },
      {
        accessorKey: "subCategory",
        header: "Sub Category",
        size: 150,
        enableSorting: false,
        Cell: ({ cell }: { cell: any }) => (
          <span className="text-slate-600">{cell.getValue()}</span>
        ),
      },
      {
        accessorKey: "sellingPrice",
        header: "Selling Price",
        Cell: ({ cell }: { cell: any }) => {
          const val = Number(cell.getValue() || 0);
          return <span>₹ {val.toLocaleString("en-IN")}</span>;
        },
      },
      {
        accessorKey: "purchasePrice",
        header: "Purchase Price",
        Cell: ({ cell }: { cell: any }) => {
          const val = Number(cell.getValue() || 0);
          return <span>₹ {val.toLocaleString("en-IN")}</span>;
        },
      },
      {
        accessorKey: "stockQty",
        header: "Stock",
        Cell: ({ cell }: { cell: any }) => {
          const qty = Number(cell.getValue() ?? 0);
          const isOut = qty < 3;
          return (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isOut
                  ? "bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200"
                  : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
              }`}
            >
              {qty} {isOut ? "(Out of stock)" : ""}
            </span>
          );
        },
      },
      {
        header: "Actions",
        accessorKey: "actions",
        enableSorting: false,
        Cell: ({ row }: { row: any }) => (
          <div className="flex items-center gap-2">
            <Can permission={PERMISSIONS.PRODUCT_UPDATE}>
              <button
                onClick={() => {
                  setEditProduct(row.original);
                  setShowCreateModal(true);
                }}
                className="px-3 py-2 text-sm bg-green-100 text-white rounded hover:bg-green-200 cursor-pointer"
              >
                <SquarePen color="green" size={18} />
              </button>
            </Can>

            <Can permission={PERMISSIONS.PRODUCT_DELETE}>
              <button
                onClick={() => {
                  if (row.original._id) {
                    handleDeleteProductClick(row.original._id);
                  }
                }}
                className="px-3 py-2 text-sm bg-red-100 rounded hover:bg-red-200 cursor-pointer"
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
    data: products,
    getRowId: (row, index) =>
      String(row._id || `${row.productName ?? "product"}-${index}`),
    enablePagination: false,
    enableColumnFilters: false,
    enableRowVirtualization: ENABLE_ROW_VIRTUALIZATION,
    enableGlobalFilter: true,
    manualFiltering: true,
    manualSorting: true,
    initialState: {
      showGlobalFilter: true,
      density: "compact",
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    ...(ENABLE_ROW_VIRTUALIZATION
      ? {
          rowVirtualizerInstanceRef,
          rowVirtualizerOptions: {
            overscan: 8,
            estimateSize: () => 48,
          },
        }
      : {}),
    muiToolbarAlertBannerProps: isError
      ? {
          color: "error",
          children: "Error loading products. Try again.",
        }
      : undefined,
    renderBottomToolbarCustomActions: () => (
      <span className="px-2 text-xs text-gray-500">
        Showing {products.length.toLocaleString("en-IN")} of{" "}
        {totalRowCount.toLocaleString("en-IN")} products
        {isFetchingMore ? " · Loading more…" : hasMore ? "" : " · End of list"}
      </span>
    ),
    state: {
      globalFilter,
      isLoading: loading && products.length === 0,
      showAlertBanner: isError,
      showProgressBars: isFetchingMore || (loading && products.length > 0),
      sorting,
    },
    muiTablePaperProps: {
      elevation: 0,
      style: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
      },
    },
    muiTableContainerProps: {
      ref: tableContainerRef,
      sx: {
        maxWidth: "100%",
        maxHeight: {
          xs: "calc(100dvh - 9.5rem)",
          sm: "min(70vh, 720px)",
        },
        overflowX: "auto",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      },
      onScroll: (event: UIEvent<HTMLDivElement>) =>
        fetchMoreOnBottomReached(event.target as HTMLDivElement),
    },
  });

  const inStockComputed = useMemo(() => {
    if (stats.inStockCount > 0) return stats.inStockCount;
    return products.filter((p) => Number(p.stockQty ?? 0) >= 3).length;
  }, [stats.inStockCount, products]);

  const outOfStockComputed = useMemo(() => {
    if (stats.outOfStockCount > 0) return stats.outOfStockCount;
    return products.filter((p) => Number(p.stockQty ?? 0) < 3).length;
  }, [stats.outOfStockCount, products]);

  const cards = [
    {
      title: "Total Products",
      short: "Products",
      value: stats.totalProducts || totalRowCount,
      Icon: ShoppingBasket,
      bgClass: "bg-blue-50/80 border-blue-200/80 hover:border-blue-300",
      iconWrapClass: "bg-blue-500 text-white shadow-xs shadow-blue-500/20",
      titleClass: "text-blue-900",
      valueClass: "text-blue-950",
    },
    {
      title: "Products In Stock",
      short: "Stock",
      value: stats.totalStockQty,
      Icon: Boxes,
      bgClass: "bg-teal-50/80 border-teal-200/80 hover:border-teal-300",
      iconWrapClass: "bg-teal-500 text-white shadow-xs shadow-teal-500/20",
      titleClass: "text-teal-900",
      valueClass: "text-teal-950",
    },
    {
      title: "No of Categories",
      short: "Categories",
      value: stats.categoryCount,
      Icon: LayoutList,
      bgClass: "bg-purple-50/80 border-purple-200/80 hover:border-purple-300",
      iconWrapClass: "bg-purple-500 text-white shadow-xs shadow-purple-500/20",
      titleClass: "text-purple-900",
      valueClass: "text-purple-950",
    },
    {
      title: "Products In",
      short: "In",
      value: inStockComputed,
      Icon: ArrowDownCircle,
      bgClass: "bg-emerald-50/80 border-emerald-200/80 hover:border-emerald-300",
      iconWrapClass: "bg-emerald-500 text-white shadow-xs shadow-emerald-500/20",
      titleClass: "text-emerald-900",
      valueClass: "text-emerald-950",
    },
    {
      title: "Products Out",
      short: "Out",
      value: outOfStockComputed,
      Icon: ArrowUpCircle,
      bgClass: "bg-rose-50/80 border-rose-200/80 hover:border-rose-300",
      iconWrapClass: "bg-rose-500 text-white shadow-xs shadow-rose-500/20",
      titleClass: "text-rose-900",
      valueClass: "text-rose-950",
    },
  ];

  return (
    <div className="min-w-0 p-1">
      <div className="mb-2 flex items-center justify-between gap-2 sm:mb-4">
        <h1 className="min-w-0 truncate text-base font-semibold sm:text-xl">
          Products List
        </h1>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <Can permission={PERMISSIONS.PRODUCT_CREATE}>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="cursor-pointer rounded bg-black px-2 py-1 text-xs font-semibold text-white transition sm:px-3 sm:py-2 sm:text-[14px]"
            >
              <span className="sm:hidden">+ Add</span>
              <span className="hidden sm:inline">+ Add Product</span>
            </button>
          </Can>

          {showCreateModal && (
            <CreateProductModal
              onClose={() => {
                setShowCreateModal(false);
                setEditProduct(null);
              }}
              onSubmit={handleSubmitProduct}
              loading={loading}
              initialData={
                editProduct
                  ? {
                      ...editProduct,
                      type: "product",
                      barcode: editProduct.barCode || editProduct.barcode || "",
                      category: String(editProduct.category || ""),
                      categoryId: String(editProduct.categoryId || ""),
                      subCategory: String(editProduct.subCategory || ""),
                      subCategoryId: String(editProduct.subCategoryId || ""),
                      isCsp: editProduct.isCsp ? "yes" : "no",
                      cspEnrollmentId: editProduct.cspEnrollmentId
                        ? String(
                            typeof editProduct.cspEnrollmentId === "object"
                              ? editProduct.cspEnrollmentId._id ||
                                  editProduct.cspEnrollmentId.id ||
                                  ""
                              : editProduct.cspEnrollmentId,
                          )
                        : "",
                      // Keep each variant's own prices (do not inherit parent)
                      variants: Array.isArray(editProduct.variants)
                        ? editProduct.variants.map((v: any) =>
                            typeof v === "string"
                              ? {
                                  name: v,
                                  sellingPrice: Number(
                                    editProduct.sellingPrice || 0,
                                  ),
                                  purchasePrice: Number(
                                    editProduct.purchasePrice || 0,
                                  ),
                                  barcode: "",
                                }
                              : {
                                  name: String(v?.name ?? "").trim(),
                                  sellingPrice: Number(v?.sellingPrice ?? 0),
                                  purchasePrice: Number(v?.purchasePrice ?? 0),
                                  barcode: String(
                                    v?.barcode ?? v?.barCode ?? "",
                                  ).trim(),
                                },
                          )
                        : [],
                      images: [],
                    }
                  : undefined
              }
            />
          )}
          {showBulkCreateModal && (
            <UploadBulkProductModal
              onClose={() => setBulkCreateModal(false)}
              loading={bulkImporting}
              onImport={handleBulkImportProducts}
            />
          )}
        </div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
        {cards.map((item, index) => (
          <div
            key={item.title}
            className={`min-w-0 rounded-2xl border p-2.5 sm:p-4 shadow-xs transition duration-300 hover:shadow-md ${item.bgClass} ${
              index === 4 ? "col-span-2 sm:col-span-1" : ""
            }`}
          >
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <div
                className={`flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl shadow-xs ${item.iconWrapClass}`}
              >
                <item.Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span
                className={`min-w-0 truncate text-xs font-semibold sm:text-sm ${item.titleClass}`}
              >
                {item.title}
              </span>
            </div>
            <div
              className={`mt-1.5 sm:mt-2.5 truncate text-lg font-bold sm:text-2xl ${item.valueClass}`}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
      {/* Desktop Table View */}
      <div className="hidden md:block space-y-3">
        {categoriesList.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("all");
                table.getColumn("category")?.setFilterValue(undefined);
              }}
              className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All
              {selectedCategory === "all" && products.length > 0 && (
                <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-blue-600">
                  {products.length}
                </span>
              )}
            </button>
            {categoriesList.map((catName) => {
              const isSelected =
                selectedCategory.toLowerCase() === catName.toLowerCase();
              const count = categoryCounts[catName.toLowerCase()] || 0;
              return (
                <button
                  key={catName}
                  type="button"
                  onClick={() => {
                    const next = isSelected ? "all" : catName;
                    setSelectedCategory(next);
                    table
                      .getColumn("category")
                      ?.setFilterValue(next === "all" ? undefined : next);
                  }}
                  className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {catName}
                  {isSelected && (
                    <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-blue-600">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        <MaterialReactTable table={table} />
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-2.5">
        {/* Search Bar + Stock Filter Dropdown in Same Row */}
        <div className="flex items-center gap-2 mb-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={15}
            />
            <input
              type="text"
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs outline-none focus:border-slate-400 placeholder:text-slate-400 shadow-xs"
            />
          </div>

          {/* In Stock / Out of Stock Dropdown */}
          <div className="relative shrink-0">
            <select
              value={stockFilter}
              onChange={(e) =>
                setStockFilter(
                  e.target.value as "all" | "in_stock" | "out_of_stock",
                )
              }
              aria-label="Filter by stock status"
              className={`h-[35px] rounded-xl border px-2.5 pr-7 text-xs font-semibold outline-none shadow-xs appearance-none cursor-pointer transition ${
                stockFilter === "in_stock"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : stockFilter === "out_of_stock"
                    ? "border-rose-300 bg-rose-50 text-rose-800"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <option value="all">All Stock</option>
              <option value="in_stock">In Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>

        {/* Category Pills Below Search Bar */}
        {categoriesList.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All
              {selectedCategory === "all" && displayedMobileProducts.length > 0 && (
                <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-blue-600">
                  {displayedMobileProducts.length}
                </span>
              )}
            </button>
            {categoriesList.map((catName) => {
              const isSelected =
                selectedCategory.toLowerCase() === catName.toLowerCase();
              const count = categoryCounts[catName.toLowerCase()] || 0;
              return (
                <button
                  key={catName}
                  type="button"
                  onClick={() =>
                    setSelectedCategory(isSelected ? "all" : catName)
                  }
                  className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {catName}
                  {isSelected && (
                    <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-blue-600">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {loading && products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            Loading products...
          </div>
        ) : displayedMobileProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            No products found
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayedMobileProducts.map((p, idx) => {
              const stock = Number(p.stockQty ?? 0);
              const isOutOfStock = stock < 3;
              const img =
                (typeof p.imageUrl === "string" && p.imageUrl.trim()
                  ? p.imageUrl.trim()
                  : null) ||
                (Array.isArray((p as any).images) &&
                (p as any).images.length > 0 &&
                typeof (p as any).images[0] === "string" &&
                (p as any).images[0].trim()
                  ? (p as any).images[0].trim()
                  : null) ||
                (typeof (p as any).image === "string" && (p as any).image.trim()
                  ? (p as any).image.trim()
                  : null) ||
                null;

              return (
                <div
                  key={p._id || idx}
                  onClick={() => setViewProduct(p)}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition hover:border-slate-300 hover:shadow-md cursor-pointer active:scale-[0.99]"
                >
                  {/* Image Container */}
                  <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
                    {img && !imageErrors[p._id || String(idx)] ? (
                      <img
                        src={img}
                        alt={p.productName || "Product"}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={() =>
                          setImageErrors((prev) => ({
                            ...prev,
                            [p._id || String(idx)]: true,
                          }))
                        }
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-300">
                        <Package size={28} className="stroke-[1.5]" />
                      </div>
                    )}

                    {/* Stock Status Tag */}
                    <div className="absolute top-2 right-2">
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9px] font-bold shadow-xs ${
                          isOutOfStock
                            ? "bg-rose-500 text-white"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {isOutOfStock ? "Out of stock" : `Stock: ${stock}`}
                      </span>
                    </div>

                    {/* Barcode Tag */}
                    {(p.barCode || p.barcode) && (
                      <div className="absolute bottom-2 left-2">
                        <span className="inline-flex max-w-[100px] truncate items-center rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-xs">
                          {p.barCode || p.barcode}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content Area */}
                  <div className="flex flex-1 flex-col justify-between p-2.5 sm:p-3">
                    <div>
                      {/* Category & Stock */}
                      <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] font-medium text-slate-500">
                        <span className="truncate">
                          {p.category || "General"}
                        </span>
                        {stock > 0 && (
                          <span className="shrink-0 text-slate-400">
                            Stock: {stock}
                          </span>
                        )}
                      </div>

                      {/* Product Name */}
                      <h4
                        className="mt-1 min-h-[2rem] text-xs font-bold leading-snug text-slate-900 line-clamp-2 transition group-hover:text-blue-600 sm:text-sm"
                        title={p.productName}
                      >
                        {p.productName}
                      </h4>
                    </div>

                    {/* Footer: Price */}
                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Price</span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          ₹{Number(p.sellingPrice || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && (
          <div className="pt-2 text-center">
            <button
              type="button"
              disabled={isFetchingMore}
              onClick={() =>
                void fetchPage({
                  pageToLoad: page + 1,
                  append: true,
                  withStats: false,
                })
              }
              className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50"
            >
              {isFetchingMore ? "Loading more..." : "Load More Products"}
            </button>
          </div>
        )}
      </div>

      {/* Product View Details Modal */}
      {viewProduct && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setViewProduct(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <ShoppingBasket size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Product Details
                  </h3>
                  <p className="text-xs text-slate-400">
                    {viewProduct.category || "General"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewProduct(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 space-y-4">
              {/* Product Image preview */}
              {(() => {
                const prodImg =
                  (typeof viewProduct.imageUrl === "string" && viewProduct.imageUrl.trim()
                    ? viewProduct.imageUrl.trim()
                    : null) ||
                  (Array.isArray(viewProduct.images) &&
                  viewProduct.images.length > 0 &&
                  typeof viewProduct.images[0] === "string" &&
                  viewProduct.images[0].trim()
                    ? viewProduct.images[0].trim()
                    : null) ||
                  (typeof viewProduct.image === "string" && viewProduct.image.trim()
                    ? viewProduct.image.trim()
                    : null) ||
                  null;
                return prodImg ? (
                  <div className="relative aspect-16/9 w-full overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80">
                    <img
                      src={prodImg}
                      alt={viewProduct.productName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null;
              })()}

              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Product Name
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 mt-0.5 truncate">
                      {viewProduct.productName}
                    </h4>
                    {getVariantNames(viewProduct).length > 0 && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Variants: {getVariantNames(viewProduct).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        Number(viewProduct.stockQty ?? 0) < 3
                          ? "bg-rose-100 text-rose-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {Number(viewProduct.stockQty ?? 0) < 3
                        ? "Out of Stock"
                        : "In Stock"}
                    </span>
                    {viewProduct.isCsp && (
                      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        {viewProduct.cspLabel || "CSP"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Metric Tiles */}
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-3 text-center">
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Selling Price
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      ₹{Number(viewProduct.sellingPrice || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Cost Price
                    </span>
                    <span className="text-sm font-bold text-slate-600">
                      ₹{Number(viewProduct.purchasePrice || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Stock Qty
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {Number(viewProduct.stockQty || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Specs List */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Category</span>
                  <span className="font-semibold text-slate-800">
                    {viewProduct.category || "—"}
                  </span>
                </div>
                {viewProduct.subCategory && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Sub Category</span>
                    <span className="font-semibold text-slate-800">
                      {viewProduct.subCategory}
                    </span>
                  </div>
                )}
                {(viewProduct.barCode || viewProduct.barcode) && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Barcode</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {viewProduct.barCode || viewProduct.barcode}
                    </span>
                  </div>
                )}
                {viewProduct.itemCode && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Item Code</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {viewProduct.itemCode}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 bg-slate-50/50">
              <Can permission={PERMISSIONS.PRODUCT_DELETE}>
                <button
                  type="button"
                  onClick={() => {
                    const id = viewProduct._id;
                    setViewProduct(null);
                    if (id) handleDeleteProductClick(id);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </Can>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewProduct(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Close
                </button>
                <Can permission={PERMISSIONS.PRODUCT_UPDATE}>
                  <button
                    type="button"
                    onClick={() => {
                      const p = viewProduct;
                      setViewProduct(null);
                      setEditProduct(p);
                      setShowCreateModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-black/90 transition cursor-pointer"
                  >
                    <SquarePen size={14} />
                    Edit Product
                  </button>
                </Can>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
