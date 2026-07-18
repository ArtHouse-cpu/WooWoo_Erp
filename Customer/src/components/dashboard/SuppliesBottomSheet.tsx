import {useState} from 'react';
import {
  X,
  ShoppingBag,
  Play,
  Heart,
  Tag,
  Grid,
  ShieldCheck,
  Truck,
  RotateCcw,
  Lock,
  ShoppingCart,
  Store,
} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';

type SuppliesBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

type TabId = 'most-loved' | 'reviews' | 'new-arrivals';

export function SuppliesBottomSheet({isOpen, onClose}: SuppliesBottomSheetProps) {
  const [activeTab, setActiveTab] = useState<TabId>('most-loved');
  const [activeDot, setActiveDot] = useState(0);

  const tabs = [
    {id: 'most-loved' as TabId, label: 'Most Loved'},
    {id: 'reviews' as TabId, label: 'Reviews'},
    {id: 'new-arrivals' as TabId, label: 'New Arrivals'},
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
            <div className="flex shrink-0 justify-center py-3">
              <div className="h-1.5 w-12 rounded-full bg-[#E5E7EB]" />
            </div>

            {/* Close Button & Header Info */}
            <div className="relative shrink-0 px-5 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Supplies Icon inside soft lavender rounded square */}
                <div className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#F3E8FF] text-[#7C3AED]">
                  <ShoppingBag className="h-7 w-7" strokeWidth={2} />
                </div>
                <div className="text-left">
                  <h3 className="text-[19px] font-extrabold tracking-tight text-[#111111] leading-tight">
                    Supplies
                  </h3>
                  <p className="mt-0.5 text-[12px] font-bold text-[#6B7280]">
                    Art materials & more
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563] transition hover:bg-[#E5E7EB]"
                aria-label="Close sheet"
              >
                <X className="h-4.5 w-4.5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Interactive Category Tabs */}
            <div className="shrink-0 px-5 mb-4 flex gap-2.5 overflow-x-auto scrollbar-none">
              {tabs.map(tab => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 px-[18px] py-1.5 rounded-full border text-[13px] font-extrabold transition-all duration-200 ${
                      active
                        ? 'border-[#EA580C] bg-[#FFF8F2] text-[#EA580C]'
                        : 'border-slate-200 text-[#6B7280] hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Scrollable Contents */}
            <div className="flex-1 overflow-y-auto pb-6">
              {activeTab === 'most-loved' ? (
                <>
                  {/* Modern Masonry-style Grid */}
                  <div className="px-5 mb-4">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Left Large Card */}
                      <div className="relative h-[255px] overflow-hidden rounded-[20px] border border-black/[0.05] shadow-xs">
                        <img
                          src="https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=600&q=80"
                          alt="Creative supplies"
                          className="h-full w-full object-cover"
                        />
                        {/* Watch Video Tag */}
                        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-[6px] bg-black/60 px-2 py-0.75 text-[9px] font-extrabold text-white">
                          <Play className="h-2 w-2 fill-white text-white" />
                          <span>Watch Video</span>
                        </div>
                        {/* Overlay text */}
                        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/35 to-transparent p-3.5 text-left">
                          <h4 className="text-[13px] font-black text-white leading-tight tracking-wide">
                            Everything for your
                          </h4>
                          <h4 className="text-[13px] font-black text-white leading-tight tracking-wide">
                            Creative Journey
                          </h4>
                          <p className="mt-1 text-[9.5px] font-semibold text-white/80 leading-none">
                            Quality supplies for every artist
                          </p>
                        </div>
                      </div>

                      {/* Right 2x2 Grid Column */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Top Left Card - Wide Range */}
                        <div className="relative h-[122px] overflow-hidden rounded-[16px] border border-black/[0.05]">
                          <img
                            src="https://images.unsplash.com/photo-1580136579312-94651dfd596d?auto=format&fit=crop&w=400&q=80"
                            alt="Wide range"
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute left-2 top-2 rounded-[6px] bg-black/60 px-2 py-0.5 text-[8px] font-black text-white tracking-wide">
                            Wide Range
                          </div>
                        </div>

                        {/* Top Right Card - New Arrivals */}
                        <div className="relative h-[122px] overflow-hidden rounded-[16px] border border-black/[0.05]">
                          <img
                            src="https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=400&q=80"
                            alt="New Arrivals"
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute left-2 top-2 rounded-[6px] bg-black/60 px-2 py-0.5 text-[8px] font-black text-white tracking-wide">
                            New Arrivals
                          </div>
                        </div>

                        {/* Bottom Left Card - Sketchbook & Hearts */}
                        <div className="relative h-[122px] overflow-hidden rounded-[16px] border border-black/[0.05]">
                          <img
                            src="https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80"
                            alt="Sketchbook"
                            className="h-full w-full object-cover"
                          />
                          {/* Sketch for big ideas text overlay */}
                          <div className="absolute inset-0 flex flex-col justify-between p-2 bg-black/10">
                            <div />
                            <div className="text-left">
                              <p className="text-[10px] font-black text-white leading-tight drop-shadow-md">
                                Sketch
                              </p>
                              <p className="text-[8px] font-medium text-white/90 leading-none drop-shadow-md">
                                for big ideas
                              </p>
                            </div>
                          </div>
                          {/* Likes Tag */}
                          <div className="absolute bottom-2 left-2 flex items-center gap-0.5 rounded-full bg-black/45 px-1.5 py-0.5 text-[7.5px] font-black text-white backdrop-blur-xs">
                            <Heart className="h-2 w-2 fill-white text-white" />
                            <span>1.2K</span>
                          </div>
                        </div>

                        {/* Bottom Right Card - Play Video */}
                        <div className="relative h-[122px] overflow-hidden rounded-[16px] border border-black/[0.05]">
                          <img
                            src="https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=400&q=80"
                            alt="Painting"
                            className="h-full w-full object-cover"
                          />
                          {/* Centered Play Button Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/30 text-white border border-white/40 shadow-sm backdrop-blur-xs">
                              <Play className="h-3 w-3 fill-white text-white ml-0.5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pagination Dots */}
                    <div className="flex justify-center gap-1.5 mt-3.5 mb-2">
                      {[0, 1, 2, 3, 4].map(idx => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveDot(idx)}
                          className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                            activeDot === idx ? 'bg-[#EA580C] w-3' : 'bg-[#E5E7EB]'
                          }`}
                          aria-label={`Go to slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-5 text-center text-[#6B7280]">
                  <ShoppingBag className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-[14px] font-extrabold text-[#111111]">
                    {activeTab === 'reviews' ? 'Supplies Reviews' : 'New Arrivals'}
                  </p>
                  <p className="mt-1 text-[12px]">Explore our catalog for the latest updates.</p>
                </div>
              )}

              {/* Benefits Section */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-b border-slate-100 py-5 px-3 mb-5 mt-4">
                {/* Benefit 1 */}
                <div className="flex flex-col items-center text-center px-1">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F5F3FF] text-[#7C3AED]">
                    <Tag className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h5 className="text-[12px] font-black text-[#111111] mt-2 leading-none">
                    Upto 40% OFF
                  </h5>
                  <p className="mt-1 text-[9px] text-[#9CA3AF] font-bold leading-tight">
                    Best deals on top brands
                  </p>
                </div>

                {/* Benefit 2 */}
                <div className="flex flex-col items-center text-center px-1">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
                    <ShoppingBag className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h5 className="text-[12px] font-black text-[#111111] mt-2 leading-none">
                    1000+ Products
                  </h5>
                  <p className="mt-1 text-[9px] text-[#9CA3AF] font-bold leading-tight">
                    Everything you need in one place
                  </p>
                </div>

                {/* Benefit 3 */}
                <div className="flex flex-col items-center text-center px-1">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F0FDF4] text-[#16A34A]">
                    <Grid className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h5 className="text-[12px] font-black text-[#111111] mt-2 leading-none">
                    50+ Categories
                  </h5>
                  <p className="mt-1 text-[9px] text-[#9CA3AF] font-bold leading-tight">
                    Wide range to choose from
                  </p>
                </div>
              </div>

              {/* Trust Features Peach Strip */}
              <div className="mx-5 p-3 rounded-[16px] bg-[#FFF7ED] border border-[#FFEDD5] flex items-center justify-between gap-1">
                {/* Genuine Products */}
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4.5 w-4.5 text-[#EA580C] shrink-0" strokeWidth={2} />
                  <div className="text-[9px] font-extrabold text-[#111111] leading-tight text-left">
                    <div>Genuine</div>
                    <div className="text-[#EA580C]">Products</div>
                  </div>
                </div>

                {/* Separator */}
                <div className="h-6 w-[1px] bg-[#FFEDD5]" />

                {/* Fast Delivery */}
                <div className="flex items-center gap-1.5">
                  <Truck className="h-4.5 w-4.5 text-[#EA580C] shrink-0" strokeWidth={2} />
                  <div className="text-[9px] font-extrabold text-[#111111] leading-tight text-left">
                    <div>Fast</div>
                    <div className="text-[#EA580C]">Delivery</div>
                  </div>
                </div>

                {/* Separator */}
                <div className="h-6 w-[1px] bg-[#FFEDD5]" />

                {/* Easy Returns */}
                <div className="flex items-center gap-1.5">
                  <RotateCcw className="h-4.5 w-4.5 text-[#EA580C] shrink-0" strokeWidth={2} />
                  <div className="text-[9px] font-extrabold text-[#111111] leading-tight text-left">
                    <div>Easy</div>
                    <div className="text-[#EA580C]">Returns</div>
                  </div>
                </div>

                {/* Separator */}
                <div className="h-6 w-[1px] bg-[#FFEDD5]" />

                {/* Secure Payments */}
                <div className="flex items-center gap-1.5">
                  <Lock className="h-4.5 w-4.5 text-[#EA580C] shrink-0" strokeWidth={2} />
                  <div className="text-[9px] font-extrabold text-[#111111] leading-tight text-left">
                    <div>Secure</div>
                    <div className="text-[#EA580C]">Payments</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom sticky CTA Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex gap-3 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {/* Order Online Button */}
              <button
                type="button"
                className="flex-1 py-3 px-3 rounded-[16px] border border-[#EA580C] text-[#EA580C] text-[14px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#FFF8F2] transition-colors cursor-pointer"
              >
                <ShoppingCart className="h-4.5 w-4.5" strokeWidth={2.5} />
                <span>Order Online</span>
              </button>

              {/* Visit Today Button */}
              <button
                type="button"
                className="flex-1 py-3 px-3 rounded-[16px] bg-[#EA580C] text-white text-[14px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#D97706] transition-colors shadow-xs cursor-pointer"
              >
                <Store className="h-4.5 w-4.5" strokeWidth={2.5} />
                <span>Visit Today</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
