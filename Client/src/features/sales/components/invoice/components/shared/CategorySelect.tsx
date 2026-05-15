import { useEffect, useMemo, useRef, useState } from "react";
import {
  handleCreateCategories,
  handleCreateSubCategory,
  handleGetCategories,
  handleGetSubCategories,
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
  onCategoryChange: (categoryId: string, categoryName: string) => void;
  subCategoryValue?: string;
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
  const selected = options.find((item) => item._id === value);
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
              <button
                key={item._id}
                type="button"
                onClick={() => {
                  onChange(item._id);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
              >
                {item.name}
              </button>
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
  onCategoryChange,
  subCategoryValue = "",
  onSubCategoryChange,
  disabled = false,
}: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingSubCategory, setIsCreatingSubCategory] = useState(false);

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

  const subCategoriesBySelectedCategory = useMemo(
    () =>
      subCategories.filter((subCat) => {
        if (!categoryValue) return true;
        return subCat.categoryId === categoryValue || subCat.category === categoryValue;
      }),
    [subCategories, categoryValue],
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

  return (
    <div className="space-y-4">
      <span>
      <SingleSelectCreatable
        label="Categories *"
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
      />

      <SingleSelectCreatable
        label="Sub Categories *"
        value={subCategoryValue}
        options={subCategoriesBySelectedCategory}
        placeholder={categoryValue ? "Select sub category" : "Select category first"}
        disabled={disabled || !categoryValue}
        canCreate={!!categoryValue}
        isCreating={isCreatingSubCategory}
        onChange={(id) => {
          const name = subCategories.find((s) => s._id === id)?.name || "";
          onSubCategoryChange?.(id, name);
        }}
        onCreate={createSubCategory}
      />
      </span>
    </div>
  );
}
