import {useState} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {X, Share2, Copy, Check, MessageCircle, Link2, Sparkles} from 'lucide-react';
import {toast} from 'sonner';
import type {SpaceCard} from '../../services/space.service';
import {SpacePhoto} from './SpacePhoto';
import {formatInr, copySpaceLink, openNativeShare, spaceShareUrl} from './spaceActions';

type ShareSpaceModalProps = {
  space: SpaceCard | null;
  isOpen: boolean;
  onClose: () => void;
};

export function ShareSpaceModal({space, isOpen, onClose}: ShareSpaceModalProps) {
  const [copied, setCopied] = useState(false);

  if (!space) return null;

  const url = spaceShareUrl(space.id);

  const handleCopyLink = async () => {
    try {
      await copySpaceLink(space.id);
      setCopied(true);
      toast.success('Space link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleWhatsAppShare = () => {
    const priceText = space.fromPrice ? `(From ₹${formatInr(space.fromPrice)}/hr)` : '';
    const text = `Check out ${space.name} ${priceText} at WooWoo Art House!\n${url}`.trim();
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      const result = await openNativeShare(space, url);
      if (result === 'shared') {
        toast.success('Shared successfully');
        onClose();
        return;
      }
      if (result === 'cancelled') return;
    }
    await handleCopyLink();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center md:hidden">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Bottom Sheet Panel */}
          <motion.div
            initial={{y: '100%'}}
            animate={{y: 0}}
            exit={{y: '100%'}}
            transition={{type: 'spring', damping: 26, stiffness: 260}}
            className="relative z-10 flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-[32px] bg-white shadow-2xl overflow-hidden border-t border-slate-100 text-left"
          >
            {/* Top Drag Handle */}
            <div className="flex shrink-0 justify-center pt-3 pb-1">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
            <div className="relative shrink-0 px-5 pt-2 pb-3 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F3E8FF] text-[#7C3AED]">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#111111]">
                    Share Space
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">
                    Share with anyone
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 cursor-pointer"
                aria-label="Close share sheet"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Space Preview Card */}
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-[#FAFBFD] p-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#FFF9F3] flex items-center justify-center border border-slate-100">
                  <SpacePhoto src={space.imageUrl} alt={space.name} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-[#111111]">
                    {space.name}
                  </p>
                  <p className="text-xs font-semibold text-[#7C3AED]">
                    {space.spaceType || space.category || 'Space'}
                    {space.capacity ? ` · Up to ${space.capacity}` : ''}
                  </p>
                  <p className="text-sm font-black text-slate-900 mt-0.5">
                    From ₹{formatInr(space.fromPrice)}
                    <span className="text-xs font-normal text-slate-500"> / hour</span>
                  </p>
                </div>
              </div>

              {/* Link Input with Copy button */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  Space Link
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-1.5 focus-within:border-[#6344E7]">
                  <Link2 className="h-4 w-4 text-slate-400 ml-2 shrink-0" />
                  <input
                    type="text"
                    readOnly
                    value={url}
                    className="w-full bg-transparent text-xs font-semibold text-slate-700 outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCopyLink()}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#6344E7] hover:bg-[#5235D9] px-3 py-1.5 text-xs font-bold text-white transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Share Options Grid */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="flex flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-[#F0FDF4] p-3 text-center transition active:scale-95 hover:bg-emerald-100/60 cursor-pointer min-h-[80px]"
                >
                  <MessageCircle className="h-5 w-5 text-emerald-600 mb-1.5" />
                  <span className="text-xs font-bold text-emerald-700">WhatsApp</span>
                </button>

                {/* Copy Link */}
                <button
                  type="button"
                  onClick={() => void handleCopyLink()}
                  className="flex flex-col items-center justify-center rounded-2xl border border-blue-100 bg-[#EFF6FF] p-3 text-center transition active:scale-95 hover:bg-blue-100/60 cursor-pointer min-h-[80px]"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-blue-600 mb-1.5" />
                  ) : (
                    <Link2 className="h-5 w-5 text-blue-600 mb-1.5" />
                  )}
                  <span className="text-xs font-bold text-blue-700">
                    {copied ? 'Copied' : 'Copy Link'}
                  </span>
                </button>

                {/* More / Native Share */}
                <button
                  type="button"
                  onClick={() => void handleNativeShare()}
                  className="flex flex-col items-center justify-center rounded-2xl border border-purple-100 bg-[#FAF5FF] p-3 text-center transition active:scale-95 hover:bg-purple-100/60 cursor-pointer min-h-[80px]"
                >
                  <Sparkles className="h-5 w-5 text-[#7C3AED] mb-1.5" />
                  <span className="text-xs font-bold text-[#7C3AED]">More</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
