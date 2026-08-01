import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react"; // Import Icons
import Swal from "sweetalert2"; // Import SweetAlert
import {
  handleCreateCategories,
  handleCreateSubCategory,
  handleGetCategories,
  handleGetSubCategories,
  handleUpdateCategory, // Add update Category
  handleDeleteCategory, // Add delete Category
  handleUpdateSubCategory, // Add update Subcategory
  handleDeleteSubCategory, // Add delete Subcategory
} from "@/services/apiClient";

type Category = {
  _id: string;
  name: string;
};

type SubCategory = {
  _id: string;
  name: string;
  categoryId?: string;
  category?: string;
};

type SelectOption = {
  _id: string;
  name: string;
};

type Props = {
  categoryValue: string;
  /** Product stores category as name — used to resolve ID when editing */
  categoryName?: string;
  onCategoryChange: (categoryId: string, categoryName: string) => void;
  subCategoryValue?: string;
  /** Product stores shop/sub category as name — used to resolve ID when editing */
  subCategoryName?: string;
  onSubCategoryChange?: (subCategoryId: string, subCategoryName: string) => void;
  disabled?: boolean;
};

type SingleSelectCreatableProps = {
  label: string;
  value: string;
  options: SelectOption[];
  placeholder: string;
  disabled?: boolean;
  canCreate: boolean;
  isCreating: boolean;
  onChange: (id: string) => void;
  onCreate: (name: string) => Promise<boolean>;
  onEdit?: (id: string, currentName: string) => Promise<boolean>; // Add Edit prop
  onDelete?: (id: string) => Promise<boolean>;                   // Add Delete prop
};

function SingleSelectCreatable({
  label,
  value,
  options,
  placeholder,
  disabled = false,
  canCreate,
  isCreating,
  onChange,
  onCreate,
  onEdit,     // Destructure here
  onDelete,   // Destructure here
}: SingleSelectCreatableProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const selected =
    options.find((item) => item._id === value) ||
    options.find(
      (item) =>
        item.name.trim().toLowerCase() === String(value || "").trim().toLowerCase(),
    );
  const filteredOptions = options.filter((item) =>
    item.name.toLowerCase().includes(normalizedQuery),
  );

  const alreadyExists = options.some((item) => item.name.trim().toLowerCase() === normalizedQuery);
  const showCreateAction = !!normalizedQuery && canCreate && !alreadyExists;

  return (
    <div ref={containerRef} className="space-y-2">
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white p-2.5 text-left text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
      >
        <span className={selected ? "text-gray-900" : "text-gray-400"}>
          {selected?.name || placeholder}
        </span>
        <span className="text-xs text-gray-500">{open ? "▲" : "▼"}</span>
      </button>

      {open && !disabled && (
        <div className="rounded-lg border border-gray-300 bg-white shadow-sm">
          <div className="p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="max-h-52 overflow-auto border-t border-gray-200 py-1">
            {filteredOptions.map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between px-3 py-1.5 hover:bg-blue-50 group"
              >
                <button
                  type="button"
                  onClick={() => {
                    onChange(item._id);
                    setOpen(false);
                  }}
                  className="flex-1 text-left text-sm text-gray-700 outline-none"
                >
                  {item.name}
                </button>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation(); // Stop dropdown selection click trigger
                        await onEdit(item._id, item.name);
                      }}
                      className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-blue-600 transition"
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation(); // Stop dropdown selection click trigger
                        await onDelete(item._id);
                      }}
                      className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600 transition"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            

            {showCreateAction && (
              <button
                type="button"
                disabled={isCreating}
                onClick={async () => {
                  const ok = await onCreate(query.trim());
                  if (ok) {
                    setOpen(false);
                    setQuery("");
                  }
                }}
                className="block w-full border-t border-gray-200 px-3 py-2 text-left text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? "Creating..." : `Create "${query.trim()}"`}
              </button>
            )}

            {filteredOptions.length === 0 && !showCreateAction && (
              <div className="px-3 py-2 text-sm text-gray-500">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CategorySelect({
  categoryValue,
  categoryName = "",
  onCategoryChange,
  subCategoryValue = "",
  subCategoryName = "",
  onSubCategoryChange,
  disabled = false,
}: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingSubCategory, setIsCreatingSubCategory] = useState(false);
  const onCategoryChangeRef = useRef(onCategoryChange);
  const onSubCategoryChangeRef = useRef(onSubCategoryChange);
  onCategoryChangeRef.current = onCategoryChange;
  onSubCategoryChangeRef.current = onSubCategoryChange;

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([handleGetCategories(controller.signal), handleGetSubCategories(controller.signal)])
      .then(([categoryRes, subCategoryRes]) => {
        setCategories(Array.isArray(categoryRes?.categories) ? categoryRes.categories : []);

        const list = Array.isArray(subCategoryRes)
          ? subCategoryRes
          : Array.isArray(subCategoryRes?.subCategories)
            ? subCategoryRes.subCategories
            : [];
        setSubCategories(list);
      })
      .catch(() => {
        setCategories([]);
        setSubCategories([]);
      });
    return () => controller.abort();
  }, []);

  // Prefill category ID from saved product category name on edit
  useEffect(() => {
    if (!categories.length) return;
    const byId = categories.find((c) => c._id === categoryValue);
    if (byId) return;

    const hint = String(categoryName || categoryValue || "").trim();
    if (!hint) return;

    const byName = categories.find(
      (c) => c.name.trim().toLowerCase() === hint.toLowerCase(),
    );
    if (byName && byName._id !== categoryValue) {
      onCategoryChangeRef.current(byName._id, byName.name);
    }
  }, [categories, categoryValue, categoryName]);

  // Prefill shop/sub category ID from saved product subCategory name on edit
  useEffect(() => {
    if (!subCategories.length) return;
    const byId = subCategories.find((s) => s._id === subCategoryValue);
    if (byId) return;

    const hint = String(subCategoryName || subCategoryValue || "").trim();
    if (!hint) return;

    const byName = subCategories.find((s) => {
      const nameMatch = s.name.trim().toLowerCase() === hint.toLowerCase();
      if (!nameMatch) return false;
      if (!categoryValue) return true;
      return (
        s.categoryId === categoryValue ||
        String(s.category || "").toLowerCase() ===
          String(categoryName || "").trim().toLowerCase()
      );
    });
    if (byName && byName._id !== subCategoryValue) {
      onSubCategoryChangeRef.current?.(byName._id, byName.name);
    }
  }, [
    subCategories,
    subCategoryValue,
    subCategoryName,
    categoryValue,
    categoryName,
  ]);

  const subCategoriesBySelectedCategory = useMemo(
    () =>
      subCategories.filter((subCat) => {
        if (!categoryValue) return true;
        return (
          subCat.categoryId === categoryValue ||
          subCat.category === categoryValue ||
          String(subCat.category || "").trim().toLowerCase() ===
            String(categoryName || "").trim().toLowerCase()
        );
      }),
    [subCategories, categoryValue, categoryName],
  );

  const createCategory = async (rawName: string) => {
    const name = rawName.trim();
    const exists = categories.some((cat) => cat.name.trim().toLowerCase() === name.toLowerCase());
    if (!name || exists || isCreatingCategory || disabled) return false;

    setIsCreatingCategory(true);
    try {
      const res = await handleCreateCategories({ categories: [{ name }] });
      const created = Array.isArray(res?.categories) ? res.categories[0] : null;
      if (created?._id) {
        setCategories((prev) => [...prev, created]);
        onCategoryChange(created._id, created.name);
        onSubCategoryChange?.("", "");
        return true;
      }
      return false;
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const createSubCategory = async (rawName: string) => {
    const name = rawName.trim();
    const exists = subCategoriesBySelectedCategory.some(
      (subCat) => subCat.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (!name || exists || isCreatingSubCategory || disabled || !categoryValue) return false;

    setIsCreatingSubCategory(true);
    try {
      const res = await handleCreateSubCategory({ name, categoryId: categoryValue });
      const created = res?._id
        ? res
        : res?.subCategory?._id
          ? res.subCategory
          : Array.isArray(res?.subCategories) && res.subCategories[0]?._id
            ? res.subCategories[0]
            : null;

      if (created?._id) {
        setSubCategories((prev) => [...prev, created]);
        onSubCategoryChange?.(created._id, created.name);
        return true;
      }
      return false;
    } finally {
      setIsCreatingSubCategory(false);
    }
  };

  const editCategory = async (id: string, currentName: string) => {
    const { value: newName } = await Swal.fire({
      title: "Edit Category",
      input: "text",
      inputValue: currentName,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value.trim()) return "Category name cannot be empty!";
      },
    });

    if (newName) {
      try {
        await handleUpdateCategory(id, newName.trim());
        setCategories((prev) =>
          prev.map((c) => (c._id === id ? { ...c, name: newName.trim() } : c)),
        );
        if (categoryValue === id) {
          onCategoryChange(id, newName.trim());
        }
        Swal.fire("Success", "Category updated successfully", "success");
        return true;
      } catch (error: any) {
        Swal.fire("Error", error.response?.data?.message || "Failed to update category", "error");
      }
    }
    return false;
  };

  const deleteCategory = async (id: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This category and its nested subcategories will be deleted permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await handleDeleteCategory(id);
        setCategories((prev) => prev.filter((c) => c._id !== id));
        setSubCategories((prev) => prev.filter((s) => s.categoryId !== id));
        if (categoryValue === id) {
          onCategoryChange("", "");
          onSubCategoryChange?.("", "");
        }
        Swal.fire("Deleted!", "Category has been deleted.", "success");
        return true;
      } catch (error: any) {
        Swal.fire("Error", error.response?.data?.message || "Failed to delete category", "error");
      }
    }
    return false;
  };

  const editSubCategory = async (id: string, currentName: string) => {
    const { value: newName } = await Swal.fire({
      title: "Edit Subcategory",
      input: "text",
      inputValue: currentName,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value.trim()) return "Subcategory name cannot be empty!";
      },
    });

    if (newName) {
      try {
        await handleUpdateSubCategory(id, newName.trim(), categoryValue);
        setSubCategories((prev) =>
          prev.map((s) => (s._id === id ? { ...s, name: newName.trim() } : s)),
        );
        if (subCategoryValue === id) {
          onSubCategoryChange?.(id, newName.trim());
        }
        Swal.fire("Success", "Subcategory updated successfully", "success");
        return true;
      } catch (error: any) {
        Swal.fire("Error", error.response?.data?.message || "Failed to update subcategory", "error");
      }
    }
    return false;
  };

  const deleteSubCategory = async (id: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This subcategory will be deleted permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await handleDeleteSubCategory(id);
        setSubCategories((prev) => prev.filter((s) => s._id !== id));
        if (subCategoryValue === id) {
          onSubCategoryChange?.("", "");
        }
        Swal.fire("Deleted!", "Subcategory has been deleted.", "success");
        return true;
      } catch (error: any) {
        Swal.fire("Error", error.response?.data?.message || "Failed to delete subcategory", "error");
      }
    }
    return false;
  };

  return (
    <div className="space-y-4">
      <span>
      <SingleSelectCreatable
        label="Category *"
        value={categoryValue}
        options={categories}
        placeholder="Select category"
        disabled={disabled}
        canCreate
        isCreating={isCreatingCategory}
        onChange={(id) => {
          const name = categories.find((c) => c._id === id)?.name || "";
          onCategoryChange(id, name);
          onSubCategoryChange?.("", "");
        }}
        onCreate={createCategory}
        onEdit={editCategory}
        onDelete={deleteCategory}
      />

      <SingleSelectCreatable
        label="Shop Category *"
        value={subCategoryValue}
        options={subCategoriesBySelectedCategory}
        placeholder={categoryValue ? "Select shop category" : "Select category first"}
        disabled={disabled || !categoryValue}
        canCreate={!!categoryValue}
        isCreating={isCreatingSubCategory}
        onChange={(id) => {
          const name = subCategories.find((s) => s._id === id)?.name || "";
          onSubCategoryChange?.(id, name);
        }}
        onCreate={createSubCategory}
        onEdit={editSubCategory}
        onDelete={deleteSubCategory}
      />
      </span>
    </div>
  );
}
