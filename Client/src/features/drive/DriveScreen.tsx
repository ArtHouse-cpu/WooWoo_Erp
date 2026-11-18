import { useMemo, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import DriveUploadModal, { type DriveUploadItem } from "./DriveUploadModal";
import {
  Database,
  FileText,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  List,
  Play,
  Search,
  Trash2,
  Upload,
  Video,
} from "lucide-react";

type DriveFile = {
  id: string;
  name: string;
  segment: string;
  size: number;
  kind: "image" | "video" | "sheet" | "doc" | "link";
  tags?: string[];
  owner: string;
  previewUrl?: string;
  addedAt: string;
};

const SEGMENTS = [
  { name: "Events", color: "#7c3aed" },
  { name: "Spaces", color: "#3b82f6" },
  { name: "Store", color: "#f59e0b" },
  { name: "Cafe", color: "#ec4899" },
  { name: "General", color: "#22c55e" },
  { name: "Expenses", color: "#a78bfa" },
  { name: "Invoices", color: "#22d3ee" },
] as const;

const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024;

const SEED_FILES: DriveFile[] = [
  {
    id: "f1",
    name: "Studio daylight",
    segment: "Spaces",
    size: 3_200_000,
    kind: "image",
    owner: "Studio",
    addedAt: "2026-11-13T15:30:00",
  },
  {
    id: "f2",
    name: "1st floor plan",
    segment: "General",
    size: 1_840_000,
    kind: "doc",
    owner: "Studio",
    addedAt: "2026-11-12T10:00:00",
  },
  {
    id: "f3",
    name: "Booking checklist",
    segment: "Invoices",
    size: 86_000,
    kind: "sheet",
    owner: "Studio",
    addedAt: "2026-11-14T09:10:00",
  },
];

type KindFilter = "all" | "image" | "video" | "doc" | "link";
type SortKey = "modified" | "name" | "size";

const formatSize = (bytes: number) => {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return mb >= 100 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
  }
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

const prettyDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const isDocument = (kind: DriveFile["kind"]) => kind === "doc" || kind === "sheet";

const segmentColor = (name: string) =>
  SEGMENTS.find((item) => item.name.toLowerCase() === name.toLowerCase())?.color || "#94a3b8";

export default function DriveScreen() {
  const [files, setFiles] = useState<DriveFile[]>(SEED_FILES);
  const [extraSegments, setExtraSegments] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<SortKey>("modified");
  const [uploadOpen, setUploadOpen] = useState(false);
  const staffName = useAppSelector((state) => state.user.m_staff_name) || "You";

  const segmentNames = useMemo(() => {
    const names = new Set<string>(SEGMENTS.map((item) => item.name));
    extraSegments.forEach((name) => names.add(name));
    files.forEach((file) => {
      if (file.segment) names.add(file.segment);
    });
    return [...names];
  }, [extraSegments, files]);

  const used = files.reduce((sum, file) => sum + file.size, 0);
  const usedPercent = Math.min(100, Math.round((used / STORAGE_LIMIT) * 100));

  const counts = useMemo(() => {
    const bucket = (match: (file: DriveFile) => boolean) => {
      const list = files.filter(match);
      return { count: list.length, size: list.reduce((sum, file) => sum + file.size, 0) };
    };
    return {
      image: bucket((file) => file.kind === "image"),
      video: bucket((file) => file.kind === "video"),
      doc: bucket(isDocument),
      link: bucket((file) => file.kind === "link"),
    };
  }, [files]);

  const segmentUsage = useMemo(
    () =>
      segmentNames.map((name) => ({
        name,
        color: segmentColor(name),
        size: files.filter((file) => file.segment === name).reduce((sum, file) => sum + file.size, 0),
      })),
    [files, segmentNames],
  );
  const segmentTotal = segmentUsage.reduce((sum, item) => sum + item.size, 0) || 1;

  const visibleFiles = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = files.filter((file) => {
      if (segment !== "all" && file.segment !== segment) return false;
      if (kind === "doc" && !isDocument(file.kind)) return false;
      if (kind !== "all" && kind !== "doc" && file.kind !== kind) return false;
      if (!term) return true;
      return [file.name, file.owner, file.segment, ...(file.tags || [])].join(" ").toLowerCase().includes(term);
    });
    list.sort((left, right) => {
      if (sort === "name") return left.name.localeCompare(right.name);
      if (sort === "size") return right.size - left.size;
      return right.addedAt.localeCompare(left.addedAt);
    });
    return list;
  }, [files, kind, query, segment, sort]);

  const addFolder = () => {
    const name = window.prompt("Segment name");
    const trimmed = name?.trim();
    if (!trimmed) return;
    setExtraSegments((current) =>
      current.some((item) => item.toLowerCase() === trimmed.toLowerCase()) ? current : [...current, trimmed],
    );
    setSegment(trimmed);
  };

  const saveUpload = (items: DriveUploadItem[], nextSegment: string, tags: string[]) => {
    const stamp = new Date().toISOString();
    const next: DriveFile[] = items.map((item, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: item.name,
      segment: nextSegment,
      size: item.size,
      kind: item.kind,
      tags,
      owner: staffName,
      previewUrl: item.previewUrl,
      addedAt: stamp,
    }));
    setFiles((current) => [...next, ...current]);
    setSegment("all");
    setKind("all");
    setUploadOpen(false);
  };

  const removeFile = (id: string) => {
    setFiles((current) => {
      const found = current.find((file) => file.id === id);
      if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl);
      return current.filter((file) => file.id !== id);
    });
  };

  return (
    <div className="min-w-0 space-y-4 px-4 py-5 md:px-5">
      <section className="grid gap-3 xl:grid-cols-[220px_minmax(0,1.15fr)_minmax(320px,1fr)]">
        <article className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/80 px-4 py-3 shadow-xs">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-xs">
            <Database size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Total Storage</p>
            <p className="truncate text-lg font-black tracking-tight text-slate-900">
              {formatSize(used)} <span className="text-sm font-semibold text-slate-400">/ {formatSize(STORAGE_LIMIT)}</span>
            </p>
            <span className="mt-1 inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">
              {usedPercent}% Used
            </span>
          </div>
        </article>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["Images", counts.image, ImageIcon],
              ["Videos", counts.video, Video],
              ["Documents", counts.doc, FileText],
              ["URLs", counts.link, Link2],
            ] as const
          ).map(([label, stat, Icon]) => (
            <article key={label} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <Icon size={13} />
                </span>
                {label}
              </div>
              <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{stat.count.toLocaleString("en-IN")}</p>
              <p className="text-xs font-medium text-slate-400">{label === "URLs" ? "Links" : formatSize(stat.size)}</p>
            </article>
          ))}
        </div>

        <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900">Storage by Segment</h2>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100">
            {segmentUsage.map((item) =>
              item.size > 0 ? (
                <span
                  key={item.name}
                  style={{ width: `${(item.size / segmentTotal) * 100}%`, background: item.color }}
                  title={`${item.name} ${formatSize(item.size)}`}
                />
              ) : null,
            )}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
            {segmentUsage.map((item) => (
              <li key={item.name} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                <span className="font-semibold">{item.name}</span>
                <span className="text-slate-400">{formatSize(item.size)}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs">
        <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
          <Folder size={15} className="text-violet-500" />
          <select
            value={segment}
            onChange={(event) => setSegment(event.target.value)}
            className="bg-transparent outline-none"
          >
            <option value="all">All Segments</option>
            {segmentNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-3 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search files, folders, invoices..."
            className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-violet-400"
          />
        </label>
        <div className="flex items-center gap-1">
          {(
            [
              ["image", ImageIcon, "Images"],
              ["video", Video, "Videos"],
              ["doc", FileText, "Documents"],
              ["link", Link2, "URLs"],
            ] as const
          ).map(([key, Icon, label]) => {
            const active = kind === key;
            return (
              <button
                key={key}
                type="button"
                aria-label={label}
                aria-pressed={active}
                onClick={() => setKind((current) => (current === key ? "all" : key))}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                  active ? "border-violet-200 bg-violet-50 text-violet-700" : "border-transparent text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-xl bg-violet-50 p-1">
          <button
            type="button"
            aria-label="Grid view"
            onClick={() => setView("grid")}
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${view === "grid" ? "bg-white text-violet-700 shadow-xs" : "text-violet-400"}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            aria-label="List view"
            onClick={() => setView("list")}
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${view === "list" ? "bg-white text-violet-700 shadow-xs" : "text-violet-400"}`}
          >
            <List size={16} />
          </button>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold text-slate-900">
            All Files <span className="font-semibold text-slate-400">({visibleFiles.length.toLocaleString("en-IN")})</span>
          </h2>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold text-slate-500">
              Sort:{" "}
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                className="font-bold text-slate-800 outline-none"
              >
                <option value="modified">Last Modified</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
              </select>
            </label>
            <button
              type="button"
              onClick={addFolder}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
            >
              <FolderPlus size={14} />
              New segment
            </button>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-semibold text-white"
            >
              <Upload size={14} />
              Upload
            </button>
          </div>
        </div>

        {visibleFiles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center text-sm text-slate-500">
            No files in this view. Upload a file to add it here.
          </div>
        ) : view === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visibleFiles.map((file) => (
              <article key={file.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <FileCover file={file} />
                <div className="flex items-start gap-2 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{file.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      By {file.owner} · {file.size > 0 ? formatSize(file.size) : "Link"} · {prettyDate(file.addedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Remove ${file.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {visibleFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <KindIcon kind={file.kind} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{file.name}</p>
                  <p className="truncate text-[11px] text-slate-400">
                    {file.segment} · By {file.owner}
                  </p>
                </div>
                <span className="text-xs text-slate-500">{file.size > 0 ? formatSize(file.size) : "Link"}</span>
                <span className="hidden text-xs text-slate-400 sm:inline">{prettyDate(file.addedAt)}</span>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label={`Remove ${file.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {uploadOpen ? (
        <DriveUploadModal
          folders={segmentNames}
          uploaderName={staffName}
          onClose={() => setUploadOpen(false)}
          onUpload={saveUpload}
        />
      ) : null}
    </div>
  );
}

function KindIcon({ kind }: { kind: DriveFile["kind"] }) {
  if (kind === "image") return <ImageIcon size={16} />;
  if (kind === "video") return <Video size={16} />;
  if (kind === "link") return <Link2 size={16} />;
  return <FileText size={16} />;
}

function FileCover({ file }: { file: DriveFile }) {
  if (file.previewUrl && file.kind === "image") {
    return <img src={file.previewUrl} alt="" className="h-40 w-full object-cover" />;
  }
  if (file.previewUrl && file.kind === "video") {
    return (
      <div className="relative h-40 bg-slate-900">
        <video src={file.previewUrl} className="h-full w-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-violet-700">
            <Play size={16} fill="currentColor" />
          </span>
        </span>
      </div>
    );
  }
  const tone =
    file.kind === "video"
      ? "bg-violet-950 text-white"
      : file.kind === "link"
        ? "bg-sky-50 text-sky-600"
        : file.kind === "image"
          ? "bg-amber-50 text-amber-600"
          : "bg-slate-50 text-slate-500";
  return (
    <div className={`flex h-40 items-center justify-center ${tone}`}>
      {file.kind === "video" ? (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
          <Play size={20} fill="currentColor" />
        </span>
      ) : (
        <KindIcon kind={file.kind} />
      )}
    </div>
  );
}
