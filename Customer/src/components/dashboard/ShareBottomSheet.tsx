import {useState} from 'react';
import {X, Share2, Copy, Check, Gift, MessageCircle, Link2, Sparkles} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';

type ShareBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ShareBottomSheet({isOpen, onClose}: ShareBottomSheetProps) {
  const [copied, setCopied] = useState(false);
  const referralCode = 'WOOWOO-ART2026';
  const shareUrl = 'https://woowooarthouse.com/invite/WOOWOO-ART2026';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me at WooWoo Art House!',
          text: 'Use my code WOOWOO-ART2026 to get 15% OFF your first order or booking!',
          url: shareUrl,
        });
      } catch {
        // ignore
      }
    } else {
      handleCopyCode();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Bottom Sheet Panel */}
          <motion.div
            initial={{y: '100%'}}
            animate={{y: 0}}
            exit={{y: '100%'}}
            transition={{type: 'spring', damping: 26, stiffness: 240}}
            className="relative z-10 flex max-h-[90dvh] h-auto w-full max-w-lg flex-col rounded-t-[32px] bg-white shadow-2xl overflow-hidden border-t border-slate-100"
          >
            {/* Top Drag Handle */}
            <div className="flex shrink-0 justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-slate-200" />
            </div>

            {/* Header Info */}
            <div className="relative shrink-0 px-5 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Share Icon inside soft purple rounded square */}
                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[16px] bg-[#F3E8FF] text-[#9333EA]">
                  <Share2 className="h-6.5 w-6.5" strokeWidth={2} />
                </div>
                <div className="text-left">
                  <h3 className="text-[20px] font-black tracking-tight text-[#111111] leading-none">
                    Share & Earn
                  </h3>
                  <p className="mt-1.5 text-[12px] font-medium text-[#6B7280] leading-none">
                    Invite friends & earn rewards
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563] transition hover:bg-[#E5E7EB]"
                aria-label="Close sheet"
              >
                <X className="h-4.5 w-4.5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Scrollable Contents */}
            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
              {/* Rewards Banner */}
              <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#9333EA] via-[#7C3AED] to-[#4F46E5] p-5 text-white shadow-md text-left">
                <div className="absolute top-0 right-0 -mr-6 -mt-6 h-32 w-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                    <Gift className="h-3 w-3 text-amber-300" />
                    Referral Bonus
                  </span>
                </div>
                <h4 className="text-[17px] font-black leading-snug">
                  Earn ₹100 for every friend who joins!
                </h4>
                <p className="mt-1 text-[12px] font-medium text-white/90 leading-snug">
                  Your friend gets 15% OFF their first studio booking or café order.
                </p>
              </div>

              {/* Referral Code Box */}
              <div className="rounded-[20px] border border-dashed border-[#9333EA]/30 bg-[#FBF7FF] p-4 flex items-center justify-between gap-3 shadow-3xs">
                <div className="text-left">
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                    Your Referral Code
                  </p>
                  <p className="text-[16px] font-black text-[#9333EA] tracking-wide mt-0.5">
                    {referralCode}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] bg-[#9333EA] text-white text-[12px] font-bold shadow-2xs hover:bg-[#7E22CE] transition cursor-pointer shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" strokeWidth={2} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Share Options */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                {/* WhatsApp Share */}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Join me at WooWoo Art House! Use my referral code ${referralCode} to get 15% OFF: ${shareUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-[20px] p-3 text-center flex flex-col items-center justify-center min-h-[85px] bg-[#F0FDF4] border border-[#DCFCE7] shadow-3xs hover:bg-[#E8FBF0] transition"
                >
                  <MessageCircle className="h-5 w-5 text-[#16A34A] mb-1.5" strokeWidth={2.2} />
                  <span className="text-[11.5px] font-black text-[#16A34A]">WhatsApp</span>
                </a>

                {/* Copy Link */}
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="rounded-[20px] p-3 text-center flex flex-col items-center justify-center min-h-[85px] bg-[#EFF6FF] border border-[#DBEAFE] shadow-3xs hover:bg-[#E0F2FE] transition cursor-pointer"
                >
                  <Link2 className="h-5 w-5 text-[#2563EB] mb-1.5" strokeWidth={2.2} />
                  <span className="text-[11.5px] font-black text-[#2563EB]">Copy Link</span>
                </button>

                {/* More Options */}
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="rounded-[20px] p-3 text-center flex flex-col items-center justify-center min-h-[85px] bg-[#F3F4F6] border border-[#E5E7EB] shadow-3xs hover:bg-[#E5E7EB]/50 transition cursor-pointer"
                >
                  <Sparkles className="h-5 w-5 text-[#9333EA] mb-1.5" strokeWidth={2.2} />
                  <span className="text-[11.5px] font-black text-[#111111]">More</span>
                </button>
              </div>

              {/* Footer Links & Divider */}
              <div className="border-t border-slate-100 pt-4 flex items-center justify-center gap-2.5 text-[#4B5563] text-[11px] font-bold">
                <span>Terms</span>
                <span className="text-slate-200">|</span>
                <span>About</span>
                <span className="text-slate-200">|</span>
                <span>Jobs</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
