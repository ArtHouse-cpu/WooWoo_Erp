import {useEffect, useState, type FormEvent, type ReactNode} from 'react';
import {ChevronDown, Clock, Link2, Users, X} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import Swal from 'sweetalert2';
import {closeIfConfirmed} from '../../utils/confirmClose';
import {useAuthStore} from '../../store/authStore';
import {
  HAP_PROFESSIONS,
  hapApi,
  type HapApplication,
} from '../../services/hap.service';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: (application: HapApplication) => void;
};

export function HapJoinModal({isOpen, onClose, onSubmitted}: Props) {
  const customer = useAuthStore(state => state.customer);
  const [profession, setProfession] = useState('');
  const [networkSize, setNetworkSize] = useState('');
  const [payoutDetail, setPayoutDetail] = useState('');
  const [presence, setPresence] = useState('');
  const [existing, setExisting] = useState<HapApplication | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setProfession('');
    setNetworkSize('');
    setPayoutDetail('');
    setPresence('');
    let cancelled = false;
    setLoading(true);
    hapApi
      .mine()
      .then(({data}) => {
        if (cancelled) return;
        const row = data.data ?? null;
        setExisting(row);
        if (row?.status === 'rejected') {
          setProfession(row.profession || '');
          setNetworkSize(row.networkSize ? String(row.networkSize) : '');
          setPayoutDetail(row.payoutDetail || '');
          setPresence(row.presence || '');
        }
      })
      .catch(() => {
        if (!cancelled) setExisting(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const waiting = existing?.status === 'under_review';
  const approved = existing?.status === 'approved';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (waiting || approved) return;
    if (!customer?._id) {
      Swal.fire({
        icon: 'warning',
        title: 'Sign in required',
        text: 'Sign in so we can attach this application to your account.',
        confirmButtonColor: '#7C3AED',
      });
      return;
    }
    const size = Number(networkSize);
    if (!profession) {
      Swal.fire({icon: 'warning', title: 'Select a profession', confirmButtonColor: '#7C3AED'});
      return;
    }
    if (!Number.isInteger(size) || size < 1) {
      Swal.fire({
        icon: 'warning',
        title: 'Enter your network size',
        text: 'Use a whole number of at least 1.',
        confirmButtonColor: '#7C3AED',
      });
      return;
    }
    if (payoutDetail.trim().length < 4) {
      Swal.fire({
        icon: 'warning',
        title: 'UPI ID or account number is required',
        confirmButtonColor: '#7C3AED',
      });
      return;
    }
    if (presence.trim().length < 3) {
      Swal.fire({
        icon: 'warning',
        title: 'Website or social media is required',
        confirmButtonColor: '#7C3AED',
      });
      return;
    }

    setSubmitting(true);
    try {
      const {data} = await hapApi.apply({
        customerId: customer._id,
        profession,
        networkSize: size,
        payoutDetail: payoutDetail.trim(),
        presence: presence.trim(),
      });
      setExisting(data.data);
      onSubmitted?.(data.data);
    } catch (error: unknown) {
      const message =
        (error as {response?: {data?: {message?: string}}})?.response?.data
          ?.message || 'Could not submit your HAP application.';
      Swal.fire({icon: 'error', title: 'Not submitted', text: message, confirmButtonColor: '#7C3AED'});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{y: 24, opacity: 0}}
            animate={{y: 0, opacity: 1}}
            exit={{y: 24, opacity: 0}}
            className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hap-join-title"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="hap-join-title" className="text-base font-black text-slate-900">
                  House Affiliate Program
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Tell us about your network. We review every application.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void closeIfConfirmed(onClose)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              {loading ? (
                <p className="py-8 text-center text-sm font-semibold text-slate-400">
                  Loading your application…
                </p>
              ) : waiting || approved ? (
                <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-5 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-violet-600">
                    {approved ? <Users className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                  </div>
                  <p className="mt-3 text-sm font-black text-violet-900">
                    {approved ? 'You are approved' : 'Wait for approval'}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-violet-800">
                    {approved
                      ? 'Your House Affiliate application is approved. Earnings show up only after real activity.'
                      : 'Your application is under review. We will update this screen after it is approved or rejected.'}
                  </p>
                  {existing ? (
                    <dl className="mt-4 space-y-2 text-left text-xs">
                      <Detail label="Profession" value={existing.profession} />
                      <Detail label="Network size" value={String(existing.networkSize)} />
                      <Detail label="UPI / account" value={existing.payoutDetail} />
                      <Detail label="Website / social" value={existing.presence} />
                    </dl>
                  ) : null}
                </div>
              ) : (
                <form id="hap-join-form" onSubmit={handleSubmit} className="space-y-3">
                  {existing?.status === 'rejected' ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">
                      Previous application was rejected.
                      {existing.rejectionReason
                        ? ` Reason: ${existing.rejectionReason}`
                        : ''}{' '}
                      You can apply again.
                    </div>
                  ) : null}

                  <Field label="Profession">
                    <div className="relative">
                      <select
                        value={profession}
                        onChange={event => setProfession(event.target.value)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm font-semibold text-slate-800 outline-none focus:border-violet-500"
                      >
                        <option value="">Select profession</option>
                        {HAP_PROFESSIONS.map(item => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </Field>

                  <Field label="Network size">
                    <input
                      inputMode="numeric"
                      value={networkSize}
                      onChange={event =>
                        setNetworkSize(event.target.value.replace(/[^\d]/g, ''))
                      }
                      placeholder="How many people can you reach?"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-violet-500"
                    />
                  </Field>

                  <Field label="UPI ID or account number">
                    <input
                      value={payoutDetail}
                      onChange={event => setPayoutDetail(event.target.value)}
                      placeholder="name@upi or account number"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-violet-500"
                      autoComplete="off"
                    />
                  </Field>

                  <Field label="Website or social media">
                    <div className="relative">
                      <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={presence}
                        onChange={event => setPresence(event.target.value)}
                        placeholder="https:// or @handle"
                        className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-violet-500"
                      />
                    </div>
                  </Field>
                </form>
              )}
            </div>

            <div className="border-t border-slate-100 px-5 py-4">
              {waiting || approved || loading ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-2xl bg-[#7C3AED] py-3 text-sm font-extrabold text-white"
                >
                  Close
                </button>
              ) : (
                <button
                  type="submit"
                  form="hap-join-form"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-[#7C3AED] py-3 text-sm font-extrabold text-white disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : 'Submit application'}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function Field({label, children}: {label: string; children: ReactNode}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Detail({label, value}: {label: string; value: string}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-white px-3 py-2">
      <dt className="font-bold text-slate-500">{label}</dt>
      <dd className="max-w-[60%] text-right font-black text-slate-800 break-all">{value}</dd>
    </div>
  );
}
