import { UploadCloud, X } from "lucide-react";
import { useMemo, useRef } from "react";

type Props = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  label?: string;
};

export default function ImageUploader({
  files,
  onFilesChange,
  disabled = false,
  label = "Images",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [files],
  );

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files, ...Array.from(incoming)];
    onFilesChange(next);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!disabled) addFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className="flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition hover:bg-gray-100"
      >
        <UploadCloud className="mb-1 text-gray-400" size={24} />
        <span className="text-xs font-medium text-gray-500">Click or drag images</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        disabled={disabled}
        accept="image/*"
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
          {previews.map(({ file, url }) => (
            <div key={file.name + file.lastModified} className="relative overflow-hidden rounded-md border">
              <img src={url} alt={file.name} className="h-20 w-full object-cover" />
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onFilesChange(files.filter((current) => current !== file));
                }}
                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
