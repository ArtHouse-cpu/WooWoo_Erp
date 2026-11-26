import {useState, useRef, useMemo} from 'react';
import {
  X,
  Calendar,
  Image as ImageIcon,
  Play,
  Award,
  Users,
  Heart,
  UserCheck,
  Compass,
  MessageCircle,
  MapPin,
  Ticket,
  Scissors,
  Ellipsis,
  BookOpen,
  Smile,
  Zap,
} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';

type EventsBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

type TabId = 'workshops' | 'exhibitions' | 'shows' | 'meetups' | 'seminars' | 'more';

type EventItem = {
  id: string;
  title: string;
  category: 'Workshop' | 'Exhibition' | 'Show' | 'Meetup';
  location: string;
  image: string;
};

export function EventsBottomSheet({isOpen, onClose}: EventsBottomSheetProps) {
  const [activeTab, setActiveTab] = useState<TabId>('workshops');
  const [activeDot, setActiveDot] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const tabs = [
    {id: 'workshops' as TabId, label: 'Workshops', icon: Scissors},
    {id: 'exhibitions' as TabId, label: 'Exhibitions', icon: ImageIcon},
    {id: 'shows' as TabId, label: 'Shows', icon: Ticket},
    {id: 'meetups' as TabId, label: 'Meetups', icon: Users},
    {id: 'seminars' as TabId, label: 'Seminars', icon: BookOpen},
    {id: 'more' as TabId, label: 'More', icon: Ellipsis},
  ];

  const eventsList: EventItem[] = [
    {
      id: '1',
      title: 'Watercolor Painting Workshop',
      category: 'Workshop',
      location: 'Bangalore, Karnataka',
      image: 'https://res.cloudinary.com/nciretjr/video/upload/v1795612541/IMG_1319.mov',
    },
    {
      id: '2',
      title: 'Contemporary Art Exhibition',
      category: 'Exhibition',
      location: 'Mumbai, Maharashtra',
      image: 'https://res.cloudinary.com/nciretjr/image/upload/v1795611856/IMG_4907.heic',
    },
    {
      id: '3',
      title: 'Live Dance Performance',
      category: 'Show',
      location: 'Delhi, NCR',
      image: 'https://res.cloudinary.com/nciretjr/video/upload/v1795612101/IMG_8169.mov',
    },
    {
      id: '4',
      title: 'Pottery Making Workshop',
      category: 'Workshop',
      location: 'Pune, Maharashtra',
      image: 'https://images.unsplash.com/photo-1565192647048-f997ded87958?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: '5',
      title: 'Acoustic Music Evening',
      category: 'Show',
      location: 'Hyderabad, Telangana',
      image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: '6',
      title: 'Artists Networking Meetup',
      category: 'Meetup',
      location: 'Bangalore, Karnataka',
      image: 'https://res.cloudinary.com/nciretjr/image/upload/v1795613541/IMG_4131.png',
    },
  ];

  const allEventsMap: Record<TabId, EventItem[]> = {
    workshops: eventsList,
    exhibitions: [
      {
        id: '2',
        title: 'Contemporary Art Exhibition',
        category: 'Exhibition',
        location: 'Mumbai, Maharashtra',
        image: 'https://images.unsplash.com/photo-1499783300057-475a43b27b6a?auto=format&fit=crop&w=300&q=80',
      },
      {
        id: 'e2',
        title: 'Modern Sculptures & Installations',
        category: 'Exhibition',
        location: 'Bangalore, Karnataka',
        image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=300&q=80',
      },
      {
        id: 'e3',
        title: 'Fine Art Photography Showcase',
        category: 'Exhibition',
        location: 'Delhi, NCR',
        image: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=300&q=80',
      },
      {
        id: 'e4',
        title: 'Indian Heritage Canvas Expo',
        category: 'Exhibition',
        location: 'Pune, Maharashtra',
        image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=300&q=80',
      },
    ],
    shows: [
      {
        id: '3',
        title: 'Live Dance Performance',
        category: 'Show',
        location: 'Delhi, NCR',
        image: 'https://res.cloudinary.com/nciretjr/image/upload/v1795617288/Screenshot_2026-11-25_200403.png',
      },
      {
        id: '5',
        title: 'Acoustic Music Evening',
        category: 'Show',
        location: 'Hyderabad, Telangana',
        image: 'https://res.cloudinary.com/nciretjr/image/upload/v1795617457/music_night.png',
      },
      {
        id: 's3',
        title: 'Indie Fusion Band Spotlight',
        category: 'Show',
        location: 'Bangalore, Karnataka',
        image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=300&q=80',
      },
      {
        id: 's4',
        title: 'Poetry & Spoken Word Night',
        category: 'Show',
        location: 'Mumbai, Maharashtra',
        image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80',
      },
    ],
    meetups: [
      {
        id: '6',
        title: 'Artists Networking Meetup',
        category: 'Meetup',
        location: 'Bangalore, Karnataka',
        image: 'https://res.cloudinary.com/nciretjr/image/upload/v1795613541/IMG_4131.png',
      },
      {
        id: 'm2',
        title: 'Sunday Urban Sketch Crawl',
        category: 'Meetup',
        location: 'Pune, Maharashtra',
        image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=300&q=80',
      },
      {
        id: 'm3',
        title: 'Creative Coffee & Collab Circle',
        category: 'Meetup',
        location: 'Delhi, NCR',
        image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=300&q=80',
      },
    ],
    seminars: [
      {
        id: 'sem1',
        title: 'Art Business & Monetization 101',
        category: 'Workshop',
        location: 'Online Live Masterclass',
        image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=300&q=80',
      },
      {
        id: 'sem2',
        title: 'Digital Tools for Modern Illustrators',
        category: 'Workshop',
        location: 'Bangalore, Karnataka',
        image: 'https://images.unsplash.com/photo-1542744094-24638eff58bb?auto=format&fit=crop&w=300&q=80',
      },
    ],
    more: eventsList,
  };

  const displayedEvents = useMemo(() => {
    return allEventsMap[activeTab] || eventsList;
  }, [activeTab]);

  const dotsCount = Math.min(5, displayedEvents.length);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const {scrollLeft, scrollWidth, clientWidth} = scrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) return;
    const progress = scrollLeft / maxScroll;
    const dotIndex = Math.min(dotsCount - 1, Math.max(0, Math.round(progress * (dotsCount - 1))));
    setActiveDot(dotIndex);
  };

  const scrollToDot = (idx: number) => {
    setActiveDot(idx);
    if (!scrollRef.current) return;
    const {scrollWidth, clientWidth} = scrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) return;
    const targetScroll = (idx / (dotsCount - 1)) * maxScroll;
    scrollRef.current.scrollTo({left: targetScroll, behavior: 'smooth'});
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'Workshop':
        return 'bg-[#EA580C] text-white';
      case 'Exhibition':
        return 'bg-[#7C3AED] text-white';
      case 'Show':
        return 'bg-[#EC4899] text-white';
      case 'Meetup':
        return 'bg-[#6366F1] text-white';
      default:
        return 'bg-slate-500 text-white';
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
            <div className="flex shrink-0 justify-center py-3">
              <div className="h-1.5 w-12 rounded-full bg-[#E5E7EB]" />
            </div>

            {/* Close Button & Header Info */}
            <div className="relative shrink-0 px-5 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Events Icon inside soft peach rounded square */}
                <div className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#FFF0EB] text-[#EA580C]">
                  <Calendar className="h-7 w-7" strokeWidth={2} />
                </div>
                <div className="text-left">
                  <h3 className="text-[19px] font-extrabold tracking-tight text-[#111111] leading-tight">
                    Events
                  </h3>
                  <p className="mt-0.5 text-[12px] font-bold text-[#6B7280]">
                    Experience art. Connect. Celebrate.
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

            {/* Interactive Category Tabs with Horizontally Scrollable Bar */}
            <div className="shrink-0 px-5 mb-4 flex gap-2.5 overflow-x-auto scrollbar-none">
              {tabs.map(tab => {
                const active = activeTab === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setActiveDot(0);
                      scrollRef.current?.scrollTo({left: 0, behavior: 'auto'});
                    }}
                    className={`shrink-0 px-[16px] py-1.5 rounded-full border text-[13px] font-extrabold flex items-center gap-1.5 transition-all duration-200 ${
                      active
                        ? 'border-[#EA580C] bg-[#FFF8F2] text-[#EA580C]'
                        : 'border-slate-200 text-[#6B7280] hover:bg-slate-50'
                    }`}
                  >
                    <TabIcon className="h-4 w-4" strokeWidth={active ? 2.5 : 2} />
                    <span>{tab.id === 'more' ? `: ${tab.label}` : tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable Contents */}
            <div className="flex-1 overflow-y-auto pb-6">
              {displayedEvents.length > 0 ? (
                <>
                  {/* Horizontally Scrollable Event Cards */}
                  <div className="mb-4">
                    <div
                      ref={scrollRef}
                      onScroll={handleScroll}
                      className="flex gap-2.5 overflow-x-auto scrollbar-none snap-x snap-mandatory px-5 pb-2 pt-0.5"
                    >
                      {displayedEvents.map(event => (
                        <div
                          key={event.id}
                          className="relative h-[165px] w-[122px] sm:h-[180px] sm:w-[135px] shrink-0 snap-start overflow-hidden rounded-[18px] border border-black/[0.05] shadow-2xs group cursor-pointer"
                        >
                          <img
                            src={event.image}
                            alt={event.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          {/* Top-Left Category Badge */}
                          <div className={`absolute top-2 left-2 rounded-[6px] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider ${getCategoryBadgeColor(event.category)}`}>
                            {event.category}
                          </div>

                          {/* Overlay content */}
                          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/40 to-transparent p-2.5 text-left">
                            {/* Circular Play Icon */}
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white border border-white/40 mb-1.5 backdrop-blur-xs">
                              <Play className="h-3 w-3 fill-white text-white ml-0.5" />
                            </div>

                            {/* Event Title */}
                            <p className="text-[9px] sm:text-[9.5px] font-black text-white leading-tight line-clamp-2 mb-1">
                              {event.title}
                            </p>

                            {/* Location row */}
                            <div className="flex items-center gap-0.5 text-[7px] sm:text-[7.5px] font-bold text-white/90">
                              <MapPin className="h-2 w-2 text-white/80 shrink-0" strokeWidth={2.5} />
                              <span className="truncate">{event.location}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination Dots */}
                    {dotsCount > 1 && (
                      <div className="flex justify-center gap-1.5 mt-3 mb-2">
                        {Array.from({length: dotsCount}).map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => scrollToDot(idx)}
                            className={`h-1.5 rounded-full transition-all duration-200 ${
                              activeDot === idx ? 'bg-[#EA580C] w-3.5' : 'bg-[#E5E7EB] w-1.5'
                            }`}
                            aria-label={`Go to slide ${idx + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-5 text-center text-[#6B7280]">
                  <Calendar className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-[14px] font-extrabold text-[#111111]">
                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} events
                  </p>
                  <p className="mt-1 text-[12px]">Explore our catalog for active listings.</p>
                </div>
              )}

              {/* Benefits Section */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-b border-slate-100 py-5 px-3 mb-5 mt-4">
                {/* Benefit 1 */}
                <div className="flex flex-col items-center text-center px-1">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF0EB] text-[#EA580C]">
                    <Award className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h5 className="text-[12px] font-black text-[#111111] mt-2.5 leading-none">
                    Curated Quality
                  </h5>
                  <p className="mt-1 text-[8.5px] text-[#9CA3AF] font-bold leading-tight max-w-[95%]">
                    Handpicked events by experts
                  </p>
                </div>

                {/* Benefit 2 */}
                <div className="flex flex-col items-center text-center px-1">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E8F8EF] text-[#15803D]">
                    <Users className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h5 className="text-[12px] font-black text-[#111111] mt-2.5 leading-none">
                    5000+ Creatives
                  </h5>
                  <p className="mt-1 text-[8.5px] text-[#9CA3AF] font-bold leading-tight max-w-[95%]">
                    Already engaged & inspired
                  </p>
                </div>

                {/* Benefit 3 */}
                <div className="flex flex-col items-center text-center px-1">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F3E8FF] text-[#7C3AED]">
                    <Heart className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h5 className="text-[12px] font-black text-[#111111] mt-2.5 leading-none">
                    Loved by Creatives
                  </h5>
                  <p className="mt-1 text-[8.5px] text-[#9CA3AF] font-bold leading-tight max-w-[95%]">
                    4.8 ★ average rating from attendees
                  </p>
                </div>
              </div>

              {/* Trust Features Peach Strip */}
              <div className="mx-5 p-3 rounded-[16px] bg-[#FFF7ED] border border-[#FFEDD5] flex items-center justify-between gap-1">
                {/* Expert-Led */}
                <div className="flex items-center gap-1">
                  <UserCheck className="h-4.5 w-4.5 text-[#EA580C] shrink-0" strokeWidth={2} />
                  <div className="text-[7.5px] font-bold text-[#111111] leading-tight text-left">
                    <div className="font-black">Expert-Led</div>
                    <div className="text-[#6B7280] font-semibold text-[6.5px]">Learn from professionals</div>
                  </div>
                </div>

                {/* Separator */}
                <div className="h-6 w-[1px] bg-[#FFEDD5] shrink-0" />

                {/* Hands-on */}
                <div className="flex items-center gap-1">
                  <Zap className="h-4.5 w-4.5 text-[#EA580C] shrink-0" strokeWidth={2} />
                  <div className="text-[7.5px] font-bold text-[#111111] leading-tight text-left">
                    <div className="font-black">Hands-on</div>
                    <div className="text-[#6B7280] font-semibold text-[6.5px]">Experiences you'll love</div>
                  </div>
                </div>

                {/* Separator */}
                <div className="h-6 w-[1px] bg-[#FFEDD5] shrink-0" />

                {/* Community Connect */}
                <div className="flex items-center gap-1">
                  <Users className="h-4.5 w-4.5 text-[#EA580C] shrink-0" strokeWidth={2} />
                  <div className="text-[7.5px] font-bold text-[#111111] leading-tight text-left">
                    <div className="font-black">Community</div>
                    <div className="text-[#6B7280] font-semibold text-[6.5px]">Meet & network</div>
                  </div>
                </div>

                {/* Separator */}
                <div className="h-6 w-[1px] bg-[#FFEDD5] shrink-0" />

                {/* Memorable Moments */}
                <div className="flex items-center gap-1">
                  <Smile className="h-4.5 w-4.5 text-[#EA580C] shrink-0" strokeWidth={2} />
                  <div className="text-[7.5px] font-bold text-[#111111] leading-tight text-left">
                    <div className="font-black">Memorable</div>
                    <div className="text-[#6B7280] font-semibold text-[6.5px]">Create stories that stay</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom sticky CTA Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex gap-3 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {/* Explore More Button */}
              <button
                type="button"
                className="flex-1 py-3 px-3 rounded-[16px] border border-[#EA580C] text-[#EA580C] text-[14px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#FFF8F2] transition-colors cursor-pointer"
              >
                <Compass className="h-4.5 w-4.5" strokeWidth={2.5} />
                <span>Explore More</span>
              </button>

              {/* Query Now Button */}
              <button
                type="button"
                className="flex-1 py-3 px-3 rounded-[16px] bg-[#EA580C] text-white text-[14px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#D97706] transition-colors shadow-xs cursor-pointer"
              >
                <MessageCircle className="h-4.5 w-4.5" strokeWidth={2.5} />
                <span>Query Now</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
