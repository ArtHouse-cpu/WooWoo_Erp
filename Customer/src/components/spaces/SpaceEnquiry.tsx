import {useState} from 'react';
import {Loader2, Share2} from 'lucide-react';
import {toast} from 'sonner';
import type {SpaceCard} from '../../services/space.service';
import {copySpaceLink, spaceBookingUrl, type MembershipTier} from './spaceActions';
import {ShareSpaceModal} from './ShareSpaceModal';

export function SpaceEnquiry({
  space,
  membershipTier,
}: {
  space: SpaceCard;
  membershipTier?: MembershipTier | null;
}) {
  const [sharing, setSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleBook = () => {
    window.open(spaceBookingUrl(space, membershipTier), '_blank', 'noopener,noreferrer');
  };

  const handleShare = async () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowShareModal(true);
      return;
    }
    setSharing(true);
    try {
      await copySpaceLink(space.id, membershipTier?.id);
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

      <ShareSpaceModal
        space={space}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
}
