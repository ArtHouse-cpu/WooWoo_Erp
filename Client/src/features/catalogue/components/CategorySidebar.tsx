import React, { useEffect, useState } from "react";
import { X, Pencil, Trash2, Check, Plus, Folder, FolderPlus } from "lucide-react";
import Swal from "sweetalert2";
import {
  handleGetCategories,
  handleCreateCategories,
  handleUpdateCategory,
  handleDeleteCategory,
  handleGetSubCategories,
  handleCreateSubCategory,
  handleUpdateSubCategory,
  handleDeleteSubCategory,
} from "@/services/apiClient";

type Category = {
  _id: string;
  name: string;
};

type SubCategory = {
  _id: string;
  name: string;
  categoryId?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onRefreshProducts?: () => void;
};

export default function CategorySidebar({ isOpen, onClose, onRefreshProducts }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [newCatName, setNewCatName] = useState("");
  const [newSubCatName, setNewSubCatName] = useState("");
  const [selectedParentCatId, setSelectedParentCatId] = useState("");

  // Inline edit states
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingSubName, setEditingSubName] = useState("");

  // Fetch categories and subcategories
  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, subRes] = await Promise.all([
        handleGetCategories(),
        handleGetSubCategories(),
      ]);

      const catList = Array.isArray(catRes?.categories) ? catRes.categories : [];
      const subList = Array.isArray(subRes)
        ? subRes
        : Array.isArray(subRes?.subCategories)
          ? subRes.subCategories
          : [];

      setCategories(catList);
      setSubCategories(subList);
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Add Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;

    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      Swal.fire("Warning", "Category already exists!", "warning");
      return;
    }

    try {
      setLoading(true);
      await handleCreateCategories({ categories: [{ name }] });
      setNewCatName("");
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Category created",
        showConfirmButton: false,
        timer: 2000,
      });
      loadData();
      onRefreshProducts?.();
    } catch (error: any) {
      Swal.fire("Error", error.response?.data?.message || "Failed to create category", "error");
    } finally {
      setLoading(false);
    }
  };

  // Add Subcategory
  const handleAddSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSubCatName.trim();
    const parentId = selectedParentCatId;
    if (!name || !parentId) return;

    // Check duplicate in same parent
    const existing = subCategories.filter((s) => s.categoryId === parentId);
    if (existing.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      Swal.fire("Warning", "Subcategory already exists under this parent!", "warning");
      return;
    }

    try {
      setLoading(true);
      await handleCreateSubCategory({ name, categoryId: parentId });
      setNewSubCatName("");
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Subcategory created",
        showConfirmButton: false,
        timer: 2000,
      });
      loadData();
      onRefreshProducts?.();
    } catch (error: any) {
      Swal.fire("Error", error.response?.data?.message || "Failed to create subcategory", "error");
    } finally {
      setLoading(false);
    }
  };

  // Edit Category
  const startEditingCategory = (cat: Category) => {
    setEditingCatId(cat._id);
    setEditingCatName(cat.name);
    setEditingSubId(null); // Cancel subcategory editing
  };

  const handleSaveCategory = async (id: string) => {
    const name = editingCatName.trim();
    if (!name) return;

    try {
      setLoading(true);
      await handleUpdateCategory(id, name);
      setEditingCatId(null);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Category updated",
        showConfirmButton: false,
        timer: 2000,
      });
      loadData();
      onRefreshProducts?.();
    } catch (error: any) {
      Swal.fire("Error", error.response?.data?.message || "Failed to update category", "error");
    } finally {
      setLoading(false);
    }
  };

  // Delete Category
  const handleDeleteCategoryClick = async (cat: Category) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to delete Category "${cat.name}"? This action is irreversible.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete it",
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        await handleDeleteCategory(cat._id);
        Swal.fire("Deleted!", "Category has been deleted.", "success");
        loadData();
        onRefreshProducts?.();
      } catch (error: any) {
        Swal.fire(
          "Cannot Delete",
          error.response?.data?.message || "Failed to delete category because it is in use.",
          "error"
        );
      } finally {
        setLoading(false);
      }
    }
  };

  // Edit Subcategory
  const startEditingSubCategory = (sub: SubCategory) => {
    setEditingSubId(sub._id);
    setEditingSubName(sub.name);
    setEditingCatId(null); // Cancel category editing
  };

  const handleSaveSubCategory = async (sub: SubCategory) => {
    const name = editingSubName.trim();
    if (!name) return;

    try {
      setLoading(true);
      await handleUpdateSubCategory(sub._id, name, sub.categoryId);
      setEditingSubId(null);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Subcategory updated",
        showConfirmButton: false,
        timer: 2000,
      });
      loadData();
      onRefreshProducts?.();
    } catch (error: any) {
      Swal.fire("Error", error.response?.data?.message || "Failed to update subcategory", "error");
    } finally {
      setLoading(false);
    }
  };

  // Delete Subcategory
  const handleDeleteSubCategoryClick = async (sub: SubCategory) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to delete Subcategory "${sub.name}"? This action is irreversible.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete it",
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        await handleDeleteSubCategory(sub._id);
        Swal.fire("Deleted!", "Subcategory has been deleted.", "success");
        loadData();
        onRefreshProducts?.();
      } catch (error: any) {
        Swal.fire(
          "Cannot Delete",
          error.response?.data?.message || "Failed to delete subcategory.",
          "error"
        );
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 animate-fadeIn"
        />
      )}

      {/* Sidebar Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-[460px] max-w-full bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out border-r border-slate-100 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
              <Folder size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Categories & Subcategories</h2>
              <p className="text-xs text-slate-500">Configure catalog classification structure</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="h-1 bg-indigo-500 w-full animate-pulse" />
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          
          {/* Section: Add Category Form */}
          <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <FolderPlus size={16} className="text-indigo-500" />
              Add Category
            </h3>
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                placeholder="Category name..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 min-w-0 bg-white rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-sm"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2.5 font-semibold text-sm transition flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <Plus size={16} />
                Add
              </button>
            </form>
          </div>

          {/* Section: Add Subcategory Form */}
          <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <FolderPlus size={16} className="text-emerald-500" />
              Add Subcategory
            </h3>
            <form onSubmit={handleAddSubCategory} className="space-y-3">
              <div>
                <select
                  value={selectedParentCatId}
                  onChange={(e) => setSelectedParentCatId(e.target.value)}
                  className="w-full bg-white rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition shadow-sm text-slate-700"
                >
                  <option value="">Select Parent Category...</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Subcategory name..."
                  value={newSubCatName}
                  onChange={(e) => setNewSubCatName(e.target.value)}
                  disabled={!selectedParentCatId}
                  className="flex-1 min-w-0 bg-white rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition shadow-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={!selectedParentCatId || !newSubCatName.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg px-4 py-2.5 font-semibold text-sm transition flex items-center gap-1.5 shadow-sm disabled:cursor-not-allowed active:scale-95"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
            </form>
          </div>

          {/* Section: Tree / Table List */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3">Classifications Hierarchy</h3>
            
            {categories.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
                <p className="text-sm text-slate-400">No categories found. Start by adding one above!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {categories.map((cat) => {
                  const subs = subCategories.filter((sub) => sub.categoryId === cat._id);
                  const isCatEditing = editingCatId === cat._id;

                  return (
                    <div
                      key={cat._id}
                      className="border border-slate-100 rounded-xl overflow-hidden shadow-sm"
                    >
                      {/* Category Header Row */}
                      <div className="bg-slate-50 px-4 py-3 flex items-center justify-between gap-3 border-b border-slate-100">
                        {isCatEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingCatName}
                              onChange={(e) => setEditingCatName(e.target.value)}
                              className="flex-1 min-w-0 bg-white rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-1"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveCategory(cat._id)}
                              className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded transition"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditingCatId(null)}
                              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition text-xs font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800 text-sm">{cat.name}</span>
                              <span className="text-[10px] bg-slate-200/70 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                                {subs.length} {subs.length === 1 ? "sub" : "subs"}
                              </span>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => startEditingCategory(cat)}
                                className="p-1 hover:bg-indigo-50 rounded text-slate-400 hover:text-indigo-600 transition"
                                title="Edit Category"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteCategoryClick(cat)}
                                className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition"
                                title="Delete Category"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Nested Subcategories */}
                      <div className="bg-white p-3 space-y-2">
                        {subs.length === 0 ? (
                          <p className="text-xs text-slate-400 italic px-2">No subcategories defined</p>
                        ) : (
                          <div className="space-y-1.5">
                            {subs.map((sub) => {
                              const isSubEditing = editingSubId === sub._id;

                              return (
                                <div
                                  key={sub._id}
                                  className="flex items-center justify-between gap-3 pl-4 pr-2 py-1.5 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-100"
                                >
                                  {isSubEditing ? (
                                    <div className="flex items-center gap-2 flex-1">
                                      <input
                                        type="text"
                                        value={editingSubName}
                                        onChange={(e) => setEditingSubName(e.target.value)}
                                        className="flex-1 min-w-0 bg-white rounded border border-slate-300 px-2 py-0.5 text-xs outline-none focus:border-emerald-500 focus:ring-1"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleSaveSubCategory(sub)}
                                        className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded transition"
                                      >
                                        <Check size={12} />
                                      </button>
                                      <button
                                        onClick={() => setEditingSubId(null)}
                                        className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition text-[10px] font-semibold"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                                        <span className="text-slate-600 text-xs font-medium">{sub.name}</span>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => startEditingSubCategory(sub)}
                                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
                                          title="Rename Subcategory"
                                        >
                                          <Pencil size={12} />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSubCategoryClick(sub)}
                                          className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition"
                                          title="Delete Subcategory"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition text-sm font-semibold text-slate-600 shadow-sm active:scale-95 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
