import { useEffect, useRef, useState } from "react";
import {
  CloudUpload,
  FileText,
  Folder,
  Image as ImageIcon,
  User,
  Link2,
  Pencil,
  Play,
  RefreshCw,
  Tag,
  X,
} from "lucide-react";

export type DriveUploadItem = {
  name: string;
  size: number;
  kind: "image" | "video" | "sheet" | "doc" | "link";
  previewUrl?: string;
};

type Tab = "media" | "document" | "url";

type LocalFile = {
  id: string;
  file: File;
  previewUrl: string;
};

type LinkPreview = {
  url: string;
  title: string;
  description: string;
};

const MAX_BYTES = 500 * 1024 * 1024;
const EXTRA_SEGMENTS = ["Invoices", "Cafe", "Events", "Menus"];

const formatSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

const docBadge = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return { label: "PDF", className: "bg-rose-50 text-rose-600" };
  if (ext === "xls" || ext === "xlsx" || ext === "csv") {
    return { label: "XLS", className: "bg-emerald-50 text-emerald-600" };
  }
  if (ext === "ppt" || ext === "pptx") return { label: "PPT", className: "bg-orange-50 text-orange-600" };
  return { label: "DOC", className: "bg-sky-50 text-sky-600" };
};

const fileKind = (file: File, tab: Tab): DriveUploadItem["kind"] => {
  if (tab === "media") return file.type.startsWith("video/") ? "video" : "image";
  const name = file.name.toLowerCase();
  if (name.endsWith(".xls") || name.endsWith(".xlsx") || name.endsWith(".csv")) return "sheet";
  return "doc";
};

export default function DriveUploadModal({
  folders,
  uploaderName,
  onClose,
  onUpload,
}: {
  folders: string[];
  uploaderName: string;
  onClose: () => void;
  onUpload: (items: DriveUploadItem[], segment: string, tags: string[]) => void;
}) {
  const [tab, setTab] = useState<Tab>("media");
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [title, setTitle] = useState("");
  const [segment, setSegment] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [url, setUrl] = useState("https://");
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [editingPreview, setEditingPreview] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<LocalFile[]>([]);
  const handedOff = useRef(false);
  filesRef.current = files;

  const segments = Array.from(new Set([...folders, ...EXTRA_SEGMENTS]));

  useEffect(() => {
    return () => {
      if (handedOff.current) return;
      filesRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const addFiles = (list: FileList | File[]) => {
    const incoming = Array.from(list);
    const tooLarge = incoming.find((file) => file.size > MAX_BYTES);
    if (tooLarge) {
      setError("Each file must be 500 MB or smaller.");
      return;
    }
    setError("");
    const next = incoming.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setFiles((current) => [...current, ...next]);
    if (!title.trim() && incoming[0]) {
      setTitle(incoming.length === 1 ? incoming[0].name.replace(/\.[^.]+$/, "") : "");
    }
  };

  const removeFile = (id: string) => {
    setFiles((current) => {
      const found = current.find((item) => item.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setFiles((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    setError("");
    setPreview(null);
  };

  const addTag = (raw: string) => {
    const value = raw.trim().replace(/,+$/, "");
    if (!value) return;
    setTags((current) =>
      current.some((tag) => tag.toLowerCase() === value.toLowerCase()) ? current : [...current, value],
    );
    setTagInput("");
  };

  const fetchPreview = () => {
    const trimmed = url.trim();
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.replace(/^www\./, "");
      const path = parsed.pathname.replace(/\/$/, "");
      const page = path && path !== "/" ? path.split("/").filter(Boolean).pop() : "home";
      const pretty = String(page || "page").replace(/[-_]/g, " ");
      const nextTitle = `${host} – ${pretty}`.replace(/\b\w/g, (letter) => letter.toUpperCase());
      setPreview({
        url: parsed.toString(),
        title: nextTitle,
        description: `Saved link to ${host}. This preview stays in the browser and is not fetched from the website.`,
      });
      setTitle(nextTitle);
      setError("");
      setEditingPreview(false);
    } catch {
      setError("Enter a full link, including https://");
      setPreview(null);
    }
  };

  const submit = () => {
    if (!title.trim()) {
      setError("Enter a title.");
      return;
    }
    if (!segment) {
      setError("Select a segment.");
      return;
    }
    if (tab === "url") {
      if (!preview) {
        setError("Fetch a preview before uploading the link.");
        return;
      }
      onUpload([{ name: title.trim(), size: 0, kind: "link" }], segment, tags);
      return;
    }
    if (files.length === 0) {
      setError(tab === "media" ? "Choose at least one image or video." : "Choose at least one document.");
      return;
    }
    handedOff.current = true;
    onUpload(
      files.map((item) => ({
        name: files.length === 1 ? title.trim() : `${title.trim()} – ${item.file.name}`,
        size: item.file.size,
        kind: fileKind(item.file, tab),
        previewUrl: item.previewUrl,
      })),
      segment,
      tags,
    );
  };

  const accept = tab === "media" ? "image/jpeg,image/png,image/webp,video/mp4,video/quicktime" : ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-3 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close upload" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-600">
              <CloudUpload size={18} />
            </span>
            <h2 className="text-lg font-bold text-slate-900">Upload to My Drive</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["media", "Media", "Images / Videos", ImageIcon],
                ["document", "Document", "PDF / Docs / Sheets", FileText],
                ["url", "URL", "Link / Web Page", Link2],
              ] as const
            ).map(([key, label, hint, Icon]) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => switchTab(key)}
                  className={`flex items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-left ${
                    active
                      ? "border-violet-600 bg-violet-600 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <Icon size={18} className={active ? "text-white" : "text-violet-600"} />
                  <span>
                    <span className="block text-sm font-bold leading-tight">{label}</span>
                    <span className={`block text-[10px] font-medium ${active ? "text-violet-100" : "text-slate-400"}`}>
                      {hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {tab === "url" ? (
            <div className="mt-4">
              <label className="text-xs font-bold text-slate-800">
                URL <span className="text-rose-500">*</span>
              </label>
              <div className="mt-1.5 flex gap-2">
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3">
                  <Link2 size={15} className="text-slate-400" />
                  <input
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    className="h-11 w-full bg-transparent text-sm text-slate-800 outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={fetchPreview}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 px-3 text-xs font-bold text-violet-700"
                >
                  <RefreshCw size={14} />
                  Fetch Preview
                </button>
              </div>
              {preview ? (
                <div className="relative mt-3 flex gap-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-3">
                  <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-500">
                    <Link2 size={22} />
                  </div>
                  <div className="min-w-0 flex-1 pr-8">
                    {editingPreview ? (
                      <input
                        value={preview.title}
                        onChange={(event) => {
                          setPreview({ ...preview, title: event.target.value });
                          setTitle(event.target.value);
                        }}
                        className="w-full rounded-lg border border-violet-200 bg-white px-2 py-1 text-sm font-bold text-slate-900 outline-none"
                      />
                    ) : (
                      <p className="truncate text-sm font-bold text-slate-900">{preview.title}</p>
                    )}
                    <p className="truncate text-xs text-violet-600">{preview.url}</p>
                    {editingPreview ? (
                      <textarea
                        value={preview.description}
                        onChange={(event) => setPreview({ ...preview, description: event.target.value })}
                        className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none"
                        rows={2}
                      />
                    ) : (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{preview.description}</p>
                    )}
                  </div>
                  <button type="button" onClick={() => setPreview(null)} className="absolute right-2 top-2 text-slate-400" aria-label="Remove preview">
                    <X size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPreview((value) => !value)}
                    className="absolute bottom-2 right-2 rounded-lg border border-violet-100 bg-white p-1.5 text-violet-600"
                    aria-label="Edit preview"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4">
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files);
                }}
                className={`rounded-2xl border border-dashed px-4 py-8 text-center ${
                  dragging ? "border-violet-500 bg-violet-100" : "border-violet-300 bg-violet-50/70"
                }`}
              >
                <span className="mx-auto flex h-12 w-12 items-center justify-center text-violet-500">
                  {tab === "media" ? <ImageIcon size={34} /> : <FileText size={34} />}
                </span>
                <p className="mt-2 text-base font-bold text-slate-900">
                  Drag & drop {tab === "media" ? "files" : "documents"} here
                </p>
                <p className="my-2 text-xs text-slate-400">or</p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-700"
                >
                  <CloudUpload size={15} />
                  Choose Files
                </button>
                <p className="mt-3 text-[11px] text-slate-400">
                  {tab === "media"
                    ? "Supports: JPG, PNG, WEBP, MP4, MOV"
                    : "Supports: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX"}
                  {" | Max size: 500 MB per file"}
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept={accept}
                  className="hidden"
                  onChange={(event) => {
                    if (event.target.files) addFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
              </div>

              {tab === "media" && files.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {files.map((item) => (
                    <div key={item.id} className="relative h-16 w-24 overflow-hidden rounded-xl bg-slate-100">
                      {item.file.type.startsWith("video/") ? (
                        <video src={item.previewUrl} className="h-full w-full object-cover" />
                      ) : (
                        <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                      )}
                      {item.file.type.startsWith("video/") ? (
                        <span className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white">
                          <Play size={10} fill="currentColor" />
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeFile(item.id)}
                        className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/55 text-white"
                        aria-label="Remove file"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {tab === "document" && files.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {files.map((item) => {
                    const badge = docBadge(item.file.name);
                    return (
                      <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-black ${badge.className}`}>
                          {badge.label}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{item.file.name}</p>
                          <p className="text-xs text-slate-400">{formatSize(item.file.size)}</p>
                        </div>
                        <button type="button" onClick={() => removeFile(item.id)} className="text-slate-400" aria-label="Remove file">
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}

          <label className="mt-4 block text-xs font-bold text-slate-800">
            Title <span className="text-rose-500">*</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                tab === "document"
                  ? "Enter a clear title (e.g., INV-0087 – Cafe Nov, Expenses – Nov)"
                  : "Enter a clear title (e.g., Cafe Menu Shoot, Art Jam Event)"
              }
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-800 outline-none focus:border-violet-400"
            />
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-800">
              Segment / Category <span className="text-rose-500">*</span>
              <span className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3">
                <Folder size={15} className="text-violet-500" />
                <select
                  value={segment}
                  onChange={(event) => setSegment(event.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
                >
                  <option value="">Select segment</option>
                  {segments.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <div>
              <p className="text-xs font-bold text-slate-800">Tags</p>
              <label className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3">
                <Tag size={15} className="text-violet-500" />
                <input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                  onBlur={() => addTag(tagInput)}
                  placeholder="Add tags (e.g., menu, event, launch)"
                  className="w-full bg-transparent text-sm text-slate-700 outline-none"
                />
              </label>
              {tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTags((current) => current.filter((item) => item !== tag))}
                      className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700"
                    >
                      {tag}
                      <X size={11} />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          {error ? <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p> : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <User size={13} />
            </span>
            Uploading as <span className="font-bold text-slate-800">{uploaderName}</span>
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white"
            >
              <CloudUpload size={16} />
              Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
