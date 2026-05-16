import { Paperclip, FileText, Image as ImageIcon, Trash2, UploadCloud } from "lucide-react";
import { useRef } from "react";

type Props = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
};

export default function FileAttachmentSection({ files, onFilesChange, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files, ...Array.from(incoming)];
    onFilesChange(next);
  };

  const removeFile = (index: number) => {
    const next = [...files];
    next.splice(index, 1);
    onFilesChange(next);
  };

  const isImage = (file: File) => file.type.startsWith("image/");

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
          <Paperclip size={14} className="text-blue-500" />
          Attach File
        </label>
        <span className="text-[10px] text-gray-400 font-medium">Docs, Photos (Max 5MB each)</span>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!disabled) addFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-100 bg-gray-50/50 transition hover:border-blue-200 hover:bg-blue-50/30 ${
          disabled ? "cursor-not-allowed opacity-60" : ""
        }`}
      >
        <UploadCloud className="mb-1 text-blue-400/70" size={24} />
        <span className="text-xs font-medium text-gray-500">Click or drag to upload extra docs or photos</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        disabled={disabled}
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div
              key={file.name + index}
              className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 p-2 pr-3 transition hover:bg-white hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-md ${isImage(file) ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
                  {isImage(file) ? <ImageIcon size={20} /> : <FileText size={20} />}
                </div>
                <div className="flex flex-col">
                  <span className="max-w-[150px] truncate text-sm font-medium text-gray-700 md:max-w-[300px]">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeFile(index)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
