import {useState, useEffect} from 'react';
import {
  X,
  ShoppingBag,
  Users,
  Play,
  ArrowRight,
  MessageSquare,
  Sparkles,
  IndianRupee,
  Target,
  Store,
  TrendingUp,
} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';

type ProgramsBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'csp' | 'hap';
};

type TabId = 'csp' | 'hap';

type GalleryItem = {
  id: string;
  type: 'video' | 'image' | 'custom';
  image?: string;
  tag: string;
  badge?: string;
  title?: string;
  hasPlayButton?: boolean;
  customComponent?: () => React.ReactNode;
};

// Custom SVG illustrations for high-fidelity rendering
function CspIllustration() {
  return (
    <div className="relative h-20 w-24 sm:h-24 sm:w-28 shrink-0 flex items-center justify-center bg-transparent overflow-visible">
      {/* Easel/Art board SVG */}
      <svg className="w-12 h-12 text-[#EA580C] relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-.813-5.096M9 21h6m-1.813-5.096L15 21m0 0l.813-5.096M3 14.25V6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v7.5A2.25 2.25 0 0118.75 16.5H5.25A2.25 2.25 0 013 14.25z" />
      </svg>
      {/* Tote bag overlay */}
      <div className="absolute bottom-1 right-1 w-9 h-11 bg-white border border-[#FFEDD5] rounded-lg shadow-2xs flex flex-col items-center justify-between p-1 z-20">
        <div className="w-4 h-2.5 border-2 border-slate-300 border-b-0 rounded-t-full" />
        <div className="text-[5px] text-[#EA580C] font-black leading-none">WOOWOO</div>
        <div className="text-[4px] text-slate-400 font-bold leading-none">ART HOUSE</div>
      </div>
      {/* Palette overlay */}
      <div className="absolute top-1 left-2 w-7 h-7 bg-amber-50 rounded-full border border-amber-200 shadow-3xs p-1 flex flex-wrap gap-0.5 justify-center items-center z-20">
        <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
        <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
      </div>
    </div>
  );
}

function HapIllustration() {
  return (
    <div className="relative h-20 w-24 sm:h-24 sm:w-28 shrink-0 flex items-center justify-center bg-transparent overflow-visible">
      {/* Mega Phone SVG in Purple */}
      <svg className="w-12 h-12 text-[#7C3AED] relative z-10 transform -rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
      </svg>
      {/* Floating Coins & Profiles */}
      <div className="absolute top-0.5 right-1 bg-yellow-400 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-black shadow-xs z-20">₹</div>
      <div className="absolute bottom-1 right-2 bg-yellow-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] font-black shadow-xs z-20">₹</div>
      {/* A small mock phone card */}
      <div className="absolute -left-1 bottom-1 w-7 h-11 bg-white border border-[#EDE9FE] rounded-md shadow-2xs rotate-12 flex flex-col justify-between p-0.5 z-0">
        <div className="h-1 w-4 bg-[#7C3AED]/20 rounded-xs mx-auto" />
        <div className="h-4 w-5 bg-[#7C3AED]/10 rounded-xs mx-auto flex items-center justify-center text-[4px] text-[#7C3AED] font-black">Woo</div>
        <div className="flex justify-around">
          <div className="w-1.5 h-1 bg-yellow-400 rounded-full" />
          <div className="w-1.5 h-1 bg-yellow-400 rounded-full" />
        </div>
      </div>
      {/* Connected user circles */}
      <div className="absolute top-0 left-6 w-5 h-5 rounded-full border border-white bg-slate-200 shadow-2xs overflow-hidden">
        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=60&q=80" className="h-full w-full object-cover" />
      </div>
      <div className="absolute bottom-1 right-0 w-5 h-5 rounded-full border border-white bg-slate-200 shadow-2xs overflow-hidden">
        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=60&q=80" className="h-full w-full object-cover" />
      </div>
    </div>
  );
}

export function ProgramsBottomSheet({isOpen, onClose, initialTab = 'csp'}: ProgramsBottomSheetProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // Sync active tab with initialTab prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const cspGallery: GalleryItem[] = [
    {
      id: 'csp-vid-1',
      type: 'video',
      image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=400&q=80',
      tag: 'VIDEO',
      title: 'Creative sailors',
      hasPlayButton: true,
    },
    {
      id: 'csp-img-1',
      type: 'image',
      image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=400&q=80',
      tag: 'IMAGE',
    },
    {
      id: 'csp-vid-2',
      type: 'video',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80',
      tag: 'VIDEO',
      hasPlayButton: true,
    },
    {
      id: 'csp-img-2',
      type: 'image',
      image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80',
      tag: 'IMAGE',
    },
    {
      id: 'csp-img-3',
      type: 'image',
      image: 'https://images.unsplash.com/photo-1579783928621-7a13d66a62d1?auto=format&fit=crop&w=400&q=80',
      tag: 'IMAGE',
      badge: '1/8',
    },
  ];

  const hapGallery: GalleryItem[] = [
    {
      id: 'hap-vid-1',
      type: 'video',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      tag: 'VIDEO',
      title: 'Invite Friends. Earn Unlimited!',
      hasPlayButton: true,
    },
    {
      id: 'hap-custom-1',
      type: 'custom',
      tag: 'IMAGE',
      customComponent: () => (
        <div className="relative h-full w-full bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] p-2.5 flex flex-col justify-between text-left text-white">
          <div className="space-y-0.5">
            <p className="text-[8px] font-black uppercase tracking-wider text-purple-200">Your Network</p>
            <p className="text-[10px] font-black leading-tight text-white">Your Earnings</p>
          </div>
          <div className="flex items-end gap-0.5 h-12 mt-1 justify-around">
            <div className="w-2 bg-purple-300/30 rounded-t-xs h-[25%]" />
            <div className="w-2 bg-purple-300/40 rounded-t-xs h-[45%]" />
            <div className="w-2 bg-purple-300/50 rounded-t-xs h-[60%]" />
            <div className="w-2 bg-purple-300/65 rounded-t-xs h-[75%]" />
            <div className="w-2 bg-white rounded-t-xs h-[95%]" />
          </div>
          <p className="text-[7.5px] font-bold text-purple-100 leading-snug">
            Every action. Every time. You earn!
          </p>
        </div>
      ),
    },
    {
      id: 'hap-vid-2',
      type: 'video',
      image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
      tag: 'VIDEO',
      title: 'Monetize what you already have!',
      hasPlayButton: true,
    },
    {
      id: 'hap-custom-2',
      type: 'custom',
      tag: 'IMAGE',
      customComponent: () => (
        <div className="relative h-full w-full bg-white p-2 flex flex-col justify-between text-left border border-slate-100">
          <div className="flex justify-between items-center">
            <span className="text-[7px] font-black text-slate-800">Earnings Overview</span>
            <span className="text-[5px] font-bold text-slate-400 bg-slate-50 px-1 py-0.25 rounded-xs">This Month</span>
          </div>
          <div className="mt-0.5">
            <span className="text-[10px] font-black text-slate-900 leading-none">₹2,45,800</span>
            <p className="text-[5px] font-bold text-slate-400 leading-none">Total Earnings</p>
          </div>
          <div className="space-y-0.75 mt-0.5 text-[5.5px]">
            <div className="flex justify-between items-center leading-none">
              <div className="flex items-center gap-0.5 min-w-0">
                <div className="w-1 h-1 rounded-full bg-purple-500 shrink-0" />
                <span className="text-slate-500 truncate">Referrals</span>
              </div>
              <span className="font-extrabold text-slate-800">₹1.25L</span>
            </div>
            <div className="flex justify-between items-center leading-none">
              <div className="flex items-center gap-0.5 min-w-0">
                <div className="w-1 h-1 rounded-full bg-[#EA580C] shrink-0" />
                <span className="text-slate-500 truncate">Memberships</span>
              </div>
              <span className="font-extrabold text-slate-800">₹70.2K</span>
            </div>
            <div className="flex justify-between items-center leading-none">
              <div className="flex items-center gap-0.5 min-w-0">
                <div className="w-1 h-1 rounded-full bg-green-500 shrink-0" />
                <span className="text-slate-500 truncate">Store Orders</span>
              </div>
              <span className="font-extrabold text-slate-800">₹32.4K</span>
            </div>
            <div className="flex justify-between items-center leading-none">
              <div className="flex items-center gap-0.5 min-w-0">
                <div className="w-1 h-1 rounded-full bg-blue-500 shrink-0" />
                <span className="text-slate-500 truncate">Events & Serv</span>
              </div>
              <span className="font-extrabold text-slate-800">₹17.6K</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'hap-img-3',
      type: 'image',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80',
      tag: 'IMAGE',
      badge: '1/8',
      title: 'Be a part of a growing creative family!',
    },
  ];

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
            className="relative z-10 flex max-h-[95dvh] h-auto w-full max-w-lg flex-col rounded-t-[32px] bg-white shadow-2xl overflow-hidden border-t border-slate-100"
          >
            {/* Top Drag Handle */}
            <div className="flex shrink-0 justify-center py-3">
              <div className="h-1.5 w-12 rounded-full bg-[#E5E7EB]" />
            </div>

            {/* Header Info */}
            <div className="relative shrink-0 px-5 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Dynamic color syncing on header icon */}
                <div className={`flex h-14 w-14 items-center justify-center rounded-[16px] transition-all duration-350 ${
                  activeTab === 'csp' ? 'bg-[#FFF3EB] text-[#EA580C]' : 'bg-[#F5F3FF] text-[#7C3AED]'
                }`}>
                  <Sparkles className="h-7 w-7" strokeWidth={2} />
                </div>
                <div className="text-left">
                  <h3 className="text-[19px] font-extrabold tracking-tight text-[#111111] leading-tight">
                    Our Programs
                  </h3>
                  <p className="mt-0.5 text-[12px] font-bold text-[#6B7280]">
                    Grow, collaborate & earn with us
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563] transition hover:bg-[#E5E7EB] cursor-pointer"
                aria-label="Close sheet"
              >
                <X className="h-4.5 w-4.5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Custom Interactive Program Tabs (CSP / HAP) */}
            <div className="shrink-0 px-5 mb-4 grid grid-cols-2 gap-3">
              {/* CSP Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('csp')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                  activeTab === 'csp'
                    ? 'border-[#EA580C]/40 bg-[#FFF8F2] text-[#EA580C] shadow-[0_4px_12px_rgba(234,88,12,0.06)]'
                    : 'border-slate-100 bg-[#FAFAFA] text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
                  activeTab === 'csp' ? 'bg-[#FFEDD5] text-[#EA580C]' : 'bg-[#E5E7EB] text-slate-500'
                }`}>
                  <ShoppingBag className="h-4 w-4" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11.5px] font-black leading-none">CSP</div>
                  <div className={`mt-0.5 truncate text-[9px] font-bold ${activeTab === 'csp' ? 'text-[#C2410C]' : 'text-slate-400'}`}>Creative sailor Program</div>
                </div>
              </button>

              {/* HAP Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('hap')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                  activeTab === 'hap'
                    ? 'border-[#7C3AED]/40 bg-[#F5F3FF] text-[#7C3AED] shadow-[0_4px_12px_rgba(124,58,237,0.06)]'
                    : 'border-slate-100 bg-[#FAFAFA] text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
                  activeTab === 'hap' ? 'bg-[#EDE9FE] text-[#7C3AED]' : 'bg-[#E5E7EB] text-slate-500'
                }`}>
                  <Users className="h-4 w-4" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11.5px] font-black leading-none">HAP</div>
                  <div className={`mt-0.5 truncate text-[9px] font-bold ${activeTab === 'hap' ? 'text-[#6D28D9]' : 'text-slate-400'}`}>House Affiliate Program</div>
                </div>
              </button>
            </div>

            {/* Scrollable Contents */}
            <div className="flex-1 overflow-y-auto pb-6">
              
              {/* Horizontal Gallery */}
              <div className="px-5 mb-1.5 flex gap-3 overflow-x-auto scrollbar-none py-1">
                {(activeTab === 'csp' ? cspGallery : hapGallery).map((item) => {
                  if (item.type === 'custom' && item.customComponent) {
                    return (
                      <div
                        key={item.id}
                        className="relative h-[160px] w-[110px] sm:h-[180px] sm:w-[120px] shrink-0 overflow-hidden rounded-[20px] border border-black/[0.05] shadow-xs"
                      >
                        {item.customComponent()}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      className="relative h-[160px] w-[110px] sm:h-[180px] sm:w-[120px] shrink-0 overflow-hidden rounded-[20px] border border-black/[0.05] shadow-xs"
                    >
                      <img
                        src={item.image}
                        alt={item.tag}
                        className="h-full w-full object-cover"
                      />
                      
                      {/* Media Type Badge */}
                      <div className="absolute left-2.5 top-2.5 rounded-[5px] bg-black/60 px-1.5 py-0.5 text-[7.5px] font-black text-white tracking-wider">
                        {item.tag}
                      </div>

                      {/* Pagination or Custom Top Right Badge */}
                      {item.badge && (
                        <div className="absolute right-2.5 top-2.5 rounded-[5px] bg-black/60 px-1.5 py-0.5 text-[7.5px] font-black text-white tracking-wider">
                          {item.badge}
                        </div>
                      )}

                      {/* Play Button Overlay */}
                      {item.hasPlayButton && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/30 text-white border border-white/40 shadow-sm backdrop-blur-xs">
                            <Play className="h-3 w-3 fill-white text-white ml-0.5" />
                          </div>
                        </div>
                      )}

                      {/* Footer text title (e.g. Invite Friends. Earn Unlimited!) */}
                      {item.title && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-2.5 text-left">
                          <p className="text-[10px] font-extrabold text-white tracking-wide leading-tight">
                            {item.title}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination Dots */}
              <div className="flex justify-center gap-1.5 mt-2 mb-4">
                {[0, 1, 2, 3, 4].map(idx => (
                  <span
                    key={idx}
                    className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                      idx === 0 
                        ? (activeTab === 'csp' ? 'bg-[#EA580C] w-3' : 'bg-[#7C3AED] w-3') 
                        : 'bg-[#E5E7EB]'
                    }`}
                  />
                ))}
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-3 gap-2.5 px-5 mb-4">
                {activeTab === 'csp' ? (
                  <>
                    {/* Stat 1 */}
                    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#FFF8F2] border border-[#FFEDD5] text-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF0EB] text-[#EA580C] mb-2">
                        <Users className="h-4.5 w-4.5" strokeWidth={2.25} />
                      </div>
                      <div className="text-[13px] font-black text-slate-900 leading-none">50+</div>
                      <div className="mt-1 text-[8.5px] font-extrabold text-[#7C2D12] leading-tight">Creative sailors</div>
                    </div>
                    {/* Stat 2 */}
                    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] text-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DCFCE7] text-[#16A34A] mb-2">
                        <IndianRupee className="h-4.5 w-4.5" strokeWidth={2.25} />
                      </div>
                      <div className="text-[13px] font-black text-slate-900 leading-none">₹25 Lakhs+</div>
                      <div className="mt-1 text-[8.5px] font-extrabold text-[#14532D] leading-tight">Revenue Gen</div>
                    </div>
                    {/* Stat 3 */}
                    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#EFF6FF] border border-[#DBEAFE] text-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2563EB] mb-2">
                        <Target className="h-4.5 w-4.5" strokeWidth={2.25} />
                      </div>
                      <div className="text-[13px] font-black text-slate-900 leading-none">5K+</div>
                      <div className="mt-1 text-[8.5px] font-extrabold text-[#1E3A8A] leading-tight">Customer Leads</div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Stat 1 */}
                    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] text-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EDE9FE] text-[#7C3AED] mb-2">
                        <Users className="h-4.5 w-4.5" strokeWidth={2.25} />
                      </div>
                      <div className="text-[13px] font-black text-slate-900 leading-none">50+</div>
                      <div className="mt-1 text-[8.5px] font-extrabold text-[#4C1D95] leading-tight">Active Affiliates</div>
                      <div className="mt-1 text-[7.5px] font-bold text-slate-400 leading-none">Growing every day</div>
                    </div>
                    {/* Stat 2 */}
                    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] text-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DCFCE7] text-[#16A34A] mb-2">
                        <IndianRupee className="h-4.5 w-4.5" strokeWidth={2.25} />
                      </div>
                      <div className="text-[13px] font-black text-slate-900 leading-none">₹25 Lakhs+</div>
                      <div className="mt-1 text-[8.5px] font-extrabold text-[#14532D] leading-tight">Commission Gen</div>
                      <div className="mt-1 text-[7.5px] font-bold text-slate-400 leading-none">From affiliate earnings</div>
                    </div>
                    {/* Stat 3 */}
                    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#EFF6FF] border border-[#DBEAFE] text-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2563EB] mb-2">
                        <Target className="h-4.5 w-4.5" strokeWidth={2.25} />
                      </div>
                      <div className="text-[13px] font-black text-slate-900 leading-none">5K+</div>
                      <div className="mt-1 text-[8.5px] font-extrabold text-[#1E3A8A] leading-tight">Leads Driven</div>
                      <div className="mt-1 text-[7.5px] font-bold text-slate-400 leading-none">By our affiliates</div>
                    </div>
                  </>
                )}
              </div>

              {/* Main Detailed Info Card */}
              <div className="mx-5 p-4 rounded-[24px] border bg-[#FAFBFD] relative overflow-hidden text-left shadow-2xs border-slate-100">
                
                {/* Info Card Content */}
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {/* Number Badge */}
                      <span className={`inline-flex items-center justify-center text-[11px] font-black h-5 w-5 rounded-md leading-none ${
                        activeTab === 'csp' ? 'bg-[#EA580C] text-white' : 'bg-[#7C3AED] text-white'
                      }`}>
                        {activeTab === 'csp' ? '01' : '02'}
                      </span>
                      <h4 className="text-[15px] font-black text-slate-900 leading-none">
                        {activeTab === 'csp' ? 'Creative sailor Program' : 'House Affiliate Program'}
                      </h4>
                    </div>

                    <p className="mt-3.5 text-[11.5px] font-bold text-slate-500 leading-relaxed max-w-[80%] md:max-w-[75%]">
                      {activeTab === 'csp' 
                        ? 'A zero-cost opportunity for creative professionals and small businesses to sell their products directly at WOO WOO Art House.'
                        : 'Invite, engage & earn! Promote WOO WOO Art House and earn unlimited commission on every activity.'}
                    </p>
                  </div>

                  {/* Conditionally Render Custom Illustrations */}
                  {activeTab === 'csp' ? <CspIllustration /> : <HapIllustration />}
                </div>

                {/* Features Strip */}
                <div className="border-t border-slate-100 pt-3.5 flex justify-between items-center gap-2">
                  {activeTab === 'csp' ? (
                    <>
                      {/* Feature 1 */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-center">
                        <div className="h-7 w-7 rounded-full bg-[#EA580C] text-white flex items-center justify-center shrink-0">
                          <IndianRupee className="h-3.5 w-3.5" strokeWidth={2.25} />
                        </div>
                        <span className="text-[10px] font-black text-slate-700 leading-none truncate">Zero Investment</span>
                      </div>
                      
                      {/* Separator */}
                      <div className="h-4 w-[1px] bg-slate-100 shrink-0" />

                      {/* Feature 2 */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-center">
                        <div className="h-7 w-7 rounded-full bg-[#EA580C] text-white flex items-center justify-center shrink-0">
                          <Store className="h-3.5 w-3.5" strokeWidth={2.25} />
                        </div>
                        <span className="text-[10px] font-black text-slate-700 leading-none truncate">Zero Rent</span>
                      </div>

                      {/* Separator */}
                      <div className="h-4 w-[1px] bg-slate-100 shrink-0" />

                      {/* Feature 3 */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-center">
                        <div className="h-7 w-7 rounded-full bg-[#EA580C] text-white flex items-center justify-center shrink-0">
                          <ShoppingBag className="h-3.5 w-3.5" strokeWidth={2.25} />
                        </div>
                        <span className="text-[10px] font-black text-slate-700 leading-none truncate">Sell Direct</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Feature 1 */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-center">
                        <div className="h-7 w-7 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shrink-0">
                          <IndianRupee className="h-3.5 w-3.5" strokeWidth={2.25} />
                        </div>
                        <span className="text-[10px] font-black text-slate-700 leading-none truncate">Zero Investment</span>
                      </div>

                      {/* Separator */}
                      <div className="h-4 w-[1px] bg-slate-100 shrink-0" />

                      {/* Feature 2 */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-center">
                        <div className="h-7 w-7 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shrink-0">
                          <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.25} />
                        </div>
                        <span className="text-[10px] font-black text-slate-700 leading-none truncate">Earn Unlimited</span>
                      </div>

                      {/* Separator */}
                      <div className="h-4 w-[1px] bg-slate-100 shrink-0" />

                      {/* Feature 3 */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-center">
                        <div className="h-7 w-7 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shrink-0">
                          <Users className="h-3.5 w-3.5" strokeWidth={2.25} />
                        </div>
                        <span className="text-[10px] font-black text-slate-700 leading-none truncate">Monetize Network</span>
                      </div>
                    </>
                  )}
                </div>

              </div>

            </div>

            {/* Sticky Bottom Actions */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex gap-3 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {/* Query More Button */}
              <button
                type="button"
                className={`flex-1 py-3 px-3 rounded-[16px] border text-[14px] font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'csp'
                    ? 'border-[#EA580C] text-[#EA580C] hover:bg-[#FFF8F2]'
                    : 'border-[#7C3AED] text-[#7C3AED] hover:bg-[#F5F3FF]'
                }`}
              >
                <MessageSquare className="h-4.5 w-4.5" strokeWidth={2.5} />
                <span>Query More</span>
              </button>

              {/* Join Now Button */}
              <button
                type="button"
                className={`flex-1 py-3 px-3 rounded-[16px] text-white text-[14px] font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  activeTab === 'csp'
                    ? 'bg-[#EA580C] hover:bg-[#D97706]'
                    : 'bg-[#7C3AED] hover:bg-[#6D28D9]'
                }`}
              >
                <span>Join Now</span>
                <ArrowRight className="h-4.5 w-4.5" strokeWidth={2.5} />
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
