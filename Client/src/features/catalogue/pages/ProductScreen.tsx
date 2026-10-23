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
  ShoppingBasket,
  SquarePen,
  Trash2,
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
    } catch (error) {
      console.error("Error saving product:", error);
    } finally {
      setLoading(false);
      setEditProduct(null);
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
      <div className="mb-2 grid grid-cols-5 gap-1 sm:mb-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
        {cards.map((item) => (
          <div
            key={item.title}
            className="min-w-0 rounded-md border border-gray-200 bg-white px-1 py-1 sm:rounded-xl sm:p-4"
          >
            <div className="flex min-w-0 items-center gap-1 text-gray-600 sm:gap-2">
              <item.Icon className="h-3 w-3 shrink-0 text-gray-500 sm:h-[22px] sm:w-[22px]" />
              <span className="min-w-0 truncate text-[10px] font-medium leading-tight sm:text-base">
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.title}</span>
              </span>
            </div>
            <div className="mt-0.5 truncate text-sm font-semibold leading-tight sm:mt-3 sm:text-2xl">
              {item.value}
            </div>
          </div>
        ))}
      </div>
      <MaterialReactTable table={table} />
    </div>
  );
}
