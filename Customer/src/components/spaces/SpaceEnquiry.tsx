import {useState} from 'react';
import {Loader2, MessageCircle, Share2} from 'lucide-react';
import {toast} from 'sonner';
import type {SpaceCard} from '../../services/space.service';
import {copySpaceLink, openNativeShare, spaceQueryUrl} from './spaceActions';

export function SpaceEnquiry({space}: {space: SpaceCard}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{name?: string; phone?: string}>({});
  const [sending, setSending] = useState(false);
  const [sharing, setSharing] = useState(false);

  const submitQuery = () => {
    const nextErrors: {name?: string; phone?: string} = {};
    if (!name.trim()) nextErrors.name = 'Your name is required.';
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) nextErrors.phone = 'Enter a 10-digit mobile number.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSending(true);
    try {
      window.open(
        spaceQueryUrl(space, {name, phone: digits, message}),
        '_blank',
        'noopener,noreferrer',
      );
      toast.success('Query opened in WhatsApp for this space.');
      setOpen(false);
    } catch {
      toast.error('Could not open the query. Try again.');
    } finally {
      setSending(false);
    }
  };

  const share = async () => {
    setSharing(true);
    try {
      const url = await copySpaceLink(space.id);
      toast.success('Space link copied.');
      const result = await openNativeShare(space, url);
      if (result === 'failed') toast.error('Could not open the share dialog.');
    } catch {
      toast.error('Could not copy the space link.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#EA580C] px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#C2410C]"
        >
          <MessageCircle className="h-4 w-4" />
          Query
        </button>
        <button
          type="button"
          onClick={() => void share()}
          disabled={sharing}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#EA580C] bg-white px-4 py-3 text-sm font-extrabold text-[#EA580C] transition hover:bg-[#FFF7ED] disabled:opacity-60"
        >
          {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          Share
        </button>
      </div>
      {open ? (
        <form
          className="space-y-3 rounded-2xl border border-orange-100 bg-[#FFF7ED] p-3"
          onSubmit={event => {
            event.preventDefault();
            submitQuery();
          }}
        >
          <p className="text-left text-xs font-bold text-[#9A3412]">
            This enquiry is for {space.name}.
          </p>
          <label className="block text-left">
            <span className="mb-1 block text-xs font-bold text-slate-600">Your name</span>
            <input
              value={name}
              onChange={event => setName(event.target.value)}
              className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#EA580C]"
            />
            {errors.name ? <span className="mt-1 block text-xs font-semibold text-red-600">{errors.name}</span> : null}
          </label>
          <label className="block text-left">
            <span className="mb-1 block text-xs font-bold text-slate-600">Mobile number</span>
            <input
              inputMode="numeric"
              value={phone}
              onChange={event => setPhone(event.target.value)}
              className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#EA580C]"
            />
            {errors.phone ? <span className="mt-1 block text-xs font-semibold text-red-600">{errors.phone}</span> : null}
          </label>
          <label className="block text-left">
            <span className="mb-1 block text-xs font-bold text-slate-600">Message</span>
            <textarea
              rows={3}
              value={message}
              onChange={event => setMessage(event.target.value)}
              className="w-full resize-none rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#EA580C]"
            />
          </label>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#111111] px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Send query
          </button>
        </form>
      ) : null}
    </div>
  );
}
