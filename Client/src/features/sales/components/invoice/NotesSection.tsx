type Props = {
  notes: string;
  onChange: (value: string) => void;
  className?: string;
  readOnly?: boolean;
};

export default function NotesSection({
  notes,
  onChange,
  className,
  readOnly = false,
}: Props) {
  return (
    <div
      className={
        className ||
        "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:col-span-8"
      }
    >
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
        Notes
      </label>
      <textarea
        rows={4}
        value={notes}
        onChange={(e) => {
          if (readOnly) return;
          onChange(e.target.value);
        }}
        readOnly={readOnly}
        disabled={readOnly}
        placeholder="Add internal note, payment note, or invoice remarks…"
        className={`w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
          readOnly ? "cursor-not-allowed bg-slate-50 text-slate-600" : ""
        }`}
      />
    </div>
  );
}
