import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Camera, CheckCircle2, Loader2, Plus, Search, X } from "lucide-react";
import {
  handleCreateCvpApplication,
  handleDeleteCvpApplication,
  handleGetCvpApplications,
  handleUpdateCvpApplication,
  type CvpApplicationRecord,
} from "@/services/apiClient";

type Slot = "Morning" | "Afternoon" | "Evening" | "Night" | "Anytime";
type VolunteerType = "Paid" | "Unpaid" | "Both";

type Volunteer = {
  id: string;
  name: string;
  phone: string;
  profession: string;
  photo: string;
  availability: Slot[];
  volunteeredBefore: boolean;
  events: string;
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
const PAGE_SIZE = 8;

type DatePreset =
  | ""
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "lastYear";

const istToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const addDays = (ymd: string, days: number) => {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const dateRange = (preset: DatePreset) => {
  if (!preset) return null;
  const today = istToday();
  const [year, month, day] = today.split("-").map(Number);
  const weekDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const mondayOffset = weekDay === 0 ? -6 : 1 - weekDay;
  if (preset === "today") return { from: today, to: today };
  if (preset === "yesterday") {
    const yesterday = addDays(today, -1);
    return { from: yesterday, to: yesterday };
  }
  if (preset === "thisWeek") {
    const start = addDays(today, mondayOffset);
    return { from: start, to: addDays(start, 6) };
  }
  if (preset === "lastWeek") {
    const start = addDays(today, mondayOffset - 7);
    return { from: start, to: addDays(start, 6) };
  }
  if (preset === "thisMonth") {
    const start = `${today.slice(0, 8)}01`;
    return { from: start, to: addDays(addDays(start, 32).slice(0, 8) + "01", -1) };
  }
  if (preset === "lastMonth") {
    const end = addDays(`${today.slice(0, 8)}01`, -1);
    return { from: `${end.slice(0, 8)}01`, to: end };
  }
  if (preset === "thisYear") return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
  const lastYear = String(Number(today.slice(0, 4)) - 1);
  return { from: `${lastYear}-01-01`, to: `${lastYear}-12-31` };
};

const pretty = (ymd: string) => {
  const [year, month, day] = ymd.split("-").map(Number);
  if (!year || !month || !day) return "—";
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const appliedDay = (value?: string) => {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
};

const photoSrc = (url: string) => {
  if (!url || url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:")) return url;
  const origin = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  return `${origin}${url}`;
};

const toVolunteer = (row: CvpApplicationRecord): Volunteer => ({
  id: row._id,
  name: row.fullName,
  phone: row.phone || "",
  profession: row.profession,
  photo: photoSrc(row.photoUrl),
  availability: (row.availability || []).filter((slot): slot is Slot => SLOTS.includes(slot)),
  volunteeredBefore: Boolean(row.volunteeredBefore),
  events: row.volunteeredBefore ? String(row.events || "") : "",
  volunteerType: row.volunteeredBefore && row.volunteerType ? row.volunteerType : null,
  appliedOn: appliedDay(row.createdAt),
});

const apiMessage = (error: unknown) => {
  const err = error as { response?: { data?: { message?: string } } };
  return err?.response?.data?.message || "Could not save the volunteer application.";
};

const emptyForm = () => ({
  name: "",
  phone: "",
  profession: "",
  otherProfession: "",
  photoPreview: "",
  photoFile: null as File | null,
  availability: [] as Slot[],
  volunteeredBefore: "" as "" | "yes" | "no",
  events: "",
  volunteerType: "" as "" | VolunteerType,
});

export default function CvpScreen() {
  const [rows, setRows] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [slot, setSlot] = useState<"" | Slot>("");
  const [experience, setExperience] = useState<"" | "yes" | "no">("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [period, setPeriod] = useState<DatePreset>("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Volunteer | null>(null);
  const [editing, setEditing] = useState<Volunteer | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await handleGetCvpApplications();
      setRows((response.applications || []).map(toVolunteer));
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = rows.filter(row => {
      if (query && !`${row.name} ${row.phone} ${row.profession}`.toLowerCase().includes(query)) return false;
      if (slot && !row.availability.includes(slot)) return false;
      if (experience === "yes" && !row.volunteeredBefore) return false;
      if (experience === "no" && row.volunteeredBefore) return false;
      const bounds = dateRange(period);
      if (bounds && (row.appliedOn < bounds.from || row.appliedOn > bounds.to)) return false;
      return true;
    });
    list.sort((a, b) => sort === "newest" ? b.appliedOn.localeCompare(a.appliedOn) : a.appliedOn.localeCompare(b.appliedOn));
    return list;
  }, [rows, search, slot, experience, sort, period]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const remove = async (row: Volunteer) => {
    if (!window.confirm(`Delete ${row.name}'s application?`)) return;
    try {
      await handleDeleteCvpApplication(row.id);
      setSelected(null);
      await load();
    } catch (err) {
      setError(apiMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Community Volunteer Program</h1>
          <p className="mt-1 text-sm text-slate-500">Review, update, and remove volunteer applications.</p>
        </div>
        <button type="button" onClick={() => { setEditing(null); setFormOpen(true); }} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
          <Plus size={14} /> New application
        </button>
      </header>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Search
          <span className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-2">
            <Search size={14} className="text-slate-400" />
            <input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Name, phone, or profession" className="w-full bg-transparent text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none" />
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
        <Filter label="Date" value={period} onChange={value => { setPeriod(value as DatePreset); setPage(1); }}>
          <option value="">All dates</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="thisWeek">This week</option>
          <option value="lastWeek">Last week</option>
          <option value="thisMonth">This month</option>
          <option value="lastMonth">Last month</option>
          <option value="thisYear">This year</option>
          <option value="lastYear">Last year</option>
        </Filter>
        <Filter label="Applied on" value={sort} onChange={value => setSort(value as "newest" | "oldest")}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </Filter>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
              <tr>
                {["Profile", "Name", "Phone", "Profession", "Availability", "Previous experience", "Events", "Type", "Applied on", "Action"].map(heading => (
                  <th key={heading} className="px-3 py-2.5 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(row => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-3 py-2"><Avatar volunteer={row} /></td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{row.name}</td>
                  <td className="px-3 py-2 text-slate-700">{row.phone || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{row.profession}</td>
                  <td className="px-3 py-2"><div className="flex max-w-[180px] flex-wrap gap-1">{row.availability.map(item => <Badge key={item}>{item}</Badge>)}</div></td>
                  <td className="px-3 py-2"><Badge tone={row.volunteeredBefore ? "yes" : "no"}>{row.volunteeredBefore ? "Yes" : "No"}</Badge></td>
                  <td className="px-3 py-2 text-slate-700">{row.events || "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{row.volunteerType || "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{pretty(row.appliedOn)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setSelected(row)} className="rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-slate-700">View</button>
                      <button type="button" onClick={() => { setEditing(row); setFormOpen(true); }} className="rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-slate-700">Edit</button>
                      <button type="button" onClick={() => void remove(row)} className="rounded-lg border border-rose-200 px-2.5 py-1 font-semibold text-rose-700">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading ? <p className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400"><Loader2 size={14} className="animate-spin" /> Loading applications</p> : null}
        {!loading && visible.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">No volunteer applications yet.</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
          <span>
            {filtered.length === 0
              ? "0 applications"
              : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40">Previous</button>
            {(pages <= 7
              ? Array.from({ length: pages }, (_, index) => index + 1)
              : [1, currentPage - 1, currentPage, currentPage + 1, pages].filter((number, index, list) => number >= 1 && number <= pages && list.indexOf(number) === index)
            ).map(number => (
              <button
                key={number}
                type="button"
                onClick={() => setPage(number)}
                className={`h-7 min-w-7 rounded-lg border px-2 ${number === currentPage ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600"}`}
              >
                {number}
              </button>
            ))}
            <button type="button" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)} className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40">Next</button>
          </div>
        </div>
      </section>

      {formOpen ? (
        <ApplicationForm
          initial={editing}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSaved={load}
        />
      ) : null}
      {selected ? <Details volunteer={selected} onClose={() => setSelected(null)} onDelete={() => void remove(selected)} onEdit={() => { setEditing(selected); setSelected(null); setFormOpen(true); }} /> : null}
    </div>
  );
}

function Filter({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
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

function ApplicationForm({ initial, onClose, onSaved }: { initial?: Volunteer | null; onClose: () => void; onSaved: () => Promise<void>; }) {
  const knownProfession = initial && PROFESSIONS.includes(initial.profession);
  const [form, setForm] = useState(() => initial ? {
    name: initial.name,
    phone: initial.phone,
    profession: knownProfession ? initial.profession : "Other",
    otherProfession: knownProfession ? "" : initial.profession,
    photoPreview: initial.photo,
    photoFile: null as File | null,
    availability: initial.availability,
    volunteeredBefore: (initial.volunteeredBefore ? "yes" : "no") as "" | "yes" | "no",
    events: initial.volunteeredBefore ? String(initial.events) : "",
    volunteerType: (initial.volunteerType || "") as "" | VolunteerType,
  } : emptyForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const profession = form.profession === "Other" ? form.otherProfession.trim() : form.profession;
  const toggleSlot = (item: Slot) => {
    setForm(current => ({
      ...current,
      availability: current.availability.includes(item)
        ? current.availability.filter(slot => slot !== item)
        : [...current.availability, item],
    }));
  };

  const save = async () => {
    if (!initial && !form.photoFile) return setError("Add a selfie before submitting.");
    if (!form.name.trim()) return setError("Full name is required.");
    const phone = form.phone.replace(/\D/g, "").slice(-10);
    if (!/^\d{10}$/.test(phone)) return setError("Enter a 10-digit phone number.");
    if (!profession) return setError("Profession is required.");
    if (!form.availability.length) return setError("Select at least one available time.");
    if (!form.volunteeredBefore) return setError("Tell us if you have volunteered before.");
    const experienced = form.volunteeredBefore === "yes";
    const events = experienced ? form.events.trim() : "";
    if (experienced && !events) return setError("Enter the events you volunteered in.");
    if (experienced && !form.volunteerType) return setError("Choose paid, unpaid, or both.");

    const body = new FormData();
    body.append("fullName", form.name.trim());
    body.append("phone", phone);
    body.append("profession", profession);
    body.append("availability", JSON.stringify(form.availability));
    body.append("volunteeredBefore", experienced ? "yes" : "no");
    body.append("events", events);
    body.append("volunteerType", experienced ? form.volunteerType : "");
    if (form.photoFile) body.append("photo", form.photoFile);

    setSaving(true);
    setError("");
    try {
      if (initial) await handleUpdateCvpApplication(initial.id, body);
      else await handleCreateCvpApplication(body);
      await onSaved();
      setDone(true);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">{initial ? "Edit application" : "Volunteer application"}</h2>
            <p className="text-xs text-slate-500">Community Volunteer Program</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500"><X size={16} /></button>
        </div>
        {done ? (
          <div className="flex flex-col items-center py-10 text-center">
            <CheckCircle2 className="text-emerald-600" size={36} />
            <p className="mt-3 text-sm font-bold text-slate-900">{initial ? "Application updated" : "Application submitted"}</p>
            <button type="button" onClick={onClose} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Close</button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <label className="flex cursor-pointer flex-col items-center gap-2">
              <span className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-dashed border-slate-300 bg-slate-50 text-slate-500">
                {form.photoPreview ? (
                  <img src={form.photoPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Camera size={28} />
                )}
              </span>
              <span className="text-xs font-semibold text-slate-700">Upload selfie</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="user"
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setForm(current => ({ ...current, photoFile: file, photoPreview: URL.createObjectURL(file) }));
                }}
                className="sr-only"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full name">
                <input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none" />
              </Field>
              <Field label="Phone number">
                <input inputMode="numeric" maxLength={10} value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="10-digit mobile" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none" />
              </Field>
            </div>
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
                  <input type="text" value={form.events} onChange={event => setForm(current => ({ ...current, events: event.target.value }))} placeholder="Food fest, college fest" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none" />
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
            <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {initial ? "Save changes" : "Submit application"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-700">{label}<div className="mt-1">{children}</div></label>;
}

function Details({ volunteer, onClose, onEdit, onDelete }: { volunteer: Volunteer; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
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
          <Info label="Phone" value={volunteer.phone || "—"} />
          <Info label="Applied on" value={pretty(volunteer.appliedOn)} />
          <Info label="Previous experience" value={volunteer.volunteeredBefore ? "Yes" : "No"} />
          <Info label="Events" value={volunteer.events || "—"} />
          <Info label="Volunteering type" value={volunteer.volunteerType || "—"} />
        </dl>
        <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">Availability</p>
        <div className="mt-1 flex flex-wrap gap-1">{volunteer.availability.map(item => <Badge key={item}>{item}</Badge>)}</div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onEdit} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Edit</button>
          <button type="button" onClick={onDelete} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">Delete</button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-slate-400">{label}</dt><dd className="font-semibold text-slate-800">{value}</dd></div>;
}
