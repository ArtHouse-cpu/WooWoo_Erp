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
      { accessorKey: "stockQty", header: "Stock" },
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

  const cards = [
    {
      title: "Total Products",
      short: "Products",
      value: stats.totalProducts || totalRowCount,
      Icon: ShoppingBasket,
    },
    {
      title: "Products In Stock",
      short: "Stock",
      value: stats.totalStockQty,
      Icon: Boxes,
    },
    {
      title: "No of Categories",
      short: "Categories",
      value: stats.categoryCount,
      Icon: LayoutList,
    },
    {
      title: "Products In",
      short: "In",
      value: stats.inStockCount,
      Icon: ArrowDownCircle,
    },
    {
      title: "Products Out",
      short: "Out",
      value: stats.outOfStockCount,
      Icon: ArrowUpCircle,
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
          <Can
            anyOf={[PERMISSIONS.PRODUCT_CREATE, PERMISSIONS.PRODUCT_BULK_CREATE]}
          >
            <button
              type="button"
              onClick={() => setBulkCreateModal(true)}
              className="cursor-pointer rounded bg-black px-2 py-1 text-xs font-semibold text-white transition sm:px-3 sm:py-2 sm:text-[14px]"
            >
              <span className="sm:hidden">+ Bulk</span>
              <span className="hidden sm:inline">+ Bulk Upload</span>
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
            className={`min-w-0 rounded-xl border border-gray-200 bg-white p-2.5 sm:p-4 transition duration-300 hover:shadow-sm ${
              index === 4 ? "col-span-2 sm:col-span-1" : ""
            }`}
          >
            <div className="flex min-w-0 items-center gap-1.5 text-gray-600 sm:gap-2">
              <item.Icon className="h-4 w-4 shrink-0 text-gray-500 sm:h-[22px] sm:w-[22px]" />
              <span className="min-w-0 truncate text-xs font-medium sm:text-base">
                {item.title}
              </span>
            </div>
            <div className="mt-1 truncate text-base font-semibold sm:mt-3 sm:text-2xl">
              {item.value}
            </div>
          </div>
        ))}
      </div>
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
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-slate-400"
          />
        </div>

        {loading && products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            No products found
          </div>
        ) : (
          products.map((p, idx) => {
            const variantNames = getVariantNames(p);
            const variantLabel =
              variantNames.length > 0 ? ` (${variantNames.join(", ")})` : "";
            const stock = Number(p.stockQty ?? 0);
            const isOutOfStock = stock <= 0;

            return (
              <div
                key={p._id || idx}
                onClick={() => setViewProduct(p)}
                className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition hover:border-slate-300 active:bg-slate-50/70"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-slate-900">
                        {p.productName || "Unnamed Product"}
                      </span>
                      {variantLabel && (
                        <span className="text-xs font-normal text-slate-500">
                          {variantLabel}
                        </span>
                      )}
                      {p.isCsp && (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          {p.cspLabel || "CSP"}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-600">
                        {p.category || "Uncategorized"}
                      </span>
                      {p.subCategory && (
                        <>
                          <span>•</span>
                          <span>{p.subCategory}</span>
                        </>
                      )}
                      {(p.barCode || p.barcode) && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[11px] text-slate-400">
                            {p.barCode || p.barcode}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      isOutOfStock
                        ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60"
                        : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
                    }`}
                  >
                    {isOutOfStock ? "Out of Stock" : `Stock: ${stock}`}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="block text-[10px] font-medium uppercase text-slate-400">
                        Selling
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        ₹{Number(p.sellingPrice || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    {p.purchasePrice !== undefined && (
                      <div>
                        <span className="block text-[10px] font-medium uppercase text-slate-400">
                          Cost
                        </span>
                        <span className="text-xs font-medium text-slate-600">
                          ₹{Number(p.purchasePrice || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Can permission={PERMISSIONS.PRODUCT_UPDATE}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditProduct(p);
                          setShowCreateModal(true);
                        }}
                        className="cursor-pointer rounded-lg bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100"
                        title="Edit product"
                      >
                        <SquarePen size={15} />
                      </button>
                    </Can>
                    <Can permission={PERMISSIONS.PRODUCT_DELETE}>
                      <button
                        type="button"
                        onClick={() => {
                          if (p._id) void handleDeleteProductClick(p._id);
                        }}
                        className="cursor-pointer rounded-lg bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100"
                        title="Delete product"
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
                        Number(viewProduct.stockQty ?? 0) <= 0
                          ? "bg-rose-100 text-rose-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {Number(viewProduct.stockQty ?? 0) <= 0
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
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setViewProduct(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Close
              </button>
              <Can permission={PERMISSIONS.PRODUCT_UPDATE}>
                <button
                  type="button"
                  onClick={() => {
                    const prod = viewProduct;
                    setViewProduct(null);
                    setEditProduct(prod);
                    setShowCreateModal(true);
                  }}
                  className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-black/90 transition"
                >
                  Edit Product
                </button>
              </Can>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
