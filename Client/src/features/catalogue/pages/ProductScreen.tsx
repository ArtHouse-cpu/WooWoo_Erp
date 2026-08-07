import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  MaterialReactTable,
  useMaterialReactTable,
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
  variants?: Array<{ name?: string } | string>;
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


export default function ProductScreen() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkCreateModal, setBulkCreateModal] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [editProduct, setEditProduct] = useState<any | null>(null);

  const fetchData = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const prodRes = await handleGetProducts("", signal, "product");
      
      const productList = Array.isArray(prodRes?.products)
        ? prodRes.products
        : Array.isArray(prodRes)
          ? prodRes
          : [];

      setProducts(productList);
    } catch (error) {
      console.error("Error fetching data:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, []);

  const handleSubmitProduct = async (formData: FormData) => {
    try {
      setLoading(true);
      if (editProduct && editProduct._id) {
        await handleUpdateProduct(editProduct._id, formData);
      } else {
        await handleCreateProduct(formData);
      }
      await fetchData();
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

      const payload = rows.map((row) => ({
        productName: row.productName,
        variant: row.variant || "",
        category: String(row.category || "").trim(),
        categoryName: String(row.category || "").trim(),
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
      }));

      const missingCategory = payload.find((row) => !row.category);
      if (missingCategory) {
        await Swal.fire(
          "Category required",
          `"${missingCategory.productName}" has no Category. Fill Category in Excel — it will be auto-created if new.`,
          "warning",
        );
        return;
      }

      // Pre-create unique categories via POST /api/categories (backend also ensures this)
      const uniqueCategories = [
        ...new Set(payload.map((row) => row.category).filter(Boolean)),
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
      await fetchData();
      setBulkCreateModal(false);

      const created = Number(
        response?.summary?.created ?? response?.products?.length ?? 0,
      );
      const failed = Number(response?.summary?.failed ?? 0);
      const skippedDuplicates = Number(
        response?.summary?.skippedDuplicates ?? 0,
      );
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
        await fetchData();
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
        Cell: ({ row, table }: { row: any; table: any }) => {
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
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: products,
    state: {
      isLoading: loading,
    },
    muiTablePaperProps: {
      elevation: 0,
      style: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
      },
    },
  });

  const cards = [
    {
      title: "Total Products",
      value: products.length,
      icon: <ShoppingBasket size={22} className="text-gray-500" />,
    },
    {
      title: "Products In Stock",
      value: products.reduce((sum, p) => sum + (p.stockQty || 0), 0),
      icon: <Boxes size={22} className="text-gray-500" />,
    },
    {
      title: "No of Categories",
      value: new Set(products.map((p) => p.category).filter(Boolean)).size,
      icon: <LayoutList size={22} className="text-gray-500" />,
    },

    {
      title: "Products In",
      value: products.filter((p) => (p.stockQty || 0) > 0).length,
      icon: <ArrowDownCircle size={22} className="text-gray-500" />,
    },
    {
      title: "Products Out",
      value: products.filter((p) => (p.stockQty || 0) <= 0).length,
      icon: <ArrowUpCircle size={22} className="text-gray-500" />,
    },
  ];

  return (
    <div className="p-1">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold ">Products List</h1>
        <div className="flex gap-3">
          <Can permission={PERMISSIONS.PRODUCT_CREATE}>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="w-[120px] bg-black text-white py-2 px-1 rounded  text-[14px] font-semibold transition text-center border-radius-[50px] cursor-pointer"
            >
              + Add Product
            </button>
          </Can>
          <Can
            anyOf={[PERMISSIONS.PRODUCT_CREATE, PERMISSIONS.PRODUCT_BULK_CREATE]}
          >
            <button
              type="button"
              onClick={() => setBulkCreateModal(true)}
              className="w-[120px] bg-black text-white py-2 px-1 rounded  text-[14px] font-semibold transition text-center border-radius-[50px] cursor-pointer"
            >
              + Bulk Upload
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-3">
        {cards.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-gray-200 p-4  hover:shadow-sm transition duration-300 cursor-pointer"
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
    </div>
  );
}
