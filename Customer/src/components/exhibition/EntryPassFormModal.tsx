import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {useFieldArray, useForm} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {Loader2, Phone, Ticket, Trash2, UserPlus, X} from 'lucide-react';
import {
  EXHIBITION_EVENT,
  GENDER_OPTIONS,
  INTEREST_OPTIONS,
  MAX_PEOPLE_PER_REQUEST,
  type PassPerson,
} from './entryPass';

const personSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter full name').max(60, 'Name is too long'),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  age: z
    .string()
    .trim()
    .min(1, 'Enter age')
    .refine(v => /^\d{1,3}$/.test(v) && Number(v) >= 1 && Number(v) <= 110, 'Enter a valid age'),
  gender: z
    .string()
    .refine(v => (GENDER_OPTIONS as readonly string[]).includes(v), 'Select gender'),
  interest: z
    .string()
    .refine(v => (INTEREST_OPTIONS as readonly string[]).includes(v), 'Select an interest'),
});

const schema = z.object({
  people: z.array(personSchema).min(1).max(MAX_PEOPLE_PER_REQUEST),
});

type FormValues = z.infer<typeof schema>;

const emptyPerson = (phone = ''): FormValues['people'][number] => ({
  fullName: '',
  phone,
  age: '',
  gender: '',
  interest: '',
});

const inputClass =
  'h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-[#1c1917] outline-none transition placeholder:text-[#a8a29e] focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/20';

const chipClass =
  'cursor-pointer rounded-full border border-[#e7e5e4] bg-white px-3 py-1.5 text-xs font-semibold text-[#57534e] transition peer-checked:border-[#f97316] peer-checked:bg-[#f97316] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#f97316]/40 hover:border-[#fdba74]';

const FieldError = ({message}: {message?: string}) =>
  message ? <p className="mt-1 text-[11px] font-medium text-[#dc2626]">{message}</p> : null;

type Props = {
  open: boolean;
  onClose: () => void;
  onGenerate: (people: PassPerson[]) => void | Promise<void>;
};

export default function EntryPassFormModal({open, onClose, onGenerate}: Props) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    reset,
    formState: {errors},
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {people: [emptyPerson()]},
    mode: 'onTouched',
  });

  const {fields, append, remove} = useFieldArray({control, name: 'people'});

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, submitting]);

  if (!open) return null;

  const canAddMore = fields.length < MAX_PEOPLE_PER_REQUEST;

  const handleAddPerson = () => {
    if (!canAddMore) return;
    append(emptyPerson(getValues('people.0.phone') || ''));
  };

  const submit = handleSubmit(async values => {
    setSubmitting(true);
    try {
      await onGenerate(
        values.people.map(p => ({
          fullName: p.fullName.trim(),
          phone: p.phone.trim(),
          age: Number(p.age),
          gender: p.gender as PassPerson['gender'],
          interest: p.interest as PassPerson['interest'],
        })),
      );
      reset({people: [emptyPerson()]});
    } finally {
      setSubmitting(false);
    }
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[#1c1917]/60 backdrop-blur-sm sm:items-center sm:px-4"
      onMouseDown={e => {
        if (e.currentTarget === e.target && !submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="entry-pass-form-title"
    >
      <form
        onSubmit={submit}
        noValidate
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#fffaf4] shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#f1e7da] px-5 pb-4 pt-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ffedd5] text-[#ea580c]">
              <Ticket size={20} />
            </span>
            <div>
              <h2 id="entry-pass-form-title" className="font-serif text-xl font-bold text-[#1c1917]">
                Get Your Free Entry Pass
              </h2>
              <p className="mt-0.5 text-xs text-[#78716c]">
                {EXHIBITION_EVENT.name} · {EXHIBITION_EVENT.dateLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full p-2 text-[#a8a29e] transition hover:bg-white hover:text-[#1c1917] disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* People */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {fields.map((field, index) => {
            const err = errors.people?.[index];
            return (
              <fieldset
                key={field.id}
                className="rounded-2xl border border-[#efe4d6] bg-white/70 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <legend className="flex items-center gap-2 text-sm font-bold text-[#1c1917]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1c1917] text-[11px] text-white">
                      {index + 1}
                    </span>
                    {index === 0 ? 'Your details' : `Person ${index + 1}`}
                  </legend>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#dc2626] transition hover:bg-[#fef2f2]"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#44403c]">
                      Full Name <span className="text-[#dc2626]">*</span>
                    </label>
                    <input
                      {...register(`people.${index}.fullName`)}
                      placeholder="e.g. Ananya Sharma"
                      autoComplete={index === 0 ? 'name' : 'off'}
                      className={`${inputClass} ${err?.fullName ? 'border-[#fca5a5]' : 'border-[#e7e5e4]'}`}
                    />
                    <FieldError message={err?.fullName?.message} />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#44403c]">
                      Phone Number <span className="text-[#dc2626]">*</span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-sm font-semibold text-[#78716c]">
                        <Phone size={14} />
                        +91
                      </span>
                      <input
                        {...register(`people.${index}.phone`, {
                          setValueAs: (v: unknown) => String(v ?? '').replace(/\D/g, ''),
                        })}
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="9876543210"
                        autoComplete={index === 0 ? 'tel-national' : 'off'}
                        className={`${inputClass} pl-[4.5rem] ${err?.phone ? 'border-[#fca5a5]' : 'border-[#e7e5e4]'}`}
                      />
                    </div>
                    <FieldError message={err?.phone?.message} />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#44403c]">
                      Age <span className="text-[#dc2626]">*</span>
                    </label>
                    <input
                      {...register(`people.${index}.age`)}
                      inputMode="numeric"
                      maxLength={3}
                      placeholder="e.g. 24"
                      className={`${inputClass} max-w-[8rem] ${err?.age ? 'border-[#fca5a5]' : 'border-[#e7e5e4]'}`}
                    />
                    <FieldError message={err?.age?.message} />
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-[#44403c]">
                      Gender <span className="text-[#dc2626]">*</span>
                    </p>
                    <div className="flex flex-wrap gap-2" role="radiogroup">
                      {GENDER_OPTIONS.map(option => (
                        <label key={option}>
                          <input
                            type="radio"
                            value={option}
                            {...register(`people.${index}.gender`)}
                            className="peer sr-only"
                          />
                          <span className={chipClass}>{option}</span>
                        </label>
                      ))}
                    </div>
                    <FieldError message={err?.gender?.message} />
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-[#44403c]">
                      Interest <span className="text-[#dc2626]">*</span>
                    </p>
                    <div className="flex flex-wrap gap-2" role="radiogroup">
                      {INTEREST_OPTIONS.map(option => (
                        <label key={option}>
                          <input
                            type="radio"
                            value={option}
                            {...register(`people.${index}.interest`)}
                            className="peer sr-only"
                          />
                          <span className={chipClass}>{option}</span>
                        </label>
                      ))}
                    </div>
                    <FieldError message={err?.interest?.message} />
                  </div>
                </div>
              </fieldset>
            );
          })}

          <button
            type="button"
            onClick={handleAddPerson}
            disabled={!canAddMore}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#fdba74] bg-[#fff7ed] py-3 text-sm font-bold text-[#c2410c] transition hover:bg-[#ffedd5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus size={16} />
            {canAddMore
              ? 'Add More People'
              : `Maximum ${MAX_PEOPLE_PER_REQUEST} people per request`}
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-[#f1e7da] bg-[#fffaf4] px-5 py-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#f97316] text-[15px] font-bold text-white shadow-lg shadow-[#f97316]/25 transition hover:bg-[#ea580c] active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Ticket size={18} />}
            {submitting
              ? 'Generating…'
              : fields.length > 1
                ? `Generate ${fields.length} Passes`
                : 'Generate Pass'}
          </button>
          <p className="mt-2 text-center text-[11px] text-[#a8a29e]">
            Entry is free. Each person gets their own pass with a unique code.
          </p>
        </div>
      </form>
    </div>,
    document.body,
  );
}
