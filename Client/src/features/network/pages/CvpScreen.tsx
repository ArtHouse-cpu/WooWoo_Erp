import { useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Plus, Search, X } from "lucide-react";

type Slot = "Morning" | "Afternoon" | "Evening" | "Night" | "Anytime";
type VolunteerType = "Paid" | "Unpaid" | "Both";

type Volunteer = {
  id: string;
  name: string;
  profession: string;
  photo: string;
  availability: Slot[];
  volunteeredBefore: boolean;
  events: number;
  volunteerType: VolunteerType | null;
  appliedOn: string;
};

const SLOTS: Slot[] = ["Morning", "Afternoon", "Evening", "Night", "Anytime"];
const PROFESSIONS = [
  "Student",
  "Teacher",
  "Developer",
  "Designer",
  "Business owner",
  "Photographer",
  "Nurse",
  "Chef",
  "Architect",
  "Writer",
];

const photo = (seed: string) =>
  `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;

const SEED: Volunteer[] = [
  { id: "cvp-01", name: "Aisha Rahman", profession: "Teacher", photo: photo("Aisha"), availability: ["Morning", "Evening"], volunteeredBefore: true, events: 6, volunteerType: "Unpaid", appliedOn: "2026-11-12" },
  { id: "cvp-02", name: "Rohan Mehta", profession: "Developer", photo: photo("Rohan"), availability: ["Night", "Anytime"], volunteeredBefore: true, events: 3, volunteerType: "Both", appliedOn: "2026-11-11" },
  { id: "cvp-03", name: "Meera Iyer", profession: "Student", photo: photo("Meera"), availability: ["Afternoon"], volunteeredBefore: false, events: 0, volunteerType: null, appliedOn: "2026-11-11" },
  { id: "cvp-04", name: "Kabir Singh", profession: "Business owner", photo: photo("Kabir"), availability: ["Evening", "Night"], volunteeredBefore: true, events: 11, volunteerType: "Paid", appliedOn: "2026-11-10" },
  { id: "cvp-05", name: "Sara D'Souza", profession: "Designer", photo: photo("Sara"), availability: ["Morning", "Afternoon", "Evening"], volunteeredBefore: true, events: 4, volunteerType: "Unpaid", appliedOn: "2026-11-09" },
  { id: "cvp-06", name: "Arjun Nair", profession: "Photographer", photo: photo("Arjun"), availability: ["Anytime"], volunteeredBefore: true, events: 8, volunteerType: "Paid", appliedOn: "2026-11-08" },
  { id: "cvp-07", name: "Priya Shah", profession: "Nurse", photo: photo("Priya"), availability: ["Morning"], volunteeredBefore: false, events: 0, volunteerType: null, appliedOn: "2026-11-08" },
  { id: "cvp-08", name: "Dev Patel", profession: "Chef", photo: photo("Dev"), availability: ["Afternoon", "Evening"], volunteeredBefore: true, events: 2, volunteerType: "Both", appliedOn: "2026-11-07" },
  { id: "cvp-09", name: "Ananya Rao", profession: "Architect", photo: photo("Ananya"), availability: ["Evening"], volunteeredBefore: false, events: 0, volunteerType: null, appliedOn: "2026-11-06" },
  { id: "cvp-10", name: "Imran Qureshi", profession: "Writer", photo: photo("Imran"), availability: ["Night"], volunteeredBefore: true, events: 5, volunteerType: "Unpaid", appliedOn: "2026-11-05" },
  { id: "cvp-11", name: "Lakshmi Menon", profession: "Student", photo: photo("Lakshmi"), availability: ["Morning", "Afternoon"], volunteeredBefore: true, events: 1, volunteerType: "Unpaid", appliedOn: "2026-11-04" },
  { id: "cvp-12", name: "Nikhil Bose", profession: "Developer", photo: photo("Nikhil"), availability: ["Anytime"], volunteeredBefore: false, events: 0, volunteerType: null, appliedOn: "2026-11-03" },
  { id: "cvp-13", name: "Fatima Khan", profession: "Teacher", photo: photo("Fatima"), availability: ["Morning", "Night"], volunteeredBefore: true, events: 9, volunteerType: "Both", appliedOn: "2026-11-02" },
  { id: "cvp-14", name: "Vikram Joshi", profession: "Business owner", photo: photo("Vikram"), availability: ["Afternoon"], volunteeredBefore: true, events: 7, volunteerType: "Paid", appliedOn: "2026-11-01" },
  { id: "cvp-15", name: "Neha Kapoor", profession: "Designer", photo: photo("Neha"), availability: ["Evening", "Anytime"], volunteeredBefore: false, events: 0, volunteerType: null, appliedOn: "2026-10-30" },
];

const PAGE_SIZE = 8;

const pretty = (ymd: string) => {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const emptyForm = () => ({
  name: "",
  profession: "",
  otherProfession: "",
  photo: "",
  availability: [] as Slot[],
  volunteeredBefore: "" as "" | "yes" | "no",
  events: "",
  volunteerType: "" as "" | VolunteerType,
});

export default function CvpScreen() {
  const [rows, setRows] = useState<Volunteer[]>(SEED);
  const [search, setSearch] = useState("");
  const [slot, setSlot] = useState<"" | Slot>("");
  const [experience, setExperience] = useState<"" | "yes" | "no">("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Volunteer | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = rows.filter(row => {
      if (query && !`${row.name} ${row.profession}`.toLowerCase().includes(query)) return false;
      if (slot && !row.availability.includes(slot)) return false;
      if (experience === "yes" && !row.volunteeredBefore) return false;
      if (experience === "no" && row.volunteeredBefore) return false;
      return true;
    });
    list.sort((a, b) => sort === "newest" ? b.appliedOn.localeCompare(a.appliedOn) : a.appliedOn.localeCompare(b.appliedOn));
    return list;
  }, [rows, search, slot, experience, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const submit = (volunteer: Volunteer) => {
    setRows(current => [volunteer, ...current]);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Community Volunteer Program</h1>
          <p className="mt-1 text-sm text-slate-500">Review applications and add a new volunteer. This list is sample data on this device.</p>
        </div>
        <button type="button" onClick={() => setFormOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
          <Plus size={14} /> New application
        </button>
      </header>

      <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Search
          <span className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-2">
            <Search size={14} className="text-slate-400" />
            <input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Name or profession" className="w-full bg-transparent text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none" />
          </span>
        </label>
        <Filter label="Availability" value={slot} onChange={value => { setSlot(value as "" | Slot); setPage(1); }}>
          <option value="">All</option>
          {SLOTS.map(item => <option key={item} value={item}>{item}</option>)}
        </Filter>
        <Filter label="Experience" value={experience} onChange={value => { setExperience(value as "" | "yes" | "no"); setPage(1); }}>
          <option value="">All</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </Filter>
        <Filter label="Applied on" value={sort} onChange={value => { setSort(value as "newest" | "oldest"); setPage(1); }}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </Filter>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
              <tr>
                {["Profile", "Name", "Profession", "Availability", "Previous experience", "Events", "Type", "Applied on", "Action"].map(heading => (
                  <th key={heading} className="px-3 py-2.5 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(row => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-3 py-2"><Avatar volunteer={row} /></td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{row.name}</td>
                  <td className="px-3 py-2 text-slate-600">{row.profession}</td>
                  <td className="px-3 py-2"><div className="flex max-w-[180px] flex-wrap gap-1">{row.availability.map(item => <Badge key={item}>{item}</Badge>)}</div></td>
                  <td className="px-3 py-2"><Badge tone={row.volunteeredBefore ? "yes" : "no"}>{row.volunteeredBefore ? "Yes" : "No"}</Badge></td>
                  <td className="px-3 py-2 text-slate-700">{row.events}</td>
                  <td className="px-3 py-2 text-slate-700">{row.volunteerType || "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{pretty(row.appliedOn)}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => setSelected(row)} className="rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-slate-700">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visible.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">No volunteers match these filters.</p> : null}
        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
          <span>{filtered.length} applications</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40">Previous</button>
            <span>{currentPage} / {pages}</span>
            <button type="button" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)} className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40">Next</button>
          </div>
        </div>
      </section>

      {formOpen ? <ApplicationForm onClose={() => setFormOpen(false)} onSubmit={submit} /> : null}
      {selected ? <Details volunteer={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
      {label}
      <select value={value} onChange={event => onChange(event.target.value)} className="w-40 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none">
        {children}
      </select>
    </label>
  );
}

function Avatar({ volunteer }: { volunteer: Volunteer }) {
  const letters = volunteer.name.split(" ").slice(0, 2).map(part => part[0]).join("").toUpperCase();
  return volunteer.photo ? (
    <img src={volunteer.photo} alt="" className="h-9 w-9 rounded-full border border-slate-200 object-cover" />
  ) : (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">{letters}</span>
  );
}

function Badge({ children, tone = "neutral" }: { children: string; tone?: "neutral" | "yes" | "no" }) {
  const toneClass = tone === "yes" ? "bg-emerald-50 text-emerald-700" : tone === "no" ? "bg-slate-100 text-slate-600" : "bg-indigo-50 text-indigo-700";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${toneClass}`}>{children}</span>;
}

function ApplicationForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: (row: Volunteer) => void }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const profession = form.profession === "Other" ? form.otherProfession.trim() : form.profession;
  const toggleSlot = (slot: Slot) => {
    setForm(current => ({
      ...current,
      availability: current.availability.includes(slot)
        ? current.availability.filter(item => item !== slot)
        : [...current.availability, slot],
    }));
  };

  const save = () => {
    if (!form.photo) return setError("Add a selfie before submitting.");
    if (!form.name.trim()) return setError("Full name is required.");
    if (!profession) return setError("Profession is required.");
    if (!form.availability.length) return setError("Select at least one available time.");
    if (!form.volunteeredBefore) return setError("Tell us if you have volunteered before.");
    const experienced = form.volunteeredBefore === "yes";
    const events = experienced ? Number(form.events) : 0;
    if (experienced && (!Number.isFinite(events) || events < 1)) return setError("Enter how many events you joined.");
    if (experienced && !form.volunteerType) return setError("Choose paid, unpaid, or both.");
    const today = new Date();
    const appliedOn = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    onSubmit({
      id: `cvp-${Date.now()}`,
      name: form.name.trim(),
      profession,
      photo: form.photo,
      availability: form.availability,
      volunteeredBefore: experienced,
      events: experienced ? events : 0,
      volunteerType: experienced ? form.volunteerType as VolunteerType : null,
      appliedOn,
    });
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Volunteer application</h2>
            <p className="text-xs text-slate-500">Community Volunteer Program</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500"><X size={16} /></button>
        </div>
        {done ? (
          <div className="flex flex-col items-center py-10 text-center">
            <CheckCircle2 className="text-emerald-600" size={36} />
            <p className="mt-3 text-sm font-bold text-slate-900">Application submitted</p>
            <p className="mt-1 text-xs text-slate-500">The volunteer is at the top of the list.</p>
            <button type="button" onClick={onClose} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Close</button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <label className="block text-xs font-semibold text-slate-700">
              Selfie
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setForm(current => ({ ...current, photo: String(reader.result || "") }));
                  reader.readAsDataURL(file);
                }}
                className="mt-1 block w-full text-xs text-slate-500"
              />
              {form.photo ? <img src={form.photo} alt="" className="mt-2 h-16 w-16 rounded-full object-cover" /> : null}
            </label>
            <Field label="Full name">
              <input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none" />
            </Field>
            <Field label="Profession">
              <select value={form.profession} onChange={event => setForm(current => ({ ...current, profession: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none">
                <option value="">Select</option>
                {PROFESSIONS.map(item => <option key={item}>{item}</option>)}
                <option>Other</option>
              </select>
            </Field>
            {form.profession === "Other" ? (
              <Field label="Profession name">
                <input value={form.otherProfession} onChange={event => setForm(current => ({ ...current, otherProfession: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none" />
              </Field>
            ) : null}
            <fieldset>
              <legend className="text-xs font-semibold text-slate-700">Availability</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {SLOTS.map(item => (
                  <label key={item} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700">
                    <input type="checkbox" checked={form.availability.includes(item)} onChange={() => toggleSlot(item)} />
                    {item}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-xs font-semibold text-slate-700">Have you volunteered before?</legend>
              <div className="mt-2 flex gap-3 text-sm text-slate-700">
                {(["yes", "no"] as const).map(value => (
                  <label key={value} className="flex items-center gap-1.5">
                    <input type="radio" name="volunteered" checked={form.volunteeredBefore === value} onChange={() => setForm(current => ({ ...current, volunteeredBefore: value }))} />
                    {value === "yes" ? "Yes" : "No"}
                  </label>
                ))}
              </div>
            </fieldset>
            {form.volunteeredBefore === "yes" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Events volunteered in">
                  <input type="number" min={1} value={form.events} onChange={event => setForm(current => ({ ...current, events: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none" />
                </Field>
                <Field label="Volunteering type">
                  <select value={form.volunteerType} onChange={event => setForm(current => ({ ...current, volunteerType: event.target.value as VolunteerType }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none">
                    <option value="">Select</option>
                    <option>Paid</option>
                    <option>Unpaid</option>
                    <option>Both</option>
                  </select>
                </Field>
              </div>
            ) : null}
            {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
            <button type="button" onClick={save} className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white">Submit application</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-slate-700">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Details({ volunteer, onClose }: { volunteer: Volunteer; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar volunteer={volunteer} />
            <div>
              <h2 className="text-base font-bold text-slate-900">{volunteer.name}</h2>
              <p className="text-xs text-slate-500">{volunteer.profession}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500"><X size={16} /></button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <Info label="Applied on" value={pretty(volunteer.appliedOn)} />
          <Info label="Previous experience" value={volunteer.volunteeredBefore ? "Yes" : "No"} />
          <Info label="Events" value={String(volunteer.events)} />
          <Info label="Volunteering type" value={volunteer.volunteerType || "—"} />
        </dl>
        <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">Availability</p>
        <div className="mt-1 flex flex-wrap gap-1">{volunteer.availability.map(item => <Badge key={item}>{item}</Badge>)}</div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-slate-400">{label}</dt><dd className="font-semibold text-slate-800">{value}</dd></div>;
}
