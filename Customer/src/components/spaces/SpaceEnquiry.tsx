import {useState} from 'react';
import {Loader2, Share2} from 'lucide-react';
import {toast} from 'sonner';
import type {SpaceCard} from '../../services/space.service';
import {copySpaceLink, openNativeShare, spaceBookingUrl} from './spaceActions';

export function SpaceEnquiry({space}: {space: SpaceCard}) {
  const [sharing, setSharing] = useState(false);

  const handleBook = () => {
    window.open(spaceBookingUrl(space), '_blank', 'noopener,noreferrer');
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const url = await copySpaceLink(space.id);
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        const result = await openNativeShare(space, url);
        if (result === 'shared') {
          toast.success('Space link shared');
          return;
        }
        if (result === 'cancelled') return;
      }
      toast.success('Space link copied to clipboard');
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
          onClick={() => void handleShare()}
          disabled={sharing}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-purple-200 bg-white px-4 py-3 text-sm font-extrabold text-[#6344E7] transition hover:bg-purple-50 active:scale-95 disabled:opacity-60 cursor-pointer"
        >
          {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          Share
        </button>
        <button
          type="button"
          onClick={handleBook}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#6344E7] px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#5235D9] active:scale-95 cursor-pointer"
        >
          Book Space
        </button>
      </div>
    </div>
  );
}
