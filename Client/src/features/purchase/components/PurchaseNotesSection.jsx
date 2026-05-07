type Props = {
  notes: string;
  onChange: (value: string) => void;
};

export default function NotesSection({notes, onChange}: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-8">
      <label className="mb-1 block text-xs font-semibold text-gray-600">Notes</label>
      <textarea
        rows={5}
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add internal note, payment note, or invoice remarks..."
        className="w-full rounded-md border border-gray-200 p-3 text-sm outline-none focus:border-blue-500"
      />
    </div>
  );
}
