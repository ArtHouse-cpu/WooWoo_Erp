import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Plus, Settings2, Tag, Trash2, X } from "lucide-react";
import Swal from "sweetalert2";
import {
  handleCreateLeadLabel,
  handleDeleteLeadLabel,
  handleUpdateLeadLabel,
  type LeadLabel,
} from "@/services/apiClient";

const COLORS = ["#EAB308", "#F97316", "#D6C7A1", "#22C55E", "#EC4899", "#EF4444", "#A855F7", "#3B82F6", "#14B8A6", "#64748B"];

export const labelTextColor = (hex: string) => {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return "#fff";
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 170 ? "#1e293b" : "#ffffff";
};

export function LeadLabelBadges({ labels, compact = false }: { labels?: LeadLabel[]; compact?: boolean }) {
  if (!labels?.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {labels.map((label) => (
        <span
          key={label._id}
          className={`inline-flex max-w-[140px] truncate rounded-full font-semibold ${compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"}`}
          style={{ backgroundColor: label.color, color: labelTextColor(label.color) }}
        >
          {label.name}
        </span>
      ))}
    </span>
  );
}

type Props = {
  labels: LeadLabel[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onLabelsChange: (labels: LeadLabel[]) => void;
  buttonLabel?: string;
};

export default function LeadLabelMenu({
  labels,
  selectedIds,
  onChange,
  onLabelsChange,
  buttonLabel = "Labels",
}: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"pick" | "create" | "manage">("pick");
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [editing, setEditing] = useState<LeadLabel | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [box, setBox] = useState<{ top?: number; bottom?: number; left: number; maxHeight: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const placeMenu = () => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const width = 280;
    const gap = 6;
    const margin = 8;
    let left = rect.right - width;
    if (left < margin) left = Math.min(rect.left, window.innerWidth - margin - width);
    left = Math.max(margin, Math.min(left, window.innerWidth - margin - width));
    const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
    const spaceAbove = rect.top - gap - margin;
    const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(180, Math.min(380, openUp ? spaceAbove : spaceBelow));
    setBox(
      openUp
        ? { bottom: window.innerHeight - rect.top + gap, left, maxHeight }
        : { top: rect.bottom + gap, left, maxHeight },
    );
  };

  useLayoutEffect(() => {
    if (!open) return;
    placeMenu();
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open, mode, labels.length]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
      setBox(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Label name is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (editing?._id) {
        const res = await handleUpdateLeadLabel(editing._id, { name: trimmed, color });
        onLabelsChange(labels.map((label) => (label._id === editing._id ? res.label : label)));
        setEditing(null);
      } else {
        const res = await handleCreateLeadLabel({ name: trimmed, color });
        onLabelsChange([...labels, res.label].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setName("");
      setColor(COLORS[0]);
      setMode("pick");
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not save the label.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (label: LeadLabel) => {
    const result = await Swal.fire({
      title: `Delete ${label.name}?`,
      text: "It will be removed from every lead that uses it.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed || !label._id) return;
    await handleDeleteLeadLabel(label._id);
    onLabelsChange(labels.filter((item) => item._id !== label._id));
    onChange(selectedIds.filter((id) => id !== label._id));
  };

  return (
    <div ref={rootRef} className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((value) => {
            if (value) setBox(null);
            return !value;
          });
          setMode("pick");
          setError("");
        }}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
      >
        <Tag size={13} />
        {buttonLabel}
      </button>
      {open && box
        ? createPortal(
            <div
              ref={menuRef}
              style={{ top: box.top, bottom: box.bottom, left: box.left, maxHeight: box.maxHeight }}
              className="fixed z-[120] flex w-[280px] max-w-[calc(100vw-16px)] flex-col overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              {mode === "pick" ? (
                <>
                  <p className="shrink-0 px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Labels</p>
                  <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
                    {labels.map((label) => {
                      const checked = selectedIds.includes(label._id);
                      return (
                        <button
                          key={label._id}
                          type="button"
                          onClick={() => toggle(label._id)}
                          className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-sm hover:bg-slate-50"
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300"}`}>
                            {checked ? <Check size={12} /> : null}
                          </span>
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
                          <span className="min-w-0 flex-1 whitespace-normal break-words font-medium leading-tight text-slate-800">{label.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-1 shrink-0 border-t border-slate-100 pt-1">
                    <button type="button" onClick={() => { setMode("create"); setEditing(null); setName(""); setError(""); }} className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50">
                      <Plus size={13} /> Create new label
                    </button>
                    <button type="button" onClick={() => { setMode("manage"); setError(""); }} className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                      <Settings2 size={13} /> Manage labels
                    </button>
                  </div>
                </>
              ) : null}
              {mode === "create" || editing ? (
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-800">{editing ? "Edit label" : "New label"}</p>
                    <button type="button" onClick={() => { setMode("pick"); setEditing(null); }}><X size={14} /></button>
                  </div>
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Label name" className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-violet-500" />
                  <div className="flex flex-wrap gap-1.5">
                    {COLORS.map((item) => (
                      <button key={item} type="button" onClick={() => setColor(item)} className={`h-6 w-6 rounded-full ${color === item ? "ring-2 ring-slate-900 ring-offset-2" : ""}`} style={{ backgroundColor: item }} />
                    ))}
                  </div>
                  {error ? <p className="text-[11px] text-rose-600">{error}</p> : null}
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => { setMode("pick"); setEditing(null); }} className="flex-1 rounded-lg bg-slate-100 py-1.5 text-xs font-semibold">Cancel</button>
                    <button type="button" disabled={busy} onClick={() => void save()} className="flex-1 rounded-lg bg-slate-900 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : "Save"}</button>
                  </div>
                </div>
              ) : null}
              {mode === "manage" && !editing ? (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-1">
                  <div className="mb-1 flex shrink-0 items-center justify-between">
                    <p className="text-xs font-bold text-slate-800">Manage labels</p>
                    <button type="button" onClick={() => setMode("pick")}><X size={14} /></button>
                  </div>
                  <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                    {labels.map((label) => (
                      <div key={label._id} className="flex items-center gap-2 rounded-lg px-1 py-1">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
                        <span className="min-w-0 flex-1 whitespace-normal break-words text-sm leading-tight">{label.name}</span>
                        <button type="button" onClick={() => { setEditing(label); setName(label.name); setColor(label.color); setMode("create"); }} className="shrink-0 text-[11px] font-semibold text-violet-700">Edit</button>
                        <button type="button" onClick={() => void remove(label)} className="shrink-0 text-rose-600"><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
