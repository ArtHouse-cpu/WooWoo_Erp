import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import {
  handleCreateInvoicedBy,
  handleDeleteInvoicedBy,
  handleGetInvoicedBy,
  handleUpdateInvoicedBy,
  type InvoicedByRow,
} from "@/services/apiClient";

type Props = {
  valueId: string;
  valueName?: string;
  onChange: (id: string, name: string) => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  /** Allow create-from-search (default true) */
  allowCreate?: boolean;
  /** Show edit action on options (default true) */
  allowEdit?: boolean;
  /** Show delete action on options (default true) */
  allowDelete?: boolean;
};

export default function InvoicedBySelect({
  valueId,
  valueName = "",
  onChange,
  disabled = false,
  required = true,
  label = "Invoiced By",
  allowCreate = true,
  allowEdit = true,
  allowDelete = true,
}: Props) {
  const [options, setOptions] = useState<InvoicedByRow[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const loadOptions = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const res = await handleGetInvoicedBy(signal);
      const list = Array.isArray(res?.invoicedBy) ? res.invoicedBy : [];
      setOptions(list.filter((row) => row?._id && row?.name));
    } catch (error: unknown) {
      if ((error as { name?: string })?.name === "CanceledError") return;
      console.error("Failed to load invoiced by list:", error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadOptions(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Prefill id from name when editing / remounting
  useEffect(() => {
    if (!options.length) return;
    const byId = options.find((o) => o._id === valueId);
    if (byId) return;
    const hint = String(valueName || valueId || "").trim();
    if (!hint) return;
    const byName = options.find(
      (o) => o.name.trim().toLowerCase() === hint.toLowerCase(),
    );
    if (byName && byName._id !== valueId) {
      onChangeRef.current(byName._id, byName.name);
    }
  }, [options, valueId, valueName]);

  const normalizedQuery = query.trim().toLowerCase();
  const selected =
    options.find((item) => item._id === valueId) ||
    options.find(
      (item) =>
        item.name.trim().toLowerCase() ===
        String(valueName || "").trim().toLowerCase(),
    );
  const filtered = options.filter((item) =>
    item.name.toLowerCase().includes(normalizedQuery),
  );
  const alreadyExists = options.some(
    (item) => item.name.trim().toLowerCase() === normalizedQuery,
  );
  const showCreate = !!normalizedQuery && !alreadyExists && allowCreate;

  const createOption = async (rawName: string) => {
    const name = rawName.trim();
    if (!name || isCreating || disabled) return false;
    setIsCreating(true);
    try {
      const res = await handleCreateInvoicedBy({ name });
      const created = res?.invoicedBy;
      if (created?._id) {
        setOptions((prev) => {
          if (prev.some((p) => p._id === created._id)) return prev;
          return [...prev, created].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
        });
        onChange(created._id, created.name);
        return true;
      }
      await Swal.fire(
        "Error",
        res?.message || "Could not create Invoiced By.",
        "error",
      );
      return false;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Error",
        err?.response?.data?.message || "Could not create Invoiced By.",
        "error",
      );
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  const editOption = async (id: string, currentName: string) => {
    const { value: newName } = await Swal.fire({
      title: "Edit Invoiced By",
      input: "text",
      inputValue: currentName,
      showCancelButton: true,
      confirmButtonText: "Save",
      inputValidator: (value) => {
        if (!value.trim()) return "Name cannot be empty!";
      },
    });
    if (!newName) return false;
    try {
      const res = await handleUpdateInvoicedBy(id, { name: newName.trim() });
      const updated = res?.invoicedBy;
      if (updated?._id) {
        setOptions((prev) =>
          prev.map((row) =>
            row._id === id ? { ...row, name: updated.name } : row,
          ),
        );
        if (valueId === id) onChange(id, updated.name);
        await Swal.fire("Updated", "Invoiced By updated.", "success");
        return true;
      }
      return false;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Error",
        err?.response?.data?.message || "Failed to update.",
        "error",
      );
      return false;
    }
  };

  const deleteOption = async (id: string) => {
    const result = await Swal.fire({
      title: "Delete Invoiced By?",
      text: "This name will be removed from the list.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return false;
    try {
      await handleDeleteInvoicedBy(id);
      setOptions((prev) => prev.filter((row) => row._id !== id));
      if (valueId === id) onChange("", "");
      await Swal.fire("Deleted", "Invoiced By removed.", "success");
      return true;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Error",
        err?.response?.data?.message || "Failed to delete.",
        "error",
      );
      return false;
    }
  };

  return (
    <div ref={containerRef} className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>

      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white p-2.5 text-left text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        <span className={selected ? "text-slate-900" : "text-slate-400"}>
          {loading
            ? "Loading..."
            : selected?.name || "Select invoiced by"}
        </span>
        <span className="text-xs text-slate-500">{open ? "▲" : "▼"}</span>
      </button>

      {open && !disabled && (
        <div className="rounded-lg border border-slate-300 bg-white shadow-sm">
          <div className="p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                allowCreate ? "Search or type to create..." : "Search..."
              }
              className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="max-h-52 overflow-auto border-t border-slate-200 py-1">
            {filtered.map((item) => (
              <div
                key={item._id}
                className="group flex items-center justify-between px-3 py-1.5 hover:bg-blue-50"
              >
                <button
                  type="button"
                  onClick={() => {
                    onChange(item._id, item.name);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex-1 text-left text-sm text-slate-700 outline-none"
                >
                  {item.name}
                </button>
                {(allowEdit || allowDelete) && (
                  <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    {allowEdit && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await editOption(item._id, item.name);
                        }}
                        className="rounded p-1 text-slate-400 transition hover:bg-slate-200 hover:text-blue-600"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    {allowDelete && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await deleteOption(item._id);
                        }}
                        className="rounded p-1 text-slate-400 transition hover:bg-slate-200 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {showCreate && (
              <button
                type="button"
                disabled={isCreating}
                onClick={async () => {
                  const ok = await createOption(query.trim());
                  if (ok) {
                    setOpen(false);
                    setQuery("");
                  }
                }}
                className="block w-full border-t border-slate-200 px-3 py-2 text-left text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? "Creating..." : `Create "${query.trim()}"`}
              </button>
            )}

            {!loading && filtered.length === 0 && !showCreate && (
              <div className="px-3 py-2 text-sm text-slate-500">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
