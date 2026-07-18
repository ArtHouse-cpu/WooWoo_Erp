import {useState} from 'react';
import {
  X,
  Calendar,
  GraduationCap,
  Image as ImageIcon,
  Play,
  Gift,
  Users,
  Heart,
  UserCheck,
  Sparkles,
  Clock,
  Lock,
  Store,
} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';

type ServicesBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

type TabId = 'creative-events' | 'classes' | 'photo-framing';

type ServiceItem = {
  id: string;
  title: string;
  image: string;
  mediaType: 'video' | 'image';
};

export function ServicesBottomSheet({isOpen, onClose}: ServicesBottomSheetProps) {
  const [activeTab, setActiveTab] = useState<TabId>('creative-events');
  const [activeDot, setActiveDot] = useState(0);

  const tabs = [
    {id: 'creative-events' as TabId, label: 'Creative Events', icon: Calendar},
    {id: 'classes' as TabId, label: 'Classes', icon: GraduationCap},
    {id: 'photo-framing' as TabId, label: 'Photo Framing', icon: ImageIcon},
  ];

  const creativeEventsServices: ServiceItem[] = [
    {
      id: '1',
      title: 'Flower Arrangement Workshop',
      image: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=300&q=80',
      mediaType: 'video',
    },
    {
      id: '2',
      title: 'Live Painting Session',
      image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=300&q=80',
      mediaType: 'video',
    },
    {
      id: '3',
      title: 'Pottery Making Workshop',
      image: 'https://images.unsplash.com/photo-1565192647048-f997ded87958?auto=format&fit=crop&w=300&q=80',
      mediaType: 'video',
    },
    {
      id: '4',
      title: 'Acrylic Painting Workshop',
      image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=300&q=80',
      mediaType: 'image',
    },
    {
      id: '5',
      title: 'Calligraphy Workshop',
      image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=300&q=80',
      mediaType: 'image',
    },
    {
      id: '6',
      title: 'Macrame Wall Hanging Workshop',
      image: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=300&q=80',
      mediaType: 'image',
    },
    {
      id: '7',
      title: 'Art Exhibition Showcase',
      image: 'https://images.unsplash.com/photo-1499783300057-475a43b27b6a?auto=format&fit=crop&w=300&q=80',
      mediaType: 'video',
    },
    {
      id: '8',
      title: 'Portrait Photography Workshop',
      image: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=300&q=80',
      mediaType: 'image',
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
            <div className="flex shrink-0 justify-center py-3">
              <div className="h-1.5 w-12 rounded-full bg-[#E5E7EB]" />
            </div>

            {/* Close Button & Header Info */}
            <div className="relative shrink-0 px-5 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Services Icon inside soft orange rounded square */}
                <div className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#FFF0EB] text-[#EA580C]">
                  {/* Creative Hand-star representation matching the reference image */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-7 w-7"
                  >
                    {/* Star at the top */}
                    <path d="M12 2l1.5 3 3.5.5-2.7 2.7.8 3.3-3.1-1.8-3.1 1.8.8-3.3-2.7-2.7 3.5-.5z" />
                    {/* Hand palm facing up */}
                    <path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16" />
                    <path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.9l-4.2 3.9" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-[19px] font-extrabold tracking-tight text-[#111111] leading-tight">
                    Services
                  </h3>
                  <p className="mt-0.5 text-[12px] font-bold text-[#6B7280]">
                    Creative services for you
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

            {/* Interactive Category Tabs with Icons */}
            <div className="shrink-0 px-5 mb-4 flex gap-2.5 overflow-x-auto scrollbar-none">
              {tabs.map(tab => {
                const active = activeTab === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 px-[16px] py-1.5 rounded-full border text-[13px] font-extrabold flex items-center gap-1.5 transition-all duration-200 ${
                      active
                        ? 'border-[#EA580C] bg-[#FFF8F2] text-[#EA580C]'
                        : 'border-slate-200 text-[#6B7280] hover:bg-slate-50'
                    }`}
                  >
                    <TabIcon className="h-4 w-4" strokeWidth={active ? 2.5 : 2} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable Contents */}
            <div className="flex-1 overflow-y-auto pb-6">
              {activeTab === 'creative-events' ? (
                <>
                  {/* Responsive 4-Column Image Grid */}
                  <div className="px-5 mb-4">
                    <div className="grid grid-cols-4 gap-2">
                      {creativeEventsServices.map(service => {
                        const isVideo = service.mediaType === 'video';
                        return (
                          <div
                            key={service.id}
                            className="relative h-[120px] overflow-hidden rounded-[16px] border border-black/[0.05] shadow-2xs group cursor-pointer"
                          >
                            <img
                              src={service.image}
                              alt={service.title}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            {/* Overlay content */}
                            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/30 to-transparent p-2 text-left">
                              {/* Media Icon Indicator */}
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white border border-white/40 mb-1 backdrop-blur-xs">
                                {isVideo ? (
                                  <Play className="h-2.5 w-2.5 fill-white text-white ml-0.5" />
                                ) : (
                                  <ImageIcon className="h-2.5 w-2.5 text-white" />
                                )}
                              </div>
                              <p className="text-[7.5px] sm:text-[8px] font-black text-white leading-tight line-clamp-2">
                                {service.title}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination Dots */}
                    <div className="flex justify-center gap-1.5 mt-4 mb-2">
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
                  <Sparkles className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-[14px] font-extrabold text-[#111111]">
                    {activeTab === 'classes' ? 'Classes & Courses' : 'Photo Framing'}
                  </p>
                  <p className="mt-1 text-[12px]">Explore our catalog for active listings.</p>
                </div>
              )}

              {/* Benefits Section */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-b border-slate-100 py-5 px-3 mb-5 mt-4">
                {/* Benefit 1 */}
                <div className="flex flex-col items-center text-center px-1">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF0EB] text-[#EA580C]">
                    <Gift className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h5 className="text-[12px] font-black text-[#111111] mt-2.5 leading-none">
                    Personalized
                  </h5>
                  <p className="mt-1 text-[8.5px] text-[#9CA3AF] font-bold leading-tight max-w-[95%]">
                    Customized experiences made just for you
                  </p>
                </div>

                {/* Benefit 2 */}
                <div className="flex flex-col items-center text-center px-1">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E8F8EF] text-[#15803D]">
                    <Users className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h5 className="text-[12px] font-black text-[#111111] mt-2.5 leading-none">
                    5K+ Served
                  </h5>
                  <p className="mt-1 text-[8.5px] text-[#9CA3AF] font-bold leading-tight max-w-[95%]">
                    Trusted by 5000+ happy customers
                  </p>
                </div>

                {/* Benefit 3 */}
                <div className="flex flex-col items-center text-center px-1">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F3E8FF] text-[#7C3AED]">
                    <Heart className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h5 className="text-[12px] font-black text-[#111111] mt-2.5 leading-none">
                    Loved by Many
                  </h5>
                  <p className="mt-1 text-[8.5px] text-[#9CA3AF] font-bold leading-tight max-w-[95%]">
                    Highly rated & loved by our community
                  </p>
                  
                </div>
              </div>

              {/* Trust Features Peach Strip */}
              <div className="mx-5 p-3 rounded-[16px] bg-[#FFF7ED] border border-[#FFEDD5] flex items-center justify-between gap-1">
                {/* Expert Artists */}
                <div className="flex items-center gap-1">
                  <UserCheck className="h-4.5 w-4.5 text-[#EA580C] shrink-0" strokeWidth={2} />
                  <div className="text-[7.5px] font-bold text-[#111111] leading-tight text-left">
                    <div className="font-black">Expert Artists</div>
                    <div className="text-[#6B7280] font-semibold text-[6.5px]"> Skilled & Verified professionals</div>
                  </div>
                </div>

                {/* Separator */}
                <div className="h-6 w-[1px] bg-[#FFEDD5] shrink-0" />

                {/* Quality Materials */}
                <div className="flex items-center gap-1">
                  <Sparkles className="h-4.5 w-4.5 text-[#EA580C] shrink-0" strokeWidth={2} />
                  <div className="text-[7.5px] font-bold text-[#111111] leading-tight text-left">
                    <div className="font-black">Quality Materials</div>
                    <div className="text-[#6B7280] font-semibold text-[6.5px]">Premium & safe materials</div>
                  </div>
                </div>

                {/* Separator */}
                <div className="h-6 w-[1px] bg-[#FFEDD5] shrink-0" />

                {/* On-time Delivery */}
                <div className="flex items-center gap-1">
                  <Clock className="h-4.5 w-4.5 text-[#EA580C] shrink-0" strokeWidth={2} />
                  <div className="text-[7.5px] font-bold text-[#111111] leading-tight text-left">
                    <div className="font-black">On-time Delivery</div>
                    <div className="text-[#6B7280] font-semibold text-[6.5px]">Commitment you can trust</div>
                  </div>
                </div>

                {/* Separator */}
                <div className="h-6 w-[1px] bg-[#FFEDD5] shrink-0" />

                {/* Secure Payments */}
                <div className="flex items-center gap-1">
                  <Lock className="h-4.5 w-4.5 text-[#EA580C] shrink-0" strokeWidth={2} />
                  <div className="text-[7.5px] font-bold text-[#111111] leading-tight text-left">
                    <div className="font-black">Secure Payments</div>
                    <div className="text-[#6B7280] font-semibold text-[6.5px]">Safe & hassle-free transactions</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom sticky CTA Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex gap-3 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {/* Book Now Button */}
              <button
                type="button"
                className="flex-1 py-3 px-3 rounded-[16px] border border-[#EA580C] text-[#EA580C] text-[14px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#FFF8F2] transition-colors cursor-pointer"
              >
                <Calendar className="h-4.5 w-4.5" strokeWidth={2.5} />
                <span>Book Now</span>
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
