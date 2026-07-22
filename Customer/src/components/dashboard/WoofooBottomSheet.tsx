import {useState} from 'react';
import {
  X,
  Palette,
  Laptop,
  Users,
  BookOpen,
  LayoutGrid,
  Heart,
  Leaf,
  Store,
} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';

function WavyCoffeeIcon({className}: {className?: string}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Wavy steam lines */}
      <path d="M6 3c.5 1-.5 2 0 3" />
      <path d="M10 3c.5 1-.5 2 0 3" />
      <path d="M14 3c.5 1-.5 2 0 3" />
      {/* Cup body */}
      <path d="M18 8H2v7a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V8Z" />
      {/* Cup handle */}
      <path d="M18 10h1a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-1" />
      {/* Saucer */}
      <path d="M1 21h18" />
    </svg>
  );
}

type WoofooBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

type CategoryId = 'all' | 'paint' | 'work' | 'chill' | 'read';

type PillItem = {
  id: CategoryId;
  label: string;
  icon: any;
};

type MomentCard = {
  id: string;
  category: CategoryId;
  title: string;
  subtitle: string;
  icon: any;
  image: string;
  height: string;
};

function ScooterIcon({className, ...props}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Back wheel */}
      <circle cx="6" cy="18" r="2" />
      {/* Front wheel */}
      <circle cx="18" cy="18" r="2" />
      {/* Chassis / Frame */}
      <path d="M6 18h4.5l2.5-4h4.5v4" />
      {/* Handlebars */}
      <path d="M17.5 14L16 8h-2" />
      {/* Seat/Box */}
      <rect x="4" y="10" width="5" height="4" rx="1" />
    </svg>
  );
}

export function WoofooBottomSheet({isOpen, onClose}: WoofooBottomSheetProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');

  const pills: PillItem[] = [
    {id: 'all', label: 'All Moments', icon: LayoutGrid},
    {id: 'paint', label: 'Sip & Paint', icon: Palette},
    {id: 'work', label: 'Eat & Work', icon: Laptop},
    {id: 'chill', label: 'Friends Chill', icon: Users},
    {id: 'read', label: 'Peace & Read', icon: BookOpen},
  ];

  const moments: MomentCard[] = [
    {
      id: '1',
      category: 'paint',
      title: 'Sip & Paint',
      subtitle: 'Create. Sip. Smile.',
      icon: Palette,
      image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=400&q=80',
      height: 'h-[230px]',
    },
    {
      id: '2',
      category: 'work',
      title: 'Eat & Work',
      subtitle: 'Fuel your ideas.',
      icon: Laptop,
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80',
      height: 'h-[110px]',
    },
    {
      id: '3',
      category: 'chill',
      title: 'Friends Chill',
      subtitle: 'Good food. Great company.',
      icon: Users,
      image: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=400&q=80',
      height: 'h-[110px]',
    },
    {
      id: '4',
      category: 'read',
      title: 'Peace & Read',
      subtitle: 'Slow down. Be present.',
      icon: BookOpen,
      image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=400&q=80',
      height: 'h-[140px]',
    },
    {
      id: '5',
      category: 'all',
      title: 'Ambience',
      subtitle: 'Where every corner inspires.',
      icon: Leaf,
      image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80',
      height: 'h-[140px]',
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
            className="relative z-10 flex max-h-[90dvh] h-auto w-full max-w-lg flex-col rounded-t-[32px] bg-white shadow-2xl overflow-hidden border-t border-slate-100"
          >
            {/* Top Drag Handle */}
            <div className="flex shrink-0 justify-center pt-3 pb-2.5">
              <div className="h-1 w-10 rounded-full bg-slate-200" />
            </div>

            {/* Close Button & Header Info */}
            <div className="relative shrink-0 px-5 pb-4 flex items-start justify-between">
              <div className="flex items-start gap-3.5">
                {/* WOOFOO Icon inside soft peach rounded square */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-[#FFF0EB] text-[#EA580C]">
                  <WavyCoffeeIcon className="h-7 w-7" />
                </div>
                <div className="text-left mt-0.5">
                  <h3 className="text-[21px] font-black tracking-tight text-slate-900 leading-none">
                    WOOFOO
                  </h3>
                  <p className="mt-2.5 text-[13px] font-bold text-slate-600 leading-none ">
                    Art Cafe     • Bites        • Beverages
                  </p>
                  <p className="mt-2.5 text-[10px] font-medium text-slate-400 leading-none">
                    Good food. Great vibes. Creative fuel.
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100/60 text-slate-500 transition hover:bg-slate-200/60"
                aria-label="Close sheet"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>

            {/* Scrollable Contents */}
            <div className="flex-1 overflow-y-auto pb-6">
              {/* Moments Made Here Title */}
              <div className="px-5 mb-5.5 text-left">
                <h4 className="text-[13.5px] font-black text-slate-900 tracking-tight leading-tight">
                  Moments Made Here
                </h4>
                <p className="mt-0.5 text-[11.5px] font-bold text-slate-500 leading-snug">
                  An  art  cafe where good food, creativity and connection come together.
                </p>
              </div>

              {/* Horizontally Scrollable Category Pills Row */}
              <div className="px-5 mb-4 flex gap-2 overflow-x-auto scrollbar-none">
                {pills.map(pill => {
                  const PillIcon = pill.icon;
                  const isActive = activeCategory === pill.id;
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setActiveCategory(pill.id)}
                      className={`shrink-0 px-3.5 py-1.5 rounded-full border text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#FFF0EB] text-[#EA580C] border-[#EA580C]'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <PillIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
                      <span>{pill.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Moments Gallery Masonry Grid */}
              <div className="px-5 mb-5 grid grid-cols-2 gap-3.5">
                {activeCategory === 'all' ? (
                  <>
                    {/* Sip & Paint */}
                    <div className="relative h-[234px] overflow-hidden rounded-[20px] border border-black/[0.05] shadow-2xs col-start-1 col-end-2 row-start-1 row-end-3">
                      <img
                        src="https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=400&q=80"
                        alt="Sip & Paint"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute left-3 bottom-3 right-3 text-white text-left">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/40 text-white bg-black/10 mb-1.5">
                          <Palette className="h-2.5 w-2.5" />
                        </div>
                        <p className="text-[10px] font-black leading-tight">Sip & Paint</p>
                        <p className="text-[7.5px] text-white/80 font-bold leading-none mt-0.5">Create. Sip. Smile.</p>
                      </div>
                    </div>

                    {/* Eat & Work */}
                    <div className="relative h-[110px] overflow-hidden rounded-[20px] border border-black/[0.05] shadow-2xs col-start-2 col-end-3 row-start-1 row-end-2">
                      <img
                        src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80"
                        alt="Eat & Work"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute left-3 bottom-3 right-3 text-white text-left">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/40 text-white bg-black/10 mb-1.5">
                          <Laptop className="h-2.5 w-2.5" />
                        </div>
                        <p className="text-[10px] font-black leading-tight">Eat & Work</p>
                        <p className="text-[7.5px] text-white/80 font-bold leading-none mt-0.5">Fuel your ideas.</p>
                      </div>
                    </div>

                    {/* Friends Chill */}
                    <div className="relative h-[110px] overflow-hidden rounded-[20px] border border-black/[0.05] shadow-2xs col-start-2 col-end-3 row-start-2 row-end-3">
                      <img
                        src="https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=400&q=80"
                        alt="Friends Chill"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute left-3 bottom-3 right-3 text-white text-left">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/40 text-white bg-black/10 mb-1.5">
                          <Users className="h-2.5 w-2.5" />
                        </div>
                        <p className="text-[10px] font-black leading-tight">Friends Chill</p>
                        <p className="text-[7.5px] text-white/80 font-bold leading-none mt-0.5">Good food. Great company.</p>
                      </div>
                    </div>

                    {/* Peace & Read */}
                    <div className="relative h-[140px] overflow-hidden rounded-[20px] border border-black/[0.05] shadow-2xs col-start-1 col-end-2 row-start-3 row-end-4">
                      <img
                        src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=400&q=80"
                        alt="Peace & Read"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute left-3 bottom-3 right-3 text-white text-left">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/40 text-white bg-black/10 mb-1.5">
                          <BookOpen className="h-2.5 w-2.5" />
                        </div>
                        <p className="text-[10px] font-black leading-tight">Peace & Read</p>
                        <p className="text-[7.5px] text-white/80 font-bold leading-none mt-0.5">Slow down. Be present.</p>
                      </div>
                    </div>

                    {/* Ambience */}
                    <div className="relative h-[140px] overflow-hidden rounded-[20px] border border-black/[0.05] shadow-2xs col-start-2 col-end-3 row-start-3 row-end-4">
                      <img
                        src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80"
                        alt="Ambience"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute left-3 bottom-3 right-3 text-white text-left">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/40 text-white bg-black/10 mb-1.5">
                          <Leaf className="h-2.5 w-2.5" />
                        </div>
                        <p className="text-[10px] font-black leading-tight">Ambience</p>
                        <p className="text-[7.5px] text-white/80 font-bold leading-none mt-0.5">Where every corner inspires.</p>
                      </div>
                    </div>
                  </>
                ) : (
                  moments
                    .filter(m => m.category === activeCategory)
                    .map(card => {
                      const CardIcon = card.icon;
                      return (
                        <div
                          key={card.id}
                          className="relative h-[200px] overflow-hidden rounded-[20px] border border-black/[0.05] shadow-2xs col-span-2"
                        >
                          <img
                            src={card.image}
                            alt={card.title}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute left-3 bottom-3 right-3 text-white text-left">
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/40 text-white bg-black/10 mb-1.5">
                              <CardIcon className="h-2.5 w-2.5" />
                            </div>
                            <p className="text-[11px] font-black leading-tight">{card.title}</p>
                            <p className="text-[8px] text-white/80 font-bold leading-none mt-0.5">{card.subtitle}</p>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Brand Message Banner */}
              <div className="mx-5 p-4 rounded-[20px] bg-[#FFF0EB] border border-[#FFEDD5] flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#EA580C] shadow-3xs">
                    <Heart className="h-4.5 w-4.5" strokeWidth={2} />
                  </div>
                  <div className="text-[11.5px] font-black text-[#111111] leading-tight text-left">
                    <div>More than a café,</div>
                    <div className="text-[#EA580C] mt-0.5">it's a space to create memories.</div>
                  </div>
                </div>
                {/* Cute coffee outline SVG on the right */}
                <svg className="h-10 w-10 text-[#EA580C]/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h1a4 4 0 110 8h-1M2 8h15v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 3v2M10 3v2M14 3v2" />
                </svg>
              </div>

            </div>

            {/* Bottom sticky CTA Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex gap-3 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {/* Visit Today Button */}
              <button
                type="button"
                className="flex-1 py-3 px-3 rounded-[16px] border border-[#EA580C] text-[#EA580C] text-[14px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#FFF8F2] transition-colors cursor-pointer"
              >
                <Store className="h-4.5 w-4.5" strokeWidth={2.5} />
                <span>Visit Today</span>
              </button>

              {/* Order Online Button */}
              <button
                type="button"
                className="flex-1 py-3 px-3 rounded-[16px] bg-[#EA580C] text-white text-[14px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#D97706] transition-colors shadow-xs cursor-pointer"
              >
                <ScooterIcon className="h-4.5 w-4.5" strokeWidth={2.5} />
                <span>Order Online</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
