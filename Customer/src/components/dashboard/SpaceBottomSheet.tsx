import {useEffect, useState, type ReactNode} from 'react';
import {useNavigate} from 'react-router-dom';
import axios from 'axios';
import {
  X,
  MapPin,
  Building,
  Laptop,
  Ticket,
  Calendar,
  Paintbrush,
  GraduationCap,
  Users,
  BookOpen,
  Ellipsis,
  MessageCircle,
  Book,
  Compass,
} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import {
  fetchSpacesByType,
  groupSpacesByName,
  type SpaceCard,
} from '../../services/space.service';
import {SpaceDetailsModal} from '../spaces/SpaceDetailsModal';
import {SpaceQueryModal} from './SpaceQueryModal';

function SpacePhoto({
  src,
  alt,
  className,
  fallback,
}: {
  src: string | null;
  alt: string;
  className?: string;
  fallback: ReactNode;
}) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-[#E2E8F0] text-slate-500 ${className || ''}`}>
        {fallback}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`h-full w-full object-cover ${className || ''}`}
      onError={() => setBroken(true)}
    />
  );
}

function SpaceGallery({
  spaces,
  activeDot,
  onSelect,
  onOpen,
}: {
  spaces: SpaceCard[];
  activeDot: number;
  onSelect: (index: number) => void;
  onOpen: (space: SpaceCard) => void;
}) {
  const slides = spaces.some(space => space.imageUrl)
    ? spaces.filter(space => space.imageUrl)
    : spaces;
  if (!slides.length) return null;

  const index = ((activeDot % slides.length) + slides.length) % slides.length;
  const main = slides[index];
  const extras = slides.filter((_, slideIndex) => slideIndex !== index).slice(0, 2);

  return (
    <div className="px-5 mb-5 grid grid-cols-5 gap-2.5">
      <div
        className={`relative h-[200px] overflow-hidden rounded-[20px] border border-black/[0.05] ${
          extras.length ? 'col-span-3' : 'col-span-5'
        }`}
      >
        <button
          type="button"
          onClick={() => onOpen(main)}
          className="absolute inset-0 text-left"
          aria-label={`View ${main.name} availability`}
        >
          <SpacePhoto src={main.imageUrl} alt={main.name} fallback={<Building className="h-8 w-8" />} />
        </button>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
        <div className="absolute left-2.5 bottom-8 max-w-[80%] rounded-[6px] bg-black/60 px-2 py-0.75 text-left text-[8.5px] font-black text-white">
          <span className="line-clamp-1">{main.name}</span>
        </div>
        {slides.length > 1 ? (
          <div className="absolute bottom-2.5 inset-x-0 flex justify-center gap-1">
            {slides.map((space, slideIndex) => (
              <button
                key={space.id}
                type="button"
                onClick={() => onSelect(slideIndex)}
                className={`h-1.25 rounded-full transition-all duration-200 ${
                  index === slideIndex ? 'w-2.5 bg-white' : 'w-1.25 bg-white/40'
                }`}
                aria-label={`Show ${space.name}`}
              />
            ))}
          </div>
        ) : null}
      </div>

      {extras.length > 0 ? (
        <div className="col-span-2 flex flex-col gap-2.5">
          {extras.map(space => (
            <button
              key={space.id}
              type="button"
              onClick={() => onOpen(space)}
              className="relative h-[95px] overflow-hidden rounded-[16px] border border-black/[0.05] text-left"
            >
              <SpacePhoto src={space.imageUrl} alt={space.name} fallback={<Building className="h-5 w-5" />} />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute left-2 bottom-2 max-w-[90%] rounded-[6px] bg-black/60 px-2 py-0.5 text-[8px] font-black text-white">
                <span className="line-clamp-1">{space.name}</span>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type SpaceBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

type TabId = 'exclusive-space' | 'coworking';

type PillItem = {
  label: string;
  icon: any;
};

export function SpaceBottomSheet({isOpen, onClose}: SpaceBottomSheetProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('exclusive-space');
  const [activeDot, setActiveDot] = useState(0);
  const [exclusiveSpaces, setExclusiveSpaces] = useState<SpaceCard[]>([]);
  const [coworkingSpaces, setCoworkingSpaces] = useState<SpaceCard[]>([]);
  const [spacesError, setSpacesError] = useState('');
  const [detailSpace, setDetailSpace] = useState<SpaceCard | null>(null);
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setSpacesError('');

    Promise.all([
      fetchSpacesByType('Exclusive', controller.signal),
      fetchSpacesByType('Coworking', controller.signal),
    ])
      .then(([exclusive, coworking]) => {
        setExclusiveSpaces(groupSpacesByName(exclusive));
        setCoworkingSpaces(groupSpacesByName(coworking));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || axios.isCancel(error)) return;
        if (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') return;
        setExclusiveSpaces([]);
        setCoworkingSpaces([]);
        setSpacesError('Could not load spaces.');
      });

    return () => controller.abort();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setDetailSpace(null);
  }, [isOpen]);

  const pills: PillItem[] = [
    {label: 'Shows', icon: Ticket},
    {label: 'Events', icon: Calendar},
    {label: 'Workshops', icon: Paintbrush},
    {label: 'Classes', icon: GraduationCap},
    {label: 'Meetups', icon: Users},
    {label: 'Seminars', icon: BookOpen},
    {label: 'more', icon: Ellipsis},
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
                {/* Space Icon inside soft peach rounded square */}
                <div className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#FFF0EB] text-[#EA580C]">
                  <MapPin className="h-7 w-7" strokeWidth={2} />
                </div>
                <div className="text-left">
                  <h3 className="text-[19px] font-extrabold tracking-tight text-[#111111] leading-tight">
                    Space
                  </h3>
                  <p className="mt-0.5 text-[12px] font-bold text-[#6B7280]">
                    Reserve space for any occassion
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

            {/* Exclusive Space & Coworking Main Tabs */}
            <div className="shrink-0 px-5 mb-3 flex gap-3">
              {/* Exclusive Space Tab */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('exclusive-space');
                  setActiveDot(0);
                }}
                className={`flex-1 py-3 px-4 rounded-[16px] border text-[13px] font-extrabold flex items-center justify-center gap-2 transition-all duration-200 relative overflow-hidden cursor-pointer ${
                  activeTab === 'exclusive-space'
                    ? 'border-[#EA580C] bg-[#FFF0EB]/50 text-[#EA580C]'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Building className="h-4.5 w-4.5" strokeWidth={2.25} />
                <span>Exclusive Space</span>
                {activeTab === 'exclusive-space' && (
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-[#EA580C] rounded-full mx-6" />
                )}
              </button>

              {/* Coworking Tab */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('coworking');
                  setActiveDot(0);
                }}
                className={`flex-1 py-3 px-4 rounded-[16px] border text-[13px] font-extrabold flex items-center justify-center gap-2 transition-all duration-200 relative overflow-hidden cursor-pointer ${
                  activeTab === 'coworking'
                    ? 'border-[#EA580C] bg-[#FFF0EB]/50 text-[#EA580C]'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Laptop className="h-4.5 w-4.5" strokeWidth={2.25} />
                <span>Coworking</span>
                {activeTab === 'coworking' && (
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-[#EA580C] rounded-full mx-6" />
                )}
              </button>
            </div>

            {/* Scrollable Contents */}
            <div className="flex-1 overflow-y-auto pb-6">
              {spacesError ? (
                <p className="px-5 mb-3 text-left text-[12px] font-bold text-red-500">
                  {spacesError}
                </p>
              ) : null}
              {activeTab === 'exclusive-space' ? (
                <>
                  {/* Create. Host. Inspire. subtitle */}
                  <div className="px-5 mb-3 text-left">
                    <p className="text-[12.5px] font-black text-[#1F2937]">
                      Create. Host. Inspire.
                    </p>
                  </div>

                  {/* Horizontal Scrollable Pill Row */}
                  <div className="px-5 mb-4 flex gap-2 overflow-x-auto scrollbar-none">
                    {pills.map((pill, idx) => {
                      const PillIcon = pill.icon;
                      return (
                        <div
                          key={idx}
                          className="shrink-0 px-3.5 py-1.5 rounded-full bg-[#FFF0EB] text-[#EA580C] border border-[#FFEDD5] text-[11px] font-bold flex items-center gap-1.5"
                        >
                          <PillIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
                          <span>{pill.label === 'more' ? `& ${pill.label}` : pill.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <SpaceGallery
                    spaces={exclusiveSpaces}
                    activeDot={activeDot}
                    onSelect={setActiveDot}
                    onOpen={setDetailSpace}
                  />
                </>
              ) : (
                <>
                  {/* Coworking Intro subtitle */}
                  <div className="px-5 mb-3 text-left">
                    <p className="text-[12.5px] font-black text-[#1F2937]">
                      Work. Create. Relax.
                    </p>
                  </div>

                  {/* Horizontal Scrollable Coworking Pill Row */}
                  <div className="px-5 mb-4 flex gap-2 overflow-x-auto scrollbar-none">
                    {[
                      {label: 'Study', icon: Book},
                      {label: 'Work', icon: Laptop},
                      {label: 'Paint', icon: Paintbrush},
                      {label: 'Read', icon: BookOpen},
                      {label: 'more', icon: Ellipsis},
                    ].map((pill, idx) => {
                      const PillIcon = pill.icon;
                      return (
                        <div
                          key={idx}
                          className="shrink-0 px-3.5 py-1.5 rounded-full bg-[#FFF0EB] text-[#EA580C] border border-[#FFEDD5] text-[11px] font-bold flex items-center gap-1.5"
                        >
                          <PillIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
                          <span>{pill.label === 'more' ? `& ${pill.label}` : pill.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <SpaceGallery
                    spaces={coworkingSpaces}
                    activeDot={activeDot}
                    onSelect={setActiveDot}
                    onOpen={setDetailSpace}
                  />
                </>
              )}

              {/* Benefits Section - commented out */}
            </div>

            {/* Bottom sticky CTA Buttons */}
            <div className="sticky bottom-0 z-10 flex items-stretch gap-3 border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {activeTab === 'exclusive-space' ? (
                <>
                  {/* Compass Button (Kept in Exclusive Space only) */}
                  <button
                    type="button"
                    aria-label="Explore spaces"
                    title="Explore spaces"
                    onClick={() => {
                      onClose();
                      navigate('/spaces');
                    }}
                    className="flex w-12 shrink-0 items-center justify-center rounded-[16px] bg-[#111111] text-white transition hover:bg-slate-800"
                  >
                    <Compass className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                  <div className="flex min-w-0 flex-1 gap-3">
                    {/* Explore Space Button (Refactored from Book Online) */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate('/spaces');
                      }}
                      className="flex-1 py-3 px-3 rounded-[16px] border border-[#EA580C] text-[#EA580C] text-[14px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#FFF8F2] transition-colors cursor-pointer"
                    >
                      <Compass className="h-4.5 w-4.5" strokeWidth={2.5} />
                      <span>Explore Space</span>
                    </button>

                    {/* Query Now - Opens Space Lead Form without selecting specific space */}
                    <button
                      type="button"
                      onClick={() => setIsQueryModalOpen(true)}
                      className="flex-1 py-3 px-3 rounded-[16px] bg-[#EA580C] text-white text-[14px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#D97706] transition-colors shadow-xs cursor-pointer"
                    >
                      <MessageCircle className="h-4.5 w-4.5" strokeWidth={2.5} />
                      <span>Query Now</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex min-w-0 flex-1 gap-3">
                  {/* Explore Plans Button */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/spaces');
                    }}
                    className="flex-1 py-3 px-3 rounded-[16px] border border-[#EA580C] text-[#EA580C] text-[14px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#FFF8F2] transition-colors cursor-pointer"
                  >
                    <Compass className="h-4.5 w-4.5" strokeWidth={2.5} />
                    <span>Explore Plans</span>
                  </button>

                  {/* Query Now - Opens Space Lead Form without selecting specific space */}
                  <button
                    type="button"
                    onClick={() => setIsQueryModalOpen(true)}
                    className="flex-1 py-3 px-3 rounded-[16px] bg-[#EA580C] text-white text-[14px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#D97706] transition-colors shadow-xs cursor-pointer"
                  >
                    <MessageCircle className="h-4.5 w-4.5" strokeWidth={2.5} />
                    <span>Query Now</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
          {detailSpace ? (
            <SpaceDetailsModal space={detailSpace} onClose={() => setDetailSpace(null)} />
          ) : null}

          {/* Space Query Lead Modal without requiring specific space selection */}
          <SpaceQueryModal
            isOpen={isQueryModalOpen}
            onClose={() => setIsQueryModalOpen(false)}
            initialSpaceType={activeTab === 'exclusive-space' ? 'Exclusive Space' : 'Coworking'}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
