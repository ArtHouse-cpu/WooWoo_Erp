import {useEffect, useMemo, useState} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import axios from 'axios';
import {
  ChevronLeft,
  Search,
  Share2,
  MessageCircle,
  Users,
  Building2,
  CalendarCheck,
  LayoutGrid,
  Crown,
  Laptop,
  User,
  ChevronRight,
  BadgeIndianRupee,
} from 'lucide-react';
import {toast} from 'sonner';
import {SpaceDetailsModal, type SpaceDetailsModalState} from '../../components/spaces/SpaceDetailsModal';
import {ShareSpaceModal} from '../../components/spaces/ShareSpaceModal';
import {SpaceBookingModal} from '../../components/spaces/SpaceBookingModal';
import {CoworkingBookingModal} from '../../components/spaces/CoworkingBookingModal';
import {CoworkingRateCardModal} from '../../components/spaces/CoworkingRateCardModal';
import {ImageCarousel} from '../../components/ui/ImageCarousel';
import {
  formatInr,
  copySpaceLink,
  SPACE_WHATSAPP,
} from '../../components/spaces/spaceActions';
import {
  fetchAvailableSpaces,
  groupSpacesByName,
  type SpaceCard,
} from '../../services/space.service';

export const DEFAULT_PASS_IMAGES: Record<string, string> = {
  day: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=800&q=80',
  weekly: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
  monthly: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
  quarterly: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
  halfyearly: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
  default: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
};

export function getPassFallbackImage(name: string): string {
  const lower = (name || '').toLowerCase();
  if (lower.includes('1 day') || lower.includes('day')) return DEFAULT_PASS_IMAGES.day;
  if (lower.includes('weekly')) return DEFAULT_PASS_IMAGES.weekly;
  if (lower.includes('3 month')) return DEFAULT_PASS_IMAGES.quarterly;
  if (lower.includes('6 month')) return DEFAULT_PASS_IMAGES.halfyearly;
  if (lower.includes('monthly')) return DEFAULT_PASS_IMAGES.monthly;
  return DEFAULT_PASS_IMAGES.default;
}

export function formatPassName(name: string): string {
  if (!name) return 'Coworking Pass';
  const lower = name.toLowerCase().trim();
  if (
    lower.includes('1 day') ||
    lower.includes('one day') ||
    lower.includes('daily') ||
    lower.includes('day pass')
  ) {
    return '1 Day Pass';
  }
  if (lower.includes('weekly') || lower.includes('1 week') || lower.includes('7 day')) {
    return 'Weekly Pass';
  }
  if (lower.includes('3 month') || lower.includes('three month') || lower.includes('quarterly')) {
    return '3 Months Pass';
  }
  if (lower.includes('6 month') || lower.includes('six month') || lower.includes('half year')) {
    return '6 Months Pass';
  }
  if (lower.includes('monthly') || lower.includes('1 month') || lower.includes('month pass')) {
    return 'Monthly Pass';
  }
  const cleaned = name.replace(/^(co[- ]?working\s*[-–—:]?\s*)/i, '').trim();
  return cleaned || name;
}

export const DEFAULT_COWORKING_PASSES: SpaceCard[] = [
  {
    id: 'coworking-1-day-pass',
    name: '1 Day Pass',
    category: 'Coworking Pass',
    spaceType: 'Coworking',
    description:
      'Daily access to flexible workstations, high-speed WiFi, hot beverages, and common creative amenities.',
    capacity: 1,
    imageUrl:
      'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    ],
    videos: [],
    weekdayPrice: 399,
    weekendPrice: 399,
    fromPrice: 399,
  },
  {
    id: 'coworking-weekly-pass',
    name: 'Weekly Pass',
    category: 'Coworking Pass',
    spaceType: 'Coworking',
    description:
      '7-day unlimited access to modern coworking spaces, high-speed connectivity, and creative lounge perks.',
    capacity: 1,
    imageUrl:
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80',
    ],
    videos: [],
    weekdayPrice: 2599,
    weekendPrice: 2599,
    fromPrice: 2599,
  },
  {
    id: 'coworking-monthly-pass',
    name: 'Monthly Pass',
    category: 'Coworking Pass',
    spaceType: 'Coworking',
    description:
      'Monthly flexi desk membership with 24/7 access, meeting room credits, and community benefits.',
    capacity: 1,
    imageUrl:
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    ],
    videos: [],
    weekdayPrice: 7999,
    weekendPrice: 7999,
    fromPrice: 7999,
  },
  {
    id: 'coworking-3-months-pass',
    name: '3 Months Pass',
    category: 'Coworking Pass',
    spaceType: 'Coworking',
    description:
      'Quarterly dedicated workstation plan with storage locker, high-speed fiber internet, and boardroom booking credits.',
    capacity: 1,
    imageUrl:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    ],
    videos: [],
    weekdayPrice: 19999,
    weekendPrice: 19999,
    fromPrice: 19999,
  },
  {
    id: 'coworking-6-months-pass',
    name: '6 Months Pass',
    category: 'Coworking Pass',
    spaceType: 'Coworking',
    description:
      'Semi-annual premier pass with priority desk booking, team room access, printing credits, and exclusive discounts.',
    capacity: 1,
    imageUrl:
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=800&q=80',
    ],
    videos: [],
    weekdayPrice: 39998,
    weekendPrice: 39998,
    fromPrice: 39998,
  },
];

export default function SpacesMarketplacePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [spaces, setSpaces] = useState<SpaceCard[]>([]);
  const [search, setSearch] = useState('');
  const [spaceType, setSpaceType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<SpaceCard | null>(null);
  const [initialModalState, setInitialModalState] = useState<SpaceDetailsModalState | null>(null);
  const [shareSpace, setShareSpace] = useState<SpaceCard | null>(null);
  const [bookingSpace, setBookingSpace] = useState<SpaceCard | null>(null);
  const [coworkingBookingSpace, setCoworkingBookingSpace] = useState<SpaceCard | null>(null);
  const [showRateCardModal, setShowRateCardModal] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qType = params.get('type') || params.get('tab') || '';
    if (qType && (qType.toLowerCase() === 'coworking' || qType.toLowerCase() === 'exclusive')) {
      setSpaceType(qType.charAt(0).toUpperCase() + qType.slice(1).toLowerCase());
    }
    if (params.get('ratecard') === 'true' || params.get('rateCard') === 'true') {
      setShowRateCardModal(true);
    }
  }, [location.search]);

  useEffect(() => {
    let restoreData: {
      spaceData?: SpaceCard;
      modalState?: SpaceDetailsModalState;
    } | null = null;

    if (location.state?.restoreCoworkingModal && location.state?.spaceData) {
      restoreData = {
        spaceData: location.state.spaceData,
        modalState: location.state.modalState,
      };
    } else {
      try {
        const stored = sessionStorage.getItem('coworking_modal_restore');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.spaceData) {
            restoreData = {
              spaceData: parsed.spaceData,
              modalState: parsed.modalState,
            };
          }
        }
      } catch (e) {
        console.error('Failed to parse coworking_modal_restore in SpacesMarketplacePage', e);
      }
    }

    if (restoreData?.spaceData) {
      setSelected(restoreData.spaceData);
      if (restoreData.modalState) {
        setInitialModalState(restoreData.modalState);
      }
      try {
        sessionStorage.removeItem('coworking_modal_restore');
      } catch {}
    }
  }, [location]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchAvailableSpaces(controller.signal)
      .then(rows => setSpaces(groupSpacesByName(rows)))
      .catch((err: unknown) => {
        if (controller.signal.aborted || axios.isCancel(err)) return;
        if (axios.isAxiosError(err) && err.code === 'ERR_CANCELED') return;
        setSpaces([]);
        setError('Could not load spaces.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return spaces.filter(space => {
      if (spaceType && space.spaceType.toLowerCase() !== spaceType.toLowerCase()) return false;
      if (!query) return true;
      return [space.name, space.spaceType, space.description]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [spaces, search, spaceType]);

  const coworkingList = useMemo(() => {
    const backendCoworking = spaces.filter(
      s => (s.spaceType || '').toLowerCase() === 'coworking',
    );
    const source = backendCoworking.length > 0 ? backendCoworking : DEFAULT_COWORKING_PASSES;
    const query = search.trim().toLowerCase();
    const filtered = !query
      ? [...source]
      : source.filter(space =>
          [space.name, space.spaceType, space.description, String(space.fromPrice)]
            .join(' ')
            .toLowerCase()
            .includes(query),
        );
    // Sort by price ascending so passes appear in logical order: 1 Day -> Weekly -> Monthly -> 3 Months -> 6 Months
    return filtered.sort((a, b) => (a.fromPrice || 0) - (b.fromPrice || 0));
  }, [spaces, search]);

  const handleBook = (space: SpaceCard) => {
    const isCoworking =
      spaceType.toLowerCase() === 'coworking' ||
      (space.spaceType || '').toLowerCase() === 'coworking' ||
      (space.name || '').toLowerCase().includes('pass') ||
      (space.name || '').toLowerCase().includes('cowork');
    if (isCoworking) {
      setCoworkingBookingSpace(space);
    } else {
      setBookingSpace(space);
    }
  };

  const handleShare = async (space: SpaceCard) => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShareSpace(space);
      return;
    }
    try {
      await copySpaceLink(space.id);
      toast.success('Space link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className="min-h-dvh bg-[#FAFBFD] text-left">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-[#4B5563] shadow-[0_2px_8px_rgba(15,23,42,0.02)] transition hover:scale-95 cursor-pointer"
              aria-label="Back to home"
            >
              <ChevronLeft className="h-5 w-5 text-[#111111]" strokeWidth={2.5} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-bold text-[#111111]">Spaces</h1>
            </div>
          </div>

          <a
            href={`https://wa.me/${SPACE_WHATSAPP}?text=${encodeURIComponent(
              'Hi, I want some help .',
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-[13px] border border-emerald-500 bg-emerald-50 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 hover:border-emerald-600 shadow-3xs transition active:scale-95 cursor-pointer"
            title="Help on WhatsApp"
          >
            <MessageCircle className="h-4 w-4 text-emerald-600 stroke-[2.2]" />
            <span>Help</span>
          </a>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-[#F8FAFC] px-3 py-2.5 focus-within:border-[#EA580C]">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search studios, desks, meeting rooms..."
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
            />
          </label>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3 w-full">
            {[
              {label: 'All', value: '', icon: LayoutGrid},
              {label: 'Exclusive', value: 'Exclusive', icon: Crown},
              {label: 'Coworking', value: 'Coworking', icon: Laptop},
            ].map(tab => {
              const Icon = tab.icon;
              const active =
                tab.value === ''
                  ? !spaceType
                  : spaceType.toLowerCase() === tab.value.toLowerCase();
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setSpaceType(tab.value)}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-2xl border py-2.5 px-2 text-xs sm:text-sm font-bold transition cursor-pointer shadow-3xs ${
                    active
                      ? 'border-[#7C3AED] bg-[#F9F5FF] text-[#7C3AED]'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-[#7C3AED]' : 'text-slate-600'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        {spaceType.toLowerCase() === 'coworking' ? (
          <div>
            {/* Header: Lavender square with Laptop icon + Coworking Spaces title & subtitle + Rate Card Button */}
            <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
              <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F3E8FF] text-[#7C3AED] shadow-2xs">
                  <Laptop size={22} className="stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-base sm:text-xl font-black text-[#111111] truncate">
                    Coworking Spaces
                  </h2>
                  <p className="text-xs sm:text-sm font-semibold text-slate-500 truncate">
                    Flexible workspaces for individuals &amp; teams.
                  </p>
                </div>
              </div>

              {/* Rate Card Button */}
              <button
                type="button"
                onClick={() => setShowRateCardModal(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-purple-200/90 bg-purple-50/90 hover:bg-purple-100/90 text-[#7C3AED] px-3 py-2 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold shadow-3xs transition hover:scale-98 active:scale-95 cursor-pointer"
                title="View Coworking Rate Card"
              >
                <BadgeIndianRupee size={16} strokeWidth={2.2} />
                <span>Rate Card</span>
              </button>
            </div>

            {/* List of passes */}
            {coworkingList.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
                <p className="text-lg font-extrabold text-[#111111]">No passes found</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">Try another search.</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-3.5">
                {coworkingList.map(pass => (
                  <div
                    key={pass.id}
                    onClick={() => setSelected(pass)}
                    className="group flex items-center gap-3 sm:gap-4 rounded-3xl border border-slate-100 bg-white p-3 sm:p-3.5 shadow-xs transition hover:border-purple-200 hover:shadow-sm cursor-pointer"
                  >
                    {/* Left: Thumbnail Image */}
                    <div className="relative h-18 w-18 sm:h-22 sm:w-28 rounded-2xl overflow-hidden shrink-0 bg-purple-50">
                      <img
                        src={pass.imageUrl || pass.images?.[0] || getPassFallbackImage(pass.name)}
                        alt={formatPassName(pass.name)}
                        className="h-full w-full object-cover"
                        onError={e => {
                          const target = e.currentTarget as HTMLImageElement;
                          const fallback = getPassFallbackImage(pass.name);
                          if (target.src !== fallback) {
                            target.src = fallback;
                          }
                        }}
                      />
                    </div>

                    {/* Right: 2-Row Stack */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                      {/* Row 1: Title on left, Price on right */}
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <h3
                          className="font-display font-black text-sm sm:text-base md:text-lg text-[#111111] truncate"
                          title={pass.name}
                        >
                          {formatPassName(pass.name)}
                        </h3>
                        <span className="font-display font-black text-base sm:text-xl text-[#111111] tracking-tight shrink-0">
                          ₹{formatInr(pass.fromPrice)}
                        </span>
                      </div>

                      {/* Row 2: Capacity Badge on left, Actions on right */}
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F3E8FF] px-2 sm:px-2.5 py-0.5 text-[11px] sm:text-xs font-bold text-[#7C3AED] shrink-0">
                          <User size={12} className="stroke-[2.5]" />
                          <span>{pass.capacity > 0 ? `${pass.capacity} Person` : '1 Person'}</span>
                        </span>

                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              void handleShare(pass);
                            }}
                            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-purple-200 bg-white text-[#7C3AED] hover:bg-purple-50 transition active:scale-95 cursor-pointer shrink-0"
                            title="Share pass"
                            aria-label="Share pass"
                          >
                            <Share2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleBook(pass);
                            }}
                            className="inline-flex items-center justify-center rounded-xl sm:rounded-2xl bg-[#6344E7] hover:bg-[#5233D6] px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-white shadow-3xs transition active:scale-95 cursor-pointer shrink-0"
                          >
                            Book
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setSelected(pass);
                            }}
                            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-purple-200 bg-white text-[#7C3AED] hover:bg-purple-50 transition active:scale-95 cursor-pointer shrink-0"
                            aria-label="View pass details"
                          >
                            <ChevronRight size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-100 bg-white p-8 text-center">
            <p className="font-bold text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey(key => key + 1)}
              className="mt-4 rounded-xl bg-[#111111] px-4 py-2 text-sm font-extrabold text-white"
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 gap-2 min-[360px]:gap-3 sm:gap-5 lg:gap-6">
            {Array.from({length: 6}).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-[20px] min-[360px]:rounded-[24px] sm:rounded-[36px] border border-slate-100 bg-white p-2 min-[360px]:p-2.5 sm:p-4 shadow-xs"
              >
                <div className="aspect-4/3 w-full animate-pulse rounded-[16px] min-[360px]:rounded-[18px] sm:rounded-[26px] bg-slate-100" />
                <div className="mt-2.5 sm:mt-4 space-y-2 sm:space-y-2.5">
                  <div className="h-4 sm:h-6 w-3/4 animate-pulse rounded-lg bg-slate-100" />
                  <div className="h-3.5 sm:h-5 w-16 sm:w-24 animate-pulse rounded-xl bg-slate-100" />
                  <div className="flex flex-nowrap items-center justify-between pt-1.5 sm:pt-2 gap-1 sm:gap-2">
                    <div className="h-4 sm:h-6 w-12 sm:w-20 animate-pulse rounded bg-slate-100" />
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                      <div className="h-5 w-5 sm:h-7 sm:w-7 animate-pulse rounded-full bg-slate-100" />
                      <div className="h-5 w-10 sm:h-7 sm:w-14 animate-pulse rounded-md sm:rounded-xl bg-slate-100" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <p className="text-lg font-extrabold text-[#111111]">No spaces found</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">Try another search or filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 min-[360px]:gap-3 sm:gap-5 lg:gap-6">
            {visible.map(space => {
              const cardImages =
                space.images?.length > 0 ? space.images : space.imageUrl ? [space.imageUrl] : [];

              return (
                <div
                  key={space.id}
                  onClick={() => setSelected(space)}
                  className="group flex flex-col justify-between overflow-hidden rounded-[20px] min-[360px]:rounded-[24px] sm:rounded-[36px] border border-slate-100 bg-white p-2 min-[360px]:p-2.5 sm:p-4 text-left shadow-xs transition hover:-translate-y-1 hover:shadow-md cursor-pointer"
                >
                  <div>
                    {/* Space Image Container with scrollable images */}
                    <ImageCarousel
                      images={cardImages}
                      alt={space.name}
                      aspectRatio="aspect-4/3"
                      roundedClassName="rounded-[16px] min-[360px]:rounded-[18px] sm:rounded-[26px]"
                      onImageClick={() => setSelected(space)}
                      badge={
                        <div className="pointer-events-none absolute right-1.5 top-1.5 sm:right-3 sm:top-3 z-10">
                          <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-[#EAF8F1] backdrop-blur-xs px-1.5 min-[360px]:px-2 sm:px-3.5 py-0.5 sm:py-1.5 text-[9px] min-[360px]:text-[10px] sm:text-sm font-bold text-[#16A34A] shadow-xs">
                            <Users size={11} className="shrink-0 text-[#16A34A] stroke-[2.2] sm:w-[15px] sm:h-[15px]" />
                            <span>
                              {space.capacity > 0
                                ? `${space.capacity} people`
                                : 'Flexible'}
                            </span>
                          </span>
                        </div>
                      }
                      showDots={cardImages.length > 1}
                      showArrows={cardImages.length > 1}
                    />

                    {/* Space Title */}
                    <div className="mt-2 sm:mt-4">
                      <h3
                        className="truncate font-display text-xs min-[360px]:text-sm sm:text-lg lg:text-xl font-black text-[#111827] tracking-tight"
                        title={space.name}
                      >
                        {space.name}
                      </h3>
                    </div>

                    {/* Category Pill */}
                    <div className="mt-1 sm:mt-2 flex items-center">
                      <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-md min-[360px]:rounded-lg sm:rounded-2xl bg-[#F3E8FF] px-1.5 min-[360px]:px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] min-[360px]:text-[10px] sm:text-sm font-bold text-[#7C3AED]">
                        <Building2 size={11} className="shrink-0 text-[#7C3AED] sm:w-[15px] sm:h-[15px]" />
                        <span className="truncate">
                          {space.category || space.spaceType || 'Studio'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Price stays fully visible; share & book are compact so price never crowds or truncates */}
                  <div className="mt-2 sm:mt-4 flex items-center justify-between gap-1 pt-1.5 sm:pt-2 border-t border-slate-50 min-w-0">
                    <div className="min-w-0 shrink-0">
                      <span className="text-[8px] min-[360px]:text-[9px] sm:text-xs font-semibold text-slate-500 block leading-tight">
                        From
                      </span>
                      <div className="flex items-baseline gap-0.5 mt-0.5">
                        <span className="text-[11px] min-[360px]:text-xs min-[400px]:text-sm sm:text-lg lg:text-xl font-black leading-tight tracking-tight text-[#111827] whitespace-nowrap">
                          ₹{formatInr(space.fromPrice)}
                        </span>
                        <span className="text-[7.5px] min-[360px]:text-[8.5px] sm:text-xs font-bold text-slate-500 shrink-0">
                          /hr
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          void handleShare(space);
                        }}
                        className="flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-[#F3E8FF] hover:bg-[#E9D5FF] text-[#7C3AED] transition active:scale-95 cursor-pointer shrink-0"
                        title="Share space"
                        aria-label="Share space"
                      >
                        <Share2 className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 stroke-[2.2]" />
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleBook(space);
                        }}
                        className="inline-flex items-center justify-center gap-0.5 sm:gap-1 rounded-md sm:rounded-xl bg-[#6344E7] hover:bg-[#5235D9] px-1.5 sm:px-3 py-1 sm:py-1.5 text-[8.5px] min-[360px]:text-[9.5px] sm:text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <CalendarCheck className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 stroke-[2.2]" />
                        <span>Book</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selected ? (
        <SpaceDetailsModal
          space={selected}
          initialState={initialModalState}
          onClose={() => {
            setSelected(null);
            setInitialModalState(null);
            try {
              sessionStorage.removeItem('coworking_modal_restore');
            } catch {}
          }}
        />
      ) : null}
      <ShareSpaceModal
        space={shareSpace}
        isOpen={Boolean(shareSpace)}
        onClose={() => setShareSpace(null)}
      />
      <SpaceBookingModal
        space={bookingSpace}
        isOpen={Boolean(bookingSpace)}
        onClose={() => setBookingSpace(null)}
      />
      <CoworkingBookingModal
        isOpen={Boolean(coworkingBookingSpace)}
        onClose={() => setCoworkingBookingSpace(null)}
        space={coworkingBookingSpace}
      />
      <CoworkingRateCardModal
        isOpen={showRateCardModal}
        onClose={() => setShowRateCardModal(false)}
        onSelectPass={passId => {
          const matched =
            coworkingList.find(
              p =>
                p.id.toLowerCase().includes(passId.toLowerCase()) ||
                p.name.toLowerCase().includes(passId.toLowerCase()),
            ) || coworkingList[0];
          if (matched) {
            setCoworkingBookingSpace(matched);
          }
        }}
      />
    </div>
  );
}
