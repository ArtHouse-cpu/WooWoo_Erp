import { useEffect, useState, type FormEvent } from "react";
import { Check, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  handleCreateExhibitionPasses,
  type ExhibitionPassPersonPayload,
} from "@/services/apiClient";

const EXHIBITION_GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
const EXHIBITION_INTERESTS = [
  "Art",
  "Fashion",
  "Craft",
  "Live Workshops",
  "Food",
  "Music & Activities",
];

const MAX_PEOPLE = 10;
const PHONE_RE = /^[6-9]\d{9}$/;

type PersonForm = {
  fullName: string;
  phone: string;
  age: string;
  gender: string;
  interests: string[];
};

type PersonErrors = Partial<Record<keyof PersonForm, string>>;

const emptyPerson = (): PersonForm => ({
  fullName: "",
  phone: "",
  age: "",
  gender: "",
  interests: [],
});

const validate = (people: PersonForm[]): PersonErrors[] => {
  const phoneOwner = new Map<string, number>();
  return people.map((p, index) => {
    const errors: PersonErrors = {};
    const name = p.fullName.trim();
    if (name.length < 2 || name.length > 60) errors.fullName = "Enter 2–60 characters.";
    if (!PHONE_RE.test(p.phone)) {
      errors.phone = "Enter a valid 10-digit mobile number.";
    } else if (phoneOwner.has(p.phone)) {
      errors.phone = `Already used by Person ${phoneOwner.get(p.phone)}.`;
    } else {
      phoneOwner.set(p.phone, index + 1);
    }
    const age = Number(p.age);
    if (!Number.isInteger(age) || age < 1 || age > 110) errors.age = "Invalid age.";
    if (!p.gender) errors.gender = "Select gender.";
    if (p.interests.length === 0) errors.interests = "Select at least one interest.";
    return errors;
  });
};

const getErrorData = (error: unknown) =>
  (error as { response?: { data?: { message?: string; duplicatePhones?: string[] } } })
    ?.response?.data;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
};

const inputClass = (hasError?: string) =>
  `w-full rounded-md border px-3 py-2 text-sm outline-none transition focus:border-orange-500 ${
    hasError ? "border-red-400" : "border-gray-300"
  }`;

const CreateExhibitionPassModal = ({ isOpen, onClose, onCreated }: Props) => {
  const [people, setPeople] = useState<PersonForm[]>([emptyPerson()]);
  const [errors, setErrors] = useState<PersonErrors[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setPeople([emptyPerson()]);
    setErrors([]);
    setFormError("");
  }, [isOpen]);

  if (!isOpen) return null;

  const update = (index: number, patch: Partial<PersonForm>) => {
    setPeople((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
    setErrors((prev) =>
      prev.map((e, i) => {
        if (i !== index) return e;
        const next = { ...e };
        (Object.keys(patch) as (keyof PersonForm)[]).forEach((key) => delete next[key]);
        return next;
      }),
    );
    setFormError("");
  };

  const toggleInterest = (index: number, interest: string) => {
    const current = people[index].interests;
    update(index, {
      interests: current.includes(interest)
        ? current.filter((v) => v !== interest)
        : [...current, interest],
    });
  };

  const removePerson = (index: number) => {
    setPeople((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    if (!submitting) onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors = validate(people);
    setErrors(nextErrors);
    if (nextErrors.some((err) => Object.keys(err).length > 0)) {
      setFormError("Please fix the highlighted fields.");
      return;
    }

    const payload: ExhibitionPassPersonPayload[] = people.map((p) => ({
      fullName: p.fullName.trim().replace(/\s+/g, " "),
      phone: p.phone,
      age: Number(p.age),
      gender: p.gender,
      interests: p.interests,
    }));

    setSubmitting(true);
    try {
      const res = await handleCreateExhibitionPasses(payload);
      const codes = res.data?.map((p) => p.code).join(", ");
      toast.success(`${res.message}${codes ? `: ${codes}` : ""}`);
      onCreated();
      onClose();
    } catch (error) {
      const data = getErrorData(error);
      const duplicates = data?.duplicatePhones ?? [];
      if (duplicates.length) {
        setErrors(
          people.map((p) =>
            duplicates.includes(p.phone)
              ? { phone: "Already registered for this exhibition." }
              : {},
          ),
        );
      }
      setFormError(data?.message || "Failed to create pass.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 sm:p-4">
      <div className="flex h-full w-full flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-xl">
        <div className="safe-top flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Create Entry Pass</h2>
            <p className="text-xs text-gray-500">
              Each person gets their own pass. Up to {MAX_PEOPLE} people per group.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {people.map((person, index) => {
              const err = errors[index] ?? {};
              return (
                <div key={index} className="rounded-lg border border-gray-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">
                      Person {index + 1}
                    </span>
                    {people.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePerson(index)}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Remove person"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={person.fullName}
                        onChange={(e) => update(index, { fullName: e.target.value })}
                        placeholder="e.g. Ananya Sharma"
                        className={inputClass(err.fullName)}
                      />
                      {err.fullName && <p className="mt-1 text-xs text-red-500">{err.fullName}</p>}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={person.phone}
                        onChange={(e) =>
                          update(index, { phone: e.target.value.replace(/\D/g, "").slice(0, 10) })
                        }
                        placeholder="10-digit mobile number"
                        className={inputClass(err.phone)}
                      />
                      {err.phone && <p className="mt-1 text-xs text-red-500">{err.phone}</p>}
                    </div>

                    <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 sm:col-span-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Age <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={110}
                          value={person.age}
                          onChange={(e) => update(index, { age: e.target.value })}
                          placeholder="24"
                          className={inputClass(err.age)}
                        />
                        {err.age && <p className="mt-1 text-xs text-red-500">{err.age}</p>}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Gender <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={person.gender}
                          onChange={(e) => update(index, { gender: e.target.value })}
                          className={inputClass(err.gender)}
                        >
                          <option value="">Select gender</option>
                          {EXHIBITION_GENDERS.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                        {err.gender && <p className="mt-1 text-xs text-red-500">{err.gender}</p>}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Interests <span className="text-red-500">*</span>{" "}
                        <span className="text-xs font-normal text-gray-400">Select all that apply</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {EXHIBITION_INTERESTS.map((interest) => {
                          const selected = person.interests.includes(interest);
                          return (
                            <button
                              key={interest}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => toggleInterest(index, interest)}
                              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition ${
                                selected
                                  ? "border-orange-500 bg-orange-50 text-orange-700"
                                  : "border-gray-200 text-gray-600 hover:border-gray-300"
                              }`}
                            >
                              {selected && <Check size={12} />}
                              {interest}
                            </button>
                          );
                        })}
                      </div>
                      {err.interests && <p className="mt-1 text-xs text-red-500">{err.interests}</p>}
                    </div>
                  </div>
                </div>
              );
            })}

            {people.length < MAX_PEOPLE && (
              <button
                type="button"
                onClick={() => setPeople((prev) => [...prev, emptyPerson()])}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:border-orange-400 hover:text-orange-600"
              >
                <Plus size={16} />
                Add another person
              </button>
            )}

            {formError && (
              <div className="rounded-md bg-red-50 p-2.5 text-sm text-red-600">{formError}</div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {people.length > 1 ? `Create ${people.length} Passes` : "Create Pass"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateExhibitionPassModal;
