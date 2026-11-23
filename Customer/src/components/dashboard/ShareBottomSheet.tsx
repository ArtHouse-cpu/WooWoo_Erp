import { useState, useEffect } from 'react';
import { X, Share2, Copy, Check, Gift, MessageCircle, Link2, Sparkles, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export type ShareBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  referralCode?: string;
  shareUrl?: string;
  title?: string;
  subtitle?: string;
  rewardTitle?: string;
  rewardDescription?: string;
  discountBadge?: string;
};

export function ShareBottomSheet({
  isOpen,
  onClose,
  referralCode = 'WOOWOO10',
  shareUrl,
  title = 'Share & Earn',
  subtitle = 'Invite friends & earn rewards',
  rewardTitle = 'Earn rewards with every referral!',
  rewardDescription = 'Give friends 10% OFF on all activities, passes & orders.',
  discountBadge = '10% OFF Discount',
}: ShareBottomSheetProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const activeReferralCode = referralCode || 'WOOWOO10';
  const activeShareUrl = shareUrl || `https://woowoo.in?ref=${activeReferralCode}`;
  const shareDisplayUrl = activeShareUrl.replace(/^https?:\/\//, '');

  const shareText = `Join me at WooWoo Art House! Use my referral code ${activeReferralCode} to get 10% OFF on all activities, passes & orders:\n${activeShareUrl}`;

  // Handle ESC key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(activeReferralCode);
      setCopiedCode(true);
      toast.success('Referral code copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error('Failed to copy referral code');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(activeShareUrl);
      setCopiedLink(true);
      toast.success('Referral link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Failed to copy referral link');
    }
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTelegramShare = () => {
    const tgText = `Join me at WooWoo Art House! Use code ${activeReferralCode} for 10% OFF!`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(activeShareUrl)}&text=${encodeURIComponent(tgText)}`;
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Join WooWoo Art House (10% OFF)',
          text: `Use my referral code ${activeReferralCode} to get 10% OFF at WooWoo Art House!`,
          url: activeShareUrl,
        });
      } catch {
        // User closed or cancelled share sheet
      }
    } else {
      void handleCopyLink();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Bottom Sheet / Centered Modal Panel */}
          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative z-10 flex max-h-[90dvh] h-auto w-full max-w-md sm:max-w-lg flex-col rounded-t-[32px] sm:rounded-[28px] bg-white shadow-2xl overflow-hidden border-t sm:border border-slate-100 text-left"
            role="dialog"
            aria-modal="true"
          >
            {/* Top Drag Handle (visible on mobile) */}
            <div className="flex shrink-0 justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            {/* Header Info */}
            <div className="relative shrink-0 px-5 pt-3 pb-3 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-700 shadow-2xs">
                  <Share2 className="h-5.5 w-5.5" strokeWidth={2.2} />
                </div>
                <div className="text-left">
                  <h3 className="text-[18px] sm:text-[20px] font-black tracking-tight text-slate-900 leading-none">
                    {title}
                  </h3>
                  <p className="mt-1 text-[11px] sm:text-[12px] font-semibold text-slate-500 leading-none">
                    {subtitle}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
                aria-label="Close share sheet"
              >
                <X className="h-4.5 w-4.5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Scrollable Contents */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">
              {/* Rewards Banner */}
              <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#7C3AED] via-[#6366F1] to-[#4F46E5] p-4 sm:p-5 text-white shadow-md text-left">
                <div className="absolute top-0 right-0 -mr-6 -mt-6 h-32 w-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                    <Gift className="h-3 w-3 text-amber-300" />
                    {discountBadge}
                  </span>
                </div>
                <h4 className="text-[16px] sm:text-[17px] font-black leading-snug">
                  {rewardTitle}
                </h4>
                <p className="mt-1 text-[11.5px] sm:text-[12px] font-medium text-white/90 leading-snug">
                  {rewardDescription}
                </p>
              </div>

              {/* Referral Code Box */}
              <div className="rounded-[18px] border border-dashed border-amber-300 bg-amber-50/60 p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-3xs">
                <div className="text-left min-w-0">
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                    Referral Code
                  </p>
                  <p className="text-[16px] sm:text-[17px] font-mono font-black text-slate-900 tracking-wider mt-0.5 truncate select-all">
                    {activeReferralCode}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-bold shadow-2xs transition active:scale-95 cursor-pointer shrink-0"
                >
                  {copiedCode ? (
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

              {/* Referral Link Box */}
              <div className="rounded-[18px] border border-dashed border-blue-200 bg-blue-50/50 p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-3xs">
                <div className="text-left min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                    Referral Link
                  </p>
                  <p className="text-[12px] sm:text-[13px] font-medium text-slate-700 mt-0.5 truncate select-all">
                    {shareDisplayUrl}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold shadow-2xs transition active:scale-95 cursor-pointer shrink-0"
                >
                  {copiedLink ? (
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
              <div className="pt-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-left mb-2.5">
                  Quick Share
                </p>
                <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                  {/* WhatsApp */}
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="flex flex-col items-center justify-center rounded-[18px] p-2.5 sm:p-3 text-center min-h-[82px] bg-[#F0FDF4] border border-[#DCFCE7] shadow-3xs hover:bg-[#DCFCE7]/60 active:scale-95 transition cursor-pointer"
                  >
                    <MessageCircle className="h-5.5 w-5.5 text-[#16A34A] mb-1.5" strokeWidth={2.2} />
                    <span className="text-[11px] font-black text-[#16A34A]">WhatsApp</span>
                  </button>

                  {/* Telegram */}
                  <button
                    type="button"
                    onClick={handleTelegramShare}
                    className="flex flex-col items-center justify-center rounded-[18px] p-2.5 sm:p-3 text-center min-h-[82px] bg-[#F0F9FF] border border-[#E0F2FE] shadow-3xs hover:bg-[#E0F2FE]/70 active:scale-95 transition cursor-pointer"
                  >
                    <Send className="h-5.5 w-5.5 text-[#0284C7] mb-1.5" strokeWidth={2.2} />
                    <span className="text-[11px] font-black text-[#0284C7]">Telegram</span>
                  </button>

                  {/* Copy Link */}
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex flex-col items-center justify-center rounded-[18px] p-2.5 sm:p-3 text-center min-h-[82px] bg-[#EFF6FF] border border-[#DBEAFE] shadow-3xs hover:bg-[#DBEAFE]/70 active:scale-95 transition cursor-pointer"
                  >
                    {copiedLink ? (
                      <Check className="h-5.5 w-5.5 text-[#2563EB] mb-1.5" strokeWidth={2.5} />
                    ) : (
                      <Link2 className="h-5.5 w-5.5 text-[#2563EB] mb-1.5" strokeWidth={2.2} />
                    )}
                    <span className="text-[11px] font-black text-[#2563EB]">
                      {copiedLink ? 'Copied' : 'Copy'}
                    </span>
                  </button>

                  {/* More / System Share */}
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="flex flex-col items-center justify-center rounded-[18px] p-2.5 sm:p-3 text-center min-h-[82px] bg-[#FAF5FF] border border-[#F3E8FF] shadow-3xs hover:bg-[#F3E8FF]/80 active:scale-95 transition cursor-pointer"
                  >
                    <Sparkles className="h-5.5 w-5.5 text-[#9333EA] mb-1.5" strokeWidth={2.2} />
                    <span className="text-[11px] font-black text-[#9333EA]">More</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
