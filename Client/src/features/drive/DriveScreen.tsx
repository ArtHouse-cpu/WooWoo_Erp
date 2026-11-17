import { useMemo, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import DriveUploadModal, { type DriveUploadItem } from "./DriveUploadModal";
import {
  Folder,
  FolderPlus,
  HardDrive,
  LayoutGrid,
  List,
  Search,
  Star,
  Trash2,
  Upload,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
} from "lucide-react";

type DriveFolder = {
  id: string;
  name: string;
};

type DriveFile = {
  id: string;
  name: string;
  folderId: string;
  size: number;
  kind: "image" | "video" | "sheet" | "doc" | "link";
  tags?: string[];
  starred: boolean;
  addedAt: string;
};

const SEED_FOLDERS: DriveFolder[] = [
  { id: "plans", name: "Floor plans" },
  { id: "photos", name: "Space photos" },
  { id: "docs", name: "Booking documents" },
];

const SEED_FILES: DriveFile[] = [
  {
    id: "f1",
    name: "1st-floor-plan.pdf",
    folderId: "plans",
    size: 1_840_000,
    kind: "doc",
    starred: true,
    addedAt: "2026-11-12T10:00:00",
  },
  {
    id: "f2",
    name: "studio-daylight.jpg",
    folderId: "photos",
    size: 3_200_000,
    kind: "image",
    starred: false,
    addedAt: "2026-11-13T15:30:00",
  },
  {
    id: "f3",
    name: "booking-checklist.xlsx",
    folderId: "docs",
    size: 86_000,
    kind: "sheet",
    starred: false,
    addedAt: "2026-11-14T09:10:00",
  },
];

const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024;

const formatSize = (bytes: number) => {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

const fileIcon = (kind: DriveFile["kind"]) => {
  if (kind === "image" || kind === "video") return ImageIcon;
  if (kind === "sheet") return FileSpreadsheet;
  return FileText;
};

export default function DriveScreen() {
  const [folders, setFolders] = useState<DriveFolder[]>(SEED_FOLDERS);
  const [files, setFiles] = useState<DriveFile[]>(SEED_FILES);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [section, setSection] = useState<"drive" | "recent" | "starred">("drive");
  const [uploadOpen, setUploadOpen] = useState(false);
  const staffName = useAppSelector((state) => state.user.m_staff_name) || "You";

  const used = files.reduce((sum, file) => sum + file.size, 0);
  const usedPercent = Math.min(100, Math.round((used / STORAGE_LIMIT) * 100));

  const visibleFiles = useMemo(() => {
    const term = query.trim().toLowerCase();
    let list = files;
    if (section === "starred") list = list.filter((file) => file.starred);
    else if (section === "recent") {
      list = [...list].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 8);
    } else if (folderId) list = list.filter((file) => file.folderId === folderId);
    if (!term) return list;
    return list.filter((file) => file.name.toLowerCase().includes(term));
  }, [files, folderId, query, section]);

  const visibleFolders = useMemo(() => {
    if (section !== "drive" || folderId) return [];
    const term = query.trim().toLowerCase();
    if (!term) return folders;
    return folders.filter((folder) => folder.name.toLowerCase().includes(term));
  }, [folderId, folders, query, section]);

  const currentFolder = folders.find((folder) => folder.id === folderId) || null;

  const addFolder = () => {
    const name = window.prompt("Folder name");
    const trimmed = name?.trim();
    if (!trimmed) return;
    setFolders((current) => [...current, { id: `folder-${Date.now()}`, name: trimmed }]);
    setSection("drive");
    setFolderId(null);
  };

  const saveUpload = (items: DriveUploadItem[], segment: string, tags: string[]) => {
    const existing = folders.find(
      (folder) => folder.name.toLowerCase() === segment.trim().toLowerCase(),
    );
    const targetId = existing?.id || `folder-${Date.now()}`;
    if (!existing && segment.trim()) {
      setFolders((current) => [...current, { id: targetId, name: segment.trim() }]);
    }
    const stamp = new Date().toISOString();
    const next: DriveFile[] = items.map((item, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: item.name,
      folderId: targetId,
      size: item.size,
      kind: item.kind,
      tags,
      starred: false,
      addedAt: stamp,
    }));
    setFiles((current) => [...next, ...current]);
    setSection("drive");
    setFolderId(targetId);
    setUploadOpen(false);
  };

  return (
    <div className="min-w-0 space-y-4 px-4 py-5 md:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Drive</h1>
          <p className="mt-1 text-sm text-slate-500">
            File storage preview. Nothing is uploaded to the server yet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addFolder}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
          >
            <FolderPlus size={15} />
            New folder
          </button>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-semibold text-white"
          >
            <Upload size={15} />
            Upload
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            {([
              ["drive", "My Drive"],
              ["recent", "Recent"],
              ["starred", "Starred"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSection(key);
                  setFolderId(null);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold ${
                  section === key ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {key === "starred" ? <Star size={15} /> : key === "recent" ? <HardDrive size={15} /> : <Folder size={15} />}
                {label}
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Storage</span>
              <span>{usedPercent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-slate-900" style={{ width: `${usedPercent}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {formatSize(used)} of {formatSize(STORAGE_LIMIT)}
            </p>
          </div>
        </aside>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {currentFolder ? (
              <button
                type="button"
                onClick={() => setFolderId(null)}
                className="text-sm font-semibold text-slate-500 hover:text-slate-900"
              >
                My Drive
              </button>
            ) : null}
            <h2 className="text-sm font-bold text-slate-900">
              {section === "recent"
                ? "Recent"
                : section === "starred"
                  ? "Starred"
                  : currentFolder?.name || "My Drive"}
            </h2>
            <div className="ml-auto flex items-center gap-2">
              <label className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search files"
                  className="h-9 rounded-lg border border-slate-200 pl-8 pr-3 text-xs font-semibold text-slate-800 outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => setView(view === "grid" ? "list" : "grid")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
                aria-label="Toggle layout"
              >
                {view === "grid" ? <List size={16} /> : <LayoutGrid size={16} />}
              </button>
            </div>
          </div>

          {visibleFolders.length > 0 ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visibleFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setFolderId(folder.id)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-left hover:bg-slate-50"
                >
                  <Folder size={18} className="text-amber-500" />
                  <span className="truncate text-sm font-semibold text-slate-800">{folder.name}</span>
                  <span className="ml-auto text-xs text-slate-400">
                    {files.filter((file) => file.folderId === folder.id).length}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {visibleFiles.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              No files in this view.
            </div>
          ) : view === "grid" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleFiles.map((file) => {
                const Icon = fileIcon(file.kind);
                return (
                  <div key={file.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start gap-2">
                      <Icon size={18} className="mt-0.5 text-slate-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
                        <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
                        {file.tags && file.tags.length > 0 ? (
                          <p className="truncate text-[11px] text-violet-600">{file.tags.join(" · ")}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setFiles((current) =>
                            current.map((item) =>
                              item.id === file.id ? { ...item, starred: !item.starred } : item,
                            ),
                          )
                        }
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50"
                        aria-label="Star file"
                      >
                        <Star size={14} className={file.starred ? "fill-amber-400 text-amber-500" : ""} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiles((current) => current.filter((item) => item.id !== file.id))}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Remove file"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {visibleFiles.map((file) => {
                const Icon = fileIcon(file.kind);
                return (
                  <div key={file.id} className="flex items-center gap-3 py-2.5">
                    <Icon size={16} className="text-slate-500" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{file.name}</span>
                    <span className="text-xs text-slate-500">{formatSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((current) =>
                          current.map((item) =>
                            item.id === file.id ? { ...item, starred: !item.starred } : item,
                          ),
                        )
                      }
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50"
                      aria-label="Star file"
                    >
                      <Star size={14} className={file.starred ? "fill-amber-400 text-amber-500" : ""} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiles((current) => current.filter((item) => item.id !== file.id))}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Remove file"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      {uploadOpen ? (
        <DriveUploadModal
          folders={folders.map((folder) => folder.name)}
          uploaderName={staffName}
          onClose={() => setUploadOpen(false)}
          onUpload={saveUpload}
        />
      ) : null}
    </div>
  );
}
