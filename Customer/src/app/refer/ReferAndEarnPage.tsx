import {useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Gift,
  MessageCircle,
  Share2,
  Users,
  Wallet,
} from 'lucide-react';
import {motion} from 'framer-motion';
import Swal from 'sweetalert2';
import {authApi} from '../../services/auth.service';
import {getErrorMessage} from '../../services/axios';
import type {ReferralDashboard} from '../../types/auth';
import {DashboardSidebar} from '../../components/dashboard/DashboardSidebar';
import {MobileBottomNav} from '../../components/dashboard/MobileBottomNav';
import {MobileHeader, TopNavbar} from '../../components/dashboard/TopNavbar';

const formatInr = (value = 0) =>
  `₹${Number(value || 0).toLocaleString('en-IN')}`;

const formatReward = (reward?: ReferralDashboard['inviteReward']) => {
  if (!reward?.enabled) return 'Invite rewards coming soon';
  if (reward.type === 'percentage') return `${reward.value}% per successful invite`;
  return `${formatInr(reward.value)} per successful invite`;
};

async function confirmShare(title: string, text: string, confirmText: string) {
  const result = await Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#111111',
    cancelButtonColor: '#9CA3AF',
    reverseButtons: true,
  });
  return result.isConfirmed;
}

export default function ReferAndEarnPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReferralDashboard | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const {data: res} = await authApi.getReferralDashboard();
        if (active) setData(res.data || null);
      } catch (error) {
        await Swal.fire({
          icon: 'error',
          title: 'Could not load referral details',
          text: getErrorMessage(error, 'Please try again'),
          confirmButtonColor: '#111111',
        });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onCopyCode = async () => {
    if (!data?.referralCode) return;
    const ok = await confirmShare(
      'Copy invite code?',
      `Share code ${data.referralCode} with friends so they can join WOOWOO.`,
      'Yes, copy code',
    );
    if (!ok) return;

    try {
      await navigator.clipboard.writeText(data.referralCode);
      await Swal.fire({
        icon: 'success',
        title: 'Code copied!',
        text: `Invite code ${data.referralCode} is ready to share.`,
        timer: 1800,
        showConfirmButton: false,
      });
    } catch {
      await Swal.fire({
        icon: 'error',
        title: 'Copy failed',
        text: 'Please copy the code manually.',
        confirmButtonColor: '#111111',
      });
    }
  };

  const onCopyLink = async () => {
    if (!data?.shareUrl) return;
    const ok = await confirmShare(
      'Copy invite link?',
      'Your friends can open this link and join with your referral code.',
      'Yes, copy link',
    );
    if (!ok) return;

    try {
      await navigator.clipboard.writeText(data.shareUrl);
      await Swal.fire({
        icon: 'success',
        title: 'Link copied!',
        text: 'Invite link is ready to paste anywhere.',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch {
      await Swal.fire({
        icon: 'error',
        title: 'Copy failed',
        text: 'Please copy the link manually.',
        confirmButtonColor: '#111111',
      });
    }
  };

  const onShareWhatsApp = async () => {
    if (!data?.shareMessage) return;
    const ok = await confirmShare(
      'Share on WhatsApp?',
      'Open WhatsApp with your invite message ready to send.',
      'Open WhatsApp',
    );
    if (!ok) return;

    const url = `https://wa.me/?text=${encodeURIComponent(data.shareMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const onNativeShare = async () => {
    if (!data) return;

    const ok = await confirmShare(
      'Share invite?',
      'Choose an app to share your WOOWOO referral invite.',
      'Continue',
    );
    if (!ok) return;

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Join WOOWOO Art House',
          text: data.shareMessage,
          url: data.shareUrl,
        });
        await Swal.fire({
          icon: 'success',
          title: 'Thanks for sharing!',
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          await Swal.fire({
            icon: 'info',
            title: 'Share cancelled',
            text: 'You can still copy your invite link instead.',
            confirmButtonColor: '#111111',
          });
        }
      }
      return;
    }

    await onCopyLink();
  };

  const content = (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-black/[0.05] bg-white text-[#111111]"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-[20px] font-bold text-[#111111]">Refer & Earn</h1>
          <p className="text-[13px] text-[#6B7280]">Invite friends and grow together</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-[24px] bg-white p-10 text-center text-[#6B7280] shadow-sm">
          Loading referral details...
        </div>
      ) : !data ? (
        <div className="rounded-[24px] bg-white p-10 text-center text-[#6B7280] shadow-sm">
          Referral details unavailable.
        </div>
      ) : (
        <>
          <motion.div
            initial={{opacity: 0, y: 10}}
            animate={{opacity: 1, y: 0}}
            className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#111111] via-[#1F2937] to-[#312E81] p-5 text-white shadow-lg"
          >
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium">
              <Gift className="h-3.5 w-3.5" />
              {data.programEnabled ? 'Program active' : 'Program paused'}
            </div>
            <h2 className="text-[24px] font-bold leading-tight">Invite friends. Earn rewards.</h2>
            <p className="mt-2 text-[13px] text-white/80">{formatReward(data.inviteReward)}</p>
            <div className="mt-5 rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-[11px] uppercase tracking-wide text-white/70">Your invite code</p>
              <p className="mt-1 font-mono text-[28px] font-bold tracking-[0.18em]">
                {data.referralCode}
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[20px] border border-black/[0.04] bg-white p-4 text-center shadow-sm">
              <Users className="mx-auto h-4 w-4 text-[#2563EB]" />
              <p className="mt-2 text-[18px] font-bold text-[#111111]">{data.stats.totalReferrals}</p>
              <p className="text-[11px] text-[#6B7280]">Referrals</p>
            </div>
            <div className="rounded-[20px] border border-black/[0.04] bg-white p-4 text-center shadow-sm">
              <Wallet className="mx-auto h-4 w-4 text-[#16A34A]" />
              <p className="mt-2 text-[18px] font-bold text-[#111111]">
                {formatInr(data.wallet.affiliateBalance)}
              </p>
              <p className="text-[11px] text-[#6B7280]">Balance</p>
            </div>
            <div className="rounded-[20px] border border-black/[0.04] bg-white p-4 text-center shadow-sm">
              <Gift className="mx-auto h-4 w-4 text-[#7C3AED]" />
              <p className="mt-2 text-[18px] font-bold text-[#111111]">
                {formatInr(data.stats.totalEarned)}
              </p>
              <p className="text-[11px] text-[#6B7280]">Earned</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-black/[0.04] bg-white p-4 shadow-sm">
            <p className="mb-3 text-[14px] font-semibold text-[#111111]">Share your invite</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onCopyCode}
                className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] px-4 py-3 text-left hover:bg-[#F9FAFB]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#2563EB]">
                  <Copy className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-[13px] font-semibold text-[#111111]">Copy code</span>
                  <span className="block text-[11px] text-[#6B7280]">Share invite code</span>
                </span>
              </button>
              <button
                type="button"
                onClick={onCopyLink}
                className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] px-4 py-3 text-left hover:bg-[#F9FAFB]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#7C3AED]">
                  <Share2 className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-[13px] font-semibold text-[#111111]">Copy link</span>
                  <span className="block text-[11px] text-[#6B7280]">Paste anywhere</span>
                </span>
              </button>
              <button
                type="button"
                onClick={onShareWhatsApp}
                className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] px-4 py-3 text-left hover:bg-[#F9FAFB]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#16A34A]">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-[13px] font-semibold text-[#111111]">WhatsApp</span>
                  <span className="block text-[11px] text-[#6B7280]">Send invite chat</span>
                </span>
              </button>
              <button
                type="button"
                onClick={onNativeShare}
                className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] px-4 py-3 text-left hover:bg-[#F9FAFB]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFEDD5] text-[#EA580C]">
                  <Share2 className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-[13px] font-semibold text-[#111111]">More apps</span>
                  <span className="block text-[11px] text-[#6B7280]">System share sheet</span>
                </span>
              </button>
            </div>
            <p className="mt-4 break-all rounded-2xl bg-[#F9FAFB] px-3 py-2 text-[11px] text-[#6B7280]">
              {data.shareUrl}
            </p>
          </div>

          <div className="rounded-[24px] border border-black/[0.04] bg-white p-4 shadow-sm">
            <p className="mb-3 text-[14px] font-semibold text-[#111111]">Recent referrals</p>
            {data.recentReferrals.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-[#6B7280]">
                No referrals yet. Share your code to get started.
              </p>
            ) : (
              <ul className="divide-y divide-[#F3F4F6]">
                {data.recentReferrals.map((item, index) => (
                  <li key={`${item.name}-${index}`} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-[13px] font-semibold text-[#111111]">{item.name}</p>
                      <p className="text-[11px] capitalize text-[#6B7280]">
                        {item.membershipType || 'none'} · {item.status || 'active'}
                      </p>
                    </div>
                    <p className="text-[11px] text-[#9CA3AF]">
                      {item.joinedAt ? new Date(item.joinedAt).toLocaleDateString('en-IN') : '—'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-center text-[12px] text-[#9CA3AF]">
            Friends can join from{' '}
            <Link to="/login" className="font-semibold text-[#2563EB]">
              Login
            </Link>{' '}
            using your invite code.
          </p>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-dvh bg-[#FAFBFD]">
      <DashboardSidebar
        mode="drawer"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="mx-auto max-w-[1440px] p-4 md:p-6">
        <div className="hidden gap-6 xl:flex">
          <DashboardSidebar mode="fixed" />
          <div className="min-w-0 flex-1 space-y-6">
            <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
            {content}
          </div>
        </div>

        <div className="xl:hidden">
          <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
          <div className="space-y-5 pb-28">{content}</div>
          <MobileBottomNav />
        </div>
      </div>
    </div>
  );
}
