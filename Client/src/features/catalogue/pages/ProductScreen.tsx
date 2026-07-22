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
import CategoryListModal from "@/features/catalogue/components/CategoryListModal";
import CategorySidebar from "@/features/catalogue/components/CategorySidebar";
import {
  handleGetProducts,
  handleCreateProduct,
  handleUpdateProduct,
  handleDeleteProduct,
} from "@/services/apiClient";
import CreateProductModal from "@/features/sales/components/invoice/Modal/CreateProductModal";
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
};


export default function ProductScreen() {
  const [openCategoryListModal, setOpenCategoryListModal] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCategorySidebar, setShowCategorySidebar] = useState(false);
  const [editProduct, setEditProduct] = useState<any | null>(null);

  const fetchData = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const prodRes = await handleGetProducts("", signal);
      
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
        size: 150,
        Cell: ({ cell }: { cell: any }) => (
          <span className="font-semibold text-slate-800">{cell.getValue()}</span>
        ),
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
          {/* <div
            className="w-[120px] bg-black text-white py-2 px-1 rounded  text-[14px] font-semibold transition text-center border-radius-[50px] cursor-pointer"
            onClick={() => setOpenCategoryListModal(true)}
          >
            Category
          </div> */}
          {openCategoryListModal && (
            <CategoryListModal
              onClose={() => setOpenCategoryListModal(false)}
            />
          )}
          <Can permission={PERMISSIONS.CATEGORY_MANAGE}>
            <button
              type="button"
              onClick={() => setShowCategorySidebar(true)}
              className="w-[120px] bg-black text-white py-2 px-1 rounded  text-[14px] font-semibold transition text-center border-radius-[50px] cursor-pointer"
            >
              + Add Category
            </button>
          </Can>
          <Can permission={PERMISSIONS.PRODUCT_CREATE}>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="w-[120px] bg-black text-white py-2 px-1 rounded  text-[14px] font-semibold transition text-center border-radius-[50px] cursor-pointer"
            >
              + Add Product
            </button>
          </Can>
          {showCategorySidebar && (
            <CategorySidebar
              isOpen={showCategorySidebar}
              onClose={() => setShowCategorySidebar(false)}
              onRefreshProducts={fetchData}
            />
          )}
          {showCreateModal && (
            <CreateProductModal
              onClose={() => {
                setShowCreateModal(false);
                setEditProduct(null);
              }}
              onSubmit={handleSubmitProduct}
              loading={loading}
              initialData={editProduct}
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
