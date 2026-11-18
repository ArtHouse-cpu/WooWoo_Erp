import {useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  X,
  Share2,
  Info,
  Sparkles,
  // MessageSquare,
  Calendar,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Play,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  PlayCircle,
  Quote,
  ArrowRight,
  Plus,
  Star,
  Crown,
  RefreshCw,
  FileText,
  CheckSquare,
  PartyPopper,
  Drama,
  Palette,
  MoreHorizontal,
  GraduationCap,
  Mic,
  Wifi,
  Volume2,
  AirVent,
  Projector,
  Armchair,
  Sofa,
  Send,
  Pencil,
  Camera,
  Check,
  Clapperboard,
  Coffee,
  Gift,
  Code,
  Briefcase,
  Newspaper,
  BookOpen,
  Gamepad2,
} from 'lucide-react';
import {toast} from 'sonner';
import type {SpaceCard} from '../../services/space.service';
import {
  formatInr,
  copySpaceLink,
  MEMBERSHIP_TIERS,
} from './spaceActions';
import {ShareSpaceModal} from './ShareSpaceModal';
import {CustomerSpaceCheckout} from './CustomerSpaceCheckout';
import {CoworkingBookingModal} from './CoworkingBookingModal';
import {ImageCarousel} from '../ui/ImageCarousel';

export const COWORKING_PLANS = [
  {
    id: 'day',
    name: '1 Day Pass',
    regularPrice: 399,
    memberPrice: 319,
    savings: 80,
  },
  {
    id: 'weekly',
    name: 'Weekly Pass',
    regularPrice: 2599,
    memberPrice: 2079,
    savings: 520,
  },
  {
    id: 'monthly',
    name: 'Monthly Pass',
    regularPrice: 7999,
    memberPrice: 5999,
    savings: 2000,
  },
  {
    id: '3months',
    name: '3 Months Pass',
    regularPrice: 19999,
    memberPrice: 13999,
    savings: 6000,
  },
  {
    id: '6months',
    name: '6 Months Pass',
    regularPrice: 39998,
    memberPrice: 27999,
    savings: 12000,
  },
];

export const COWORKING_INFO_PHOTOS = [
  'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
];

function formatDateDisplay(d: Date): string {
  const day = d.getDate();
  const month = new Intl.DateTimeFormat('en-GB', {month: 'short'}).format(d);
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatTime12(time24: string): string {
  if (!time24) return '06:00 AM';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr ? mStr.padStart(2, '0') : '00';
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
}

function getDurationHours(start: string, end: string): number {
  if (!start || !end) return 3;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let startMinutes = sh * 60 + (sm || 0);
  let endMinutes = eh * 60 + (em || 0);
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  const diffHours = (endMinutes - startMinutes) / 60;
  return Math.round(diffHours * 10) / 10;
}

function getCalendarGrid(year: number, month: number) {
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInCurrent = new Date(year, month + 1, 0).getDate();
  const daysInPrevious = new Date(year, month, 0).getDate();

  const cells: Array<{
    dayNumber: number;
    monthOffset: -1 | 0 | 1;
    date: Date;
  }> = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevious - i;
    cells.push({
      dayNumber: d,
      monthOffset: -1,
      date: new Date(year, month - 1, d),
    });
  }

  // Current month days
  for (let d = 1; d <= daysInCurrent; d++) {
    cells.push({
      dayNumber: d,
      monthOffset: 0,
      date: new Date(year, month, d),
    });
  }

  // Next month leading days to complete grid (multiples of 7, up to 35 or 42)
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    cells.push({
      dayNumber: d,
      monthOffset: 1,
      date: new Date(year, month + 1, d),
    });
  }

  return cells;
}

function ReviewIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <polygon
        points="12 7.5 13.09 9.7 15.5 10.05 13.75 11.76 14.16 14.16 12 13.02 9.84 14.16 10.25 11.76 8.5 10.05 10.91 9.7 12 7.5"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function ClocheIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 4v2" />
      <path d="M4 17h16" />
      <path d="M4 17c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      <line x1="2" y1="19.5" x2="22" y2="19.5" />
    </svg>
  );
}

function RatingSlider({
  value,
  onChange,
  min = 1,
  max = 5,
  step = 0.1,
}: {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className="relative flex-1 flex items-center min-w-0">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-2.5 sm:h-3 rounded-full appearance-none cursor-pointer accent-[#7C3AED] focus:outline-none"
        style={{
          background: `linear-gradient(to right, #7C3AED 0%, #7C3AED ${percentage}%, #E2E8F0 ${percentage}%, #E2E8F0 100%)`,
        }}
      />
    </div>
  );
}

type MediaModalItem = {
  id: string;
  type: 'photo' | 'video';
  url: string;
  poster?: string;
  duration?: string;
  title?: string;
  category?: 'parties' | 'shows' | 'meetings' | 'workshops' | 'more';
  order?: number;
};

type FeedbackReview = {
  id: string;
  name: string;
  avatar?: string;
  avatarInitial?: string;
  rating: number;
  serviceRating?: number;
  cleanlinessRating?: number;
  ambienceRating?: number;
  date: string;
  comment: string;
  media?: Array<{
    id: string;
    type: 'photo' | 'video';
    url: string;
    poster?: string;
    duration?: string;
    title?: string;
  }>;
};

export function SpaceDetailsModal({
  space,
  onClose,
}: {
  space: SpaceCard | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info' | 'highlights' | 'feedback'>('info');
  const [activeSegment, setActiveSegment] = useState<'weekday' | 'weekend'>('weekend');
  const [isDiscountsOpen, setIsDiscountsOpen] = useState(false);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsActiveTab, setTermsActiveTab] = useState<'disclaimer' | 'guidelines' | 'tcs'>('disclaimer');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const timePickerRef = useRef<HTMLDivElement | null>(null);

  // Highlights Media state
  const [mediaCategory, setMediaCategory] = useState<'all' | 'parties' | 'shows' | 'meetings' | 'workshops' | 'more'>('all');
  const [mediaSortOrder, setMediaSortOrder] = useState<'recent' | 'oldest'>('recent');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement | null>(null);
  const [activeLightboxPhotos, setActiveLightboxPhotos] = useState<MediaModalItem[]>([]);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);
  const [previewVideo, setPreviewVideo] = useState<MediaModalItem | null>(null);

  const openPhotoLightbox = (photoList: MediaModalItem[], index: number) => {
    setActiveLightboxPhotos(photoList);
    setActiveLightboxIndex(index);
  };

  // Feedback Tab state
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'photos' | 'videos' | 'reviews'>('all');
  const [showAddFeedbackModal, setShowAddFeedbackModal] = useState(false);
  const [newFeedbackName, setNewFeedbackName] = useState('');
  const [newFeedbackRating, setNewFeedbackRating] = useState(4.8);
  const [newFeedbackComment, setNewFeedbackComment] = useState('');
  const [newFeedbackService, setNewFeedbackService] = useState(4.9);
  const [newFeedbackCleanliness, setNewFeedbackCleanliness] = useState(4.8);
  const [newFeedbackAmbience, setNewFeedbackAmbience] = useState(4.7);
  const [wouldBookAgain, setWouldBookAgain] = useState<boolean>(true);
  const [wouldRecommend, setWouldRecommend] = useState<boolean>(true);
  const [reviewMediaList, setReviewMediaList] = useState<
    Array<{
      id: string;
      type: 'photo' | 'video';
      url: string;
      poster?: string;
      duration?: string;
    }>
  >([
    {
      id: 'att-1',
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'att-2',
      type: 'video',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      poster: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
      duration: '0:56',
    },
    {
      id: 'att-3',
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    },
  ]);
  const reviewFileInputRef = useRef<HTMLInputElement | null>(null);

  const [reviewFilter, setReviewFilter] = useState<'all' | 'top' | 'service' | 'cleanliness' | 'ambience'>('all');
  const [reviewSortOrder, setReviewSortOrder] = useState<'recent' | 'highest' | 'lowest'>('recent');
  const [showReviewSortDropdown, setShowReviewSortDropdown] = useState(false);
  const reviewSortRef = useRef<HTMLDivElement | null>(null);

  const [reviews, setReviews] = useState<FeedbackReview[]>([
    {
      id: 'rev-riya',
      name: 'Riya Sharma',
      avatarInitial: 'R',
      rating: 5.0,
      serviceRating: 5.0,
      cleanlinessRating: 5.0,
      ambienceRating: 5.0,
      date: '2 days ago',
      comment:
        'Amazing space! Perfect for our team meeting. Clean, well-managed and the setup was just right. Highly recommended!',
      media: [
        {
          id: 'riya-med-1',
          type: 'photo',
          url: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
          title: 'Courtyard setup',
        },
        {
          id: 'riya-med-2',
          type: 'photo',
          url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
          title: 'Auditorium stage',
        },
        {
          id: 'riya-med-3',
          type: 'video',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          poster: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
          duration: '0:56',
          title: 'Dining setup tour',
        },
      ],
    },
    {
      id: 'rev-aman',
      name: 'Aman Verma',
      avatarInitial: 'A',
      rating: 4.0,
      serviceRating: 4.0,
      cleanlinessRating: 4.0,
      ambienceRating: 4.0,
      date: '5 days ago',
      comment: 'Great experience! The space is versatile and the team is very supportive.',
    },
    {
      id: 'rev-1',
      name: 'Rohit Sharma',
      avatarInitial: 'R',
      rating: 5.0,
      serviceRating: 5.0,
      cleanlinessRating: 4.9,
      ambienceRating: 5.0,
      date: '1 week ago',
      comment: 'Amazing space! Clean, cozy and perfect for work and meetings. 🌟',
    },
    {
      id: 'rev-2',
      name: 'Priya Sharma',
      avatarInitial: 'P',
      rating: 5.0,
      serviceRating: 4.8,
      cleanlinessRating: 5.0,
      ambienceRating: 4.9,
      date: '2 weeks ago',
      comment: 'The natural lighting and creative vibe here is unmatched. Will book again!',
    },
    {
      id: 'rev-3',
      name: 'Ananya Deshmukh',
      avatarInitial: 'A',
      rating: 5.0,
      serviceRating: 4.9,
      cleanlinessRating: 4.8,
      ambienceRating: 4.8,
      date: '3 weeks ago',
      comment: 'Calm, productive, and comfortable for long creative sessions. Staff is super supportive.',
    },
  ]);

  // Date selection state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Custom Timing state
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('09:00');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showCoworkingBookingModal, setShowCoworkingBookingModal] = useState(false);

  // Coworking specific states
  const isCoworking = useMemo(() => {
    if (!space) return false;
    const typeStr = (space.spaceType || '').toLowerCase();
    const catStr = (space.category || '').toLowerCase();
    const nameStr = (space.name || '').toLowerCase();
    return (
      typeStr === 'coworking' ||
      catStr.includes('cowork') ||
      nameStr.includes('pass') ||
      nameStr.includes('cowork')
    );
  }, [space]);

  const [selectedPlanId, setSelectedPlanId] = useState<string>('day');
  const [selectedPriceType, setSelectedPriceType] = useState<'regular' | 'membership'>('membership');
  const [bookingPassOverride, setBookingPassOverride] = useState<SpaceCard | null>(null);

  useEffect(() => {
    if (!space) return;
    const lower = (space.name || '').toLowerCase();
    if (lower.includes('weekly')) {
      setSelectedPlanId('weekly');
    } else if (lower.includes('3 month')) {
      setSelectedPlanId('3months');
    } else if (lower.includes('6 month')) {
      setSelectedPlanId('6months');
    } else if (lower.includes('monthly')) {
      setSelectedPlanId('monthly');
    } else {
      setSelectedPlanId('day');
    }
    setSelectedPriceType('membership');
    setBookingPassOverride(null);
  }, [space]);

  const handleBookCoworkingPlan = () => {
    if (!space) return;
    setShowCoworkingBookingModal(true);
  };

  // Reset scroll position to top when switching between Info, Highlights, and Feedback
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  useEffect(() => {
    if (!space) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showTermsModal) {
          setShowTermsModal(false);
        } else if (showAddFeedbackModal) {
          setShowAddFeedbackModal(false);
        } else if (showSortDropdown) {
          setShowSortDropdown(false);
        } else if (showReviewSortDropdown) {
          setShowReviewSortDropdown(false);
        } else if (activeLightboxIndex !== null) {
          setActiveLightboxIndex(null);
        } else if (previewVideo !== null) {
          setPreviewVideo(null);
        } else if (showDatePicker) {
          setShowDatePicker(false);
        } else if (showTimePicker) {
          setShowTimePicker(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [space, onClose, showDatePicker, showTimePicker, showTermsModal, showSortDropdown, showReviewSortDropdown, activeLightboxIndex, previewVideo, showAddFeedbackModal]);

  // Close calendar, time and sort popovers on outside click
  useEffect(() => {
    if (!showDatePicker && !showTimePicker && !showSortDropdown && !showReviewSortDropdown) return;
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showDatePicker && calendarRef.current && !calendarRef.current.contains(target)) {
        setShowDatePicker(false);
      }
      if (showTimePicker && timePickerRef.current && !timePickerRef.current.contains(target)) {
        setShowTimePicker(false);
      }
      if (showSortDropdown && sortDropdownRef.current && !sortDropdownRef.current.contains(target)) {
        setShowSortDropdown(false);
      }
      if (showReviewSortDropdown && reviewSortRef.current && !reviewSortRef.current.contains(target)) {
        setShowReviewSortDropdown(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [showDatePicker, showTimePicker, showSortDropdown, showReviewSortDropdown]);

  // Highlights media aggregation matching reference UI (media_1794653412858_f89dae6b.jpg)
  const highlightMedia = useMemo<MediaModalItem[]>(() => {
    const spaceName = space?.name || 'Space';
    return [
      {
        id: 'hl-party-1',
        type: 'photo',
        category: 'parties',
        url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
        title: `${spaceName} - Celebrations & Parties`,
        order: 1,
      },
      {
        id: 'hl-show-1',
        type: 'photo',
        category: 'shows',
        url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80',
        title: `${spaceName} - Outdoor Movie Screening`,
        order: 2,
      },
      {
        id: 'hl-meeting-1',
        type: 'photo',
        category: 'meetings',
        url: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
        title: `${spaceName} - Garden Meetings & Networking`,
        order: 3,
      },
      {
        id: 'hl-show-2',
        type: 'photo',
        category: 'shows',
        url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
        title: `${spaceName} - Live Stage & Performances`,
        order: 4,
      },
      {
        id: 'hl-workshop-1',
        type: 'photo',
        category: 'workshops',
        url: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=80',
        title: `${spaceName} - Creative Painting Workshops`,
        order: 5,
      },
      {
        id: 'hl-more-1',
        type: 'photo',
        category: 'more',
        url: 'https://images.unsplash.com/photo-1585647347384-2593bc35786b?auto=format&fit=crop&w=800&q=80',
        title: `${spaceName} - Open-Air Gatherings`,
        order: 6,
      },
      {
        id: 'hl-party-2',
        type: 'photo',
        category: 'parties',
        url: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=800&q=80',
        title: `${spaceName} - Banquet & Dinner Setup`,
        order: 7,
      },
      {
        id: 'hl-party-3',
        type: 'photo',
        category: 'parties',
        url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
        title: `${spaceName} - Night Music & Dancing`,
        order: 8,
      },
    ];
  }, [space]);

  const categoryFilteredMedia = useMemo(() => {
    if (mediaCategory === 'all') return highlightMedia;
    return highlightMedia.filter(m => m.category === mediaCategory);
  }, [highlightMedia, mediaCategory]);

  const sortedMedia = useMemo(() => {
    const list = [...categoryFilteredMedia];
    if (mediaSortOrder === 'recent') {
      return list.sort((a, b) => (a.order || 0) - (b.order || 0));
    } else {
      return list.sort((a, b) => (b.order || 0) - (a.order || 0));
    }
  }, [categoryFilteredMedia, mediaSortOrder]);

  const infoPhotos = useMemo(() => {
    if (!space) return [];
    if (isCoworking) {
      const dbPhotos = [space.imageUrl, ...(space.images || [])].filter(Boolean) as string[];
      return dbPhotos.length > 0 ? dbPhotos : COWORKING_INFO_PHOTOS;
    }
    const set = [space.imageUrl, ...(space.images || [])].filter(Boolean) as string[];
    return set.length > 0 ? set : [];
  }, [space, isCoworking]);

  const filteredReviews = useMemo(() => {
    let list = [...reviews];
    if (reviewFilter === 'top') {
      list = list.filter(r => r.rating >= 4.8);
    } else if (reviewFilter === 'service') {
      list = list.filter(r => (r.serviceRating ?? r.rating) >= 4.5);
    } else if (reviewFilter === 'cleanliness') {
      list = list.filter(r => (r.cleanlinessRating ?? r.rating) >= 4.5);
    } else if (reviewFilter === 'ambience') {
      list = list.filter(r => (r.ambienceRating ?? r.rating) >= 4.5);
    }

    if (reviewSortOrder === 'highest') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (reviewSortOrder === 'lowest') {
      list.sort((a, b) => a.rating - b.rating);
    }
    return list;
  }, [reviews, reviewFilter, reviewSortOrder]);

  // Visitor Photos for Feedback tab (matching the 24 photos shown in the reference screenshot)
  const visitorPhotos = useMemo<MediaModalItem[]>(() => {
    const list: MediaModalItem[] = [];
    if (space?.imageUrl) {
      list.push({
        id: 'space-main-photo',
        type: 'photo',
        url: space.imageUrl,
        title: `${space.name} Main View`,
      });
    }
    if (Array.isArray(space?.images)) {
      space.images.forEach((url, i) => {
        if (url && !list.some(it => it.url === url)) {
          list.push({
            id: `space-photo-${i}`,
            type: 'photo',
            url,
            title: `${space.name} Photo ${i + 1}`,
          });
        }
      });
    }

    const curatedVisitorPhotos = [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1579783928621-7a13d66a62d1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1565192647048-f997ded87958?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1499783300057-475a43b27b6a?auto=format&fit=crop&w=800&q=80',
    ];

    for (const url of curatedVisitorPhotos) {
      if (list.length >= 24) break;
      if (!list.some(it => it.url === url)) {
        list.push({
          id: `vis-photo-${list.length}`,
          type: 'photo',
          url,
          title: `Visitor Moment ${list.length + 1}`,
        });
      }
    }

    return list;
  }, [space]);

  // Visitor Videos for Feedback tab (matching the 6 videos shown in the reference screenshot)
  const visitorVideos = useMemo<MediaModalItem[]>(() => {
    const list: MediaModalItem[] = [];
    if (Array.isArray(space?.videos)) {
      space.videos.forEach((url, i) => {
        if (url) {
          list.push({
            id: `space-video-${i}`,
            type: 'video',
            url,
            poster: space?.imageUrl || undefined,
            duration: '01:24',
            title: `${space.name} Visitor Video ${i + 1}`,
          });
        }
      });
    }

    const curatedVisitorVideos: MediaModalItem[] = [
      {
        id: 'vis-video-1',
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        poster: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
        duration: '01:24',
        title: 'Sunset Terrace Session',
      },
      {
        id: 'vis-video-2',
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
        poster: 'https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=800&q=80',
        duration: '02:10',
        title: 'Studio Lighting & Vibe',
      },
      {
        id: 'vis-video-3',
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        poster: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
        duration: '00:58',
        title: 'Pottery Workshop Highlights',
      },
      {
        id: 'vis-video-4',
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        poster: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80',
        duration: '01:45',
        title: 'Creative Meetup & Coffee',
      },
      {
        id: 'vis-video-5',
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
        poster: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
        duration: '01:12',
        title: 'Canvas Painting Session',
      },
      {
        id: 'vis-video-6',
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        poster: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
        duration: '02:35',
        title: 'Evening Acoustic Vibe',
      },
    ];

    for (const v of curatedVisitorVideos) {
      if (list.length >= 6) break;
      if (!list.some(it => it.url === v.url)) {
        list.push(v);
      }
    }

    return list;
  }, [space]);

  if (!space) return null;

  const handleFilesAdded = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newItems: Array<{
      id: string;
      type: 'photo' | 'video';
      url: string;
      poster?: string;
      duration?: string;
    }> = [];

    Array.from(files).forEach((file, i) => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video');
      newItems.push({
        id: `upload-${Date.now()}-${i}`,
        type: isVideo ? 'video' : 'photo',
        url,
        poster: isVideo ? undefined : url,
        duration: isVideo ? '0:45' : undefined,
      });
    });

    setReviewMediaList(prev => [...prev, ...newItems]);
    toast.success(`${files.length} media item(s) attached`);
  };

  const handleAddFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFeedbackName.trim() || 'You';
    const comment =
      newFeedbackComment.trim() || 'Amazing experience! Clean, well-managed and perfect setup.';
    const newReview: FeedbackReview = {
      id: `review-${Date.now()}`,
      name,
      avatarInitial: name.charAt(0).toUpperCase() || 'U',
      rating: newFeedbackRating,
      serviceRating: newFeedbackService,
      cleanlinessRating: newFeedbackCleanliness,
      ambienceRating: newFeedbackAmbience,
      date: 'Just now',
      comment,
      media: reviewMediaList.length > 0 ? [...reviewMediaList] : undefined,
    };
    setReviews(prev => [newReview, ...prev]);
    setShowAddFeedbackModal(false);
    toast.success('Thank you for sharing your experience!');
  };

  // Prices
  const weekdayPrice = space.weekdayPrice ?? space.fromPrice;
  const weekendPrice = space.weekendPrice ?? Math.round(weekdayPrice * 1.3);
  const activePrice = activeSegment === 'weekday' ? weekdayPrice : weekendPrice;
  const comparePrice =
    activeSegment === 'weekday' && weekendPrice > weekdayPrice ? weekendPrice : null;

  // Selected Membership discount auto-calculation
  const selectedTier = MEMBERSHIP_TIERS.find(t => t.id === selectedMembershipId) || null;
  const discountRate = selectedTier ? selectedTier.discountPercent / 100 : 0;
  const unitDiscount = Math.round(activePrice * discountRate);
  const finalUnitPrice = Math.max(0, activePrice - unitDiscount);

  const handleShare = async () => {
    // Open share modal on mobile screen
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowShareModal(true);
      return;
    }
    // Desktop: copy link directly to clipboard
    try {
      await copySpaceLink(space.id, selectedTier?.id);
      toast.success('Space link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleBook = () => {
    setShowBookingModal(true);
  };

  const monthName = new Intl.DateTimeFormat('en-US', {
    month: 'long',
  }).format(new Date(viewYear, viewMonth, 1));
  const monthLabel = `${monthName}, ${viewYear}`;

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(y => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(y => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleSelectDay = (cellDate: Date) => {
    setSelectedDate(cellDate);
    const dayOfWeek = cellDate.getDay();
    // Auto-select weekend for Sat & Sun, weekday for Mon-Fri
    setActiveSegment(dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : 'weekday');
    setShowDatePicker(false);
  };

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const calendarDays = getCalendarGrid(viewYear, viewMonth);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4 backdrop-blur-xs"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="space-details-title"
        className="flex h-[90dvh] min-h-[90dvh] max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:h-[85vh] sm:min-h-[85vh] sm:max-h-[90vh] sm:rounded-[32px] text-left"
      >
        {/* Header: Space Name and Capacity badge on left, Terms button and Close button on right */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3.5 sm:px-5 pt-3.5 sm:pt-4 pb-2.5 sm:pb-3 gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 pr-1 sm:pr-2">
            <h2
              id="space-details-title"
              className="truncate font-display text-xs min-[340px]:text-sm sm:text-xl md:text-2xl font-black text-[#111111] leading-tight"
              title={isCoworking ? 'CoWorking Space' : space.name}
            >
              {isCoworking ? 'CoWorking Space' : space.name}
            </h2>
            <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-[#F3E8FF] px-2 sm:px-3 py-0.5 sm:py-1 text-[10.5px] sm:text-xs font-bold text-[#7C3AED] shrink-0 whitespace-nowrap">
              <Users size={11} className="sm:w-[13px] sm:h-[13px] stroke-[2.5]" />
              <span>{isCoworking ? '1 Person' : `Up to ${space.capacity > 0 ? space.capacity : 60}`}</span>
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="inline-flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-sm font-bold text-[#6344E7] hover:bg-purple-50 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl transition cursor-pointer shrink-0"
            >
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Terms</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close space details"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Tab navigation: Info, Highlights (Feedback temporarily commented out) */}
        <div className="grid grid-cols-2 shrink-0 px-5 pt-3 pb-2 text-xs sm:text-sm font-bold gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl transition cursor-pointer font-bold ${
              activeTab === 'info'
                ? 'bg-[#F3E8FF] text-[#7C3AED] shadow-3xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Info size={16} />
            <span>Info</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('highlights')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl transition cursor-pointer font-bold ${
              activeTab === 'highlights'
                ? 'bg-[#F3E8FF] text-[#7C3AED] shadow-3xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles size={16} />
            <span>Highlights</span>
          </button>
          {/* Temporarily hidden: Feedback tab
          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl transition cursor-pointer font-bold ${
              activeTab === 'feedback'
                ? 'bg-[#F3E8FF] text-[#7C3AED] shadow-3xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare size={16} />
            <span>Feedback</span>
          </button>
          */}
        </div>

        {/* Modal Scrollable Content */}
        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] px-5 py-4 space-y-4"
        >
          {activeTab === 'info' && (
            <>
              {/* Space Photo Carousel with scrollable/swipeable images & pagination dots */}
              <div className="relative">
                <ImageCarousel
                  images={infoPhotos}
                  alt={space.name}
                  aspectRatio="aspect-16/10"
                  roundedClassName="rounded-2xl"
                  onImageClick={idx => {
                    if (infoPhotos.length > 0) {
                      openPhotoLightbox(
                        infoPhotos.map((url, i) => ({
                          id: `info-photo-${i}`,
                          type: 'photo',
                          url,
                          title: space.name,
                        })),
                        idx < infoPhotos.length ? idx : 0,
                      );
                    }
                  }}
                  showDots={infoPhotos.length > 1}
                  showArrows={infoPhotos.length > 1}
                  badge={
                    <div className="absolute bottom-2.5 left-2.5 z-20 pointer-events-none">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-xs px-3 py-1 text-xs font-bold text-emerald-700 shadow-md border border-emerald-100">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Available
                      </span>
                    </div>
                  }
                />
              </div>

              {isCoworking ? (
                <>
                  {/* Operating Hours & Free Tea/Coffee Card */}
                  <div className="rounded-2xl border border-purple-100/70 bg-[#FAF7FF] p-3 sm:p-3.5 grid grid-cols-2 divide-x divide-purple-100 text-left shadow-3xs">
                    {/* Operating hours */}
                    <div className="flex items-center gap-2.5 sm:gap-3 pr-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <Clock size={18} className="stroke-[2.2]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-display font-black text-xs sm:text-sm text-[#111111] leading-tight truncate">
                          8:00 AM – 10:00 PM
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                          All 7 Days
                        </p>
                      </div>
                    </div>

                    {/* Free Tea/Coffee */}
                    <div className="flex items-center gap-2.5 sm:gap-3 pl-3 sm:pl-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-[#7C3AED]">
                        <Coffee size={18} className="stroke-[2.2]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-display font-black text-xs sm:text-sm text-[#111111] leading-tight truncate">
                          FREE Tea/Coffee
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                          2 Times / Day
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cashback Banner */}
                  <div className="rounded-2xl border border-purple-100 bg-[#FAF7FF] p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-3xs cursor-pointer hover:bg-purple-50/70 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-3xs">
                        <Gift size={20} className="stroke-[2.2]" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-display font-black text-xs sm:text-sm text-[#6344E7] leading-tight">
                          ₹500 Cashback on Monthly &amp; Above Plans
                        </h4>
                        <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-0.5 leading-snug truncate">
                          Redeem on inhouse food orders, supplies shopping, space bookings.
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-400 shrink-0" />
                  </div>

                  {/* Best For Section */}
                  <div>
                    <h4 className="font-display font-black text-sm text-[#111111] mb-2">
                      Best For
                    </h4>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {[
                        {label: 'Artists', icon: Mic},
                        {label: 'Designers', icon: Clapperboard},
                        {label: 'Techies', icon: Code},
                        {label: 'Students', icon: GraduationCap},
                        {label: 'Corporate Professionals', icon: Briefcase},
                      ].map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <span
                            key={idx}
                            className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-2xl border border-purple-100 bg-[#FBF9FF] px-3 py-1.5 text-xs font-bold text-[#6344E7]"
                          >
                            <Icon size={13} className="text-[#6344E7] shrink-0" />
                            <span>{item.label}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Amenities Section */}
                  <div>
                    <h4 className="font-display font-black text-sm text-[#111111] mb-2">
                      Amenities
                    </h4>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-3xs">
                        <Wifi size={14} className="text-slate-600 shrink-0" />
                        <span>WiFi</span>
                        <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-black text-emerald-700">
                          FREE
                        </span>
                      </span>
                      <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-3xs">
                        <Newspaper size={14} className="text-slate-600 shrink-0" />
                        <span>Daily Newspaper</span>
                      </span>
                      <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-3xs">
                        <BookOpen size={14} className="text-slate-600 shrink-0" />
                        <span>In-house Books</span>
                      </span>
                      <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-3xs">
                        <Gamepad2 size={14} className="text-slate-600 shrink-0" />
                        <span>Games</span>
                      </span>
                      <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-3xs">
                        <Armchair size={14} className="text-slate-600 shrink-0" />
                        <span>Flexible Sitting</span>
                      </span>
                    </div>
                  </div>

                  {/* Choose Your Plan Section */}
                  <div>
                    <h4 className="font-display font-black text-sm sm:text-base text-[#111111] mb-2.5">
                      Choose Your Plan
                    </h4>
                    <div className="rounded-2xl border border-purple-100 bg-white overflow-hidden shadow-xs">
                      {/* Table Header */}
                      <div className="flex items-center justify-between bg-[#F8FAFC] border-b border-slate-100 px-3 sm:px-4 py-2.5 text-[10px] sm:text-xs font-bold text-slate-500">
                        <span className="font-extrabold text-slate-700">Plan</span>
                        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                          <span className="text-center w-[74px] sm:w-24 text-slate-600 font-extrabold">Regular</span>
                          <div className="h-3.5 w-px bg-slate-200 shrink-0" />
                          <span className="text-center w-[104px] sm:w-34 flex items-center justify-center gap-1 text-amber-800 font-extrabold">
                            <Crown size={12} className="text-amber-600 fill-amber-600 shrink-0" />
                            <span>Membership Price</span>
                          </span>
                        </div>
                      </div>

                      {/* Plans List */}
                      <div className="divide-y divide-purple-50/80">
                        {COWORKING_PLANS.map(plan => {
                          const isPlanActive = selectedPlanId === plan.id;
                          const isRegularSelected = isPlanActive && selectedPriceType === 'regular';
                          const isMemberSelected = isPlanActive && selectedPriceType === 'membership';

                          return (
                            <div
                              key={plan.id}
                              onClick={() => {
                                setSelectedPlanId(plan.id);
                              }}
                              className={`flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 transition cursor-pointer select-none ${
                                isPlanActive
                                  ? 'bg-[#FAF5FF] border-l-4 border-l-[#7C3AED]'
                                  : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                              }`}
                            >
                              {/* Plan Name */}
                              <div className="min-w-0 pr-2 flex-1">
                                <span
                                  className={`text-xs sm:text-sm truncate block ${
                                    isPlanActive ? 'text-[#7C3AED] font-black' : 'text-[#111111] font-bold'
                                  }`}
                                >
                                  {plan.name}
                                </span>
                              </div>

                              {/* Prices with Selectable Bullets */}
                              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                                {/* Regular Price with Bullet */}
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedPlanId(plan.id);
                                    setSelectedPriceType('regular');
                                  }}
                                  className={`flex items-center justify-center gap-1.5 w-[74px] sm:w-24 py-1 px-1 rounded-xl transition cursor-pointer select-none ${
                                    isRegularSelected
                                      ? 'bg-purple-100/70 text-[#7C3AED]'
                                      : 'hover:bg-slate-100/80 text-slate-800'
                                  }`}
                                >
                                  <div
                                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                      isRegularSelected
                                        ? 'border-[#7C3AED] bg-white'
                                        : 'border-slate-300 bg-white'
                                    }`}
                                  >
                                    {isRegularSelected && (
                                      <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#7C3AED]" />
                                    )}
                                  </div>
                                  <span
                                    className={`font-display font-black text-xs sm:text-sm ${
                                      isRegularSelected ? 'text-[#7C3AED]' : 'text-slate-800'
                                    }`}
                                  >
                                    ₹{formatInr(plan.regularPrice)}
                                  </span>
                                </button>

                                {/* Dividing Line */}
                                <div className="h-4 sm:h-5 w-px bg-slate-200 shrink-0" />

                                {/* Member Price with Bullet */}
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedPlanId(plan.id);
                                    setSelectedPriceType('membership');
                                  }}
                                  className={`flex items-center justify-center gap-1.5 w-[104px] sm:w-34 py-1 px-1 rounded-xl transition cursor-pointer select-none ${
                                    isMemberSelected
                                      ? 'bg-purple-100/70 text-[#7C3AED]'
                                      : 'hover:bg-amber-50/70 text-[#854D0E]'
                                  }`}
                                >
                                  <div
                                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                      isMemberSelected
                                        ? 'border-[#7C3AED] bg-white'
                                        : 'border-slate-300 bg-white'
                                    }`}
                                  >
                                    {isMemberSelected && (
                                      <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#7C3AED]" />
                                    )}
                                  </div>
                                  <span
                                    className={`font-display font-black text-xs sm:text-sm ${
                                      isMemberSelected ? 'text-[#7C3AED]' : 'text-[#854D0E]'
                                    }`}
                                  >
                                    ₹{formatInr(plan.memberPrice)}
                                  </span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottom Perks Banner */}
                      <div className="border-t border-amber-200/80 bg-amber-50/60 p-2 sm:p-2.5 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Sparkles size={13} className="text-amber-600 shrink-0" />
                          <p className="text-[9.5px] sm:text-[11px] font-semibold text-amber-900 leading-tight">
                            Enjoy upto 40% discount &amp; 5% cashback on food, supplies and space bookings.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            navigate('/membership?plan=premium&benefits=true');
                          }}
                          className="inline-flex items-center gap-0.5 rounded-full border border-purple-300 bg-white px-2 py-0.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#7C3AED] hover:bg-purple-50 transition shrink-0 cursor-pointer"
                        >
                          <span>Benefits</span>
                          <ChevronRight size={10} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* 4 Metric KPI Cards (Green Theme Matching Reference) */}
              <div className="rounded-[22px] sm:rounded-[26px] border border-[#D5ECD8] bg-[#F7FCF9] p-3 sm:p-4 grid grid-cols-4 divide-x divide-[#E5EFE7] shadow-3xs">
                <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 px-1 sm:px-2">
                  <div className="flex h-8 w-8 sm:h-9.5 sm:w-9.5 shrink-0 items-center justify-center rounded-[11px] sm:rounded-[13px] bg-[#E8F8ED] text-[#15803D]">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.2} />
                  </div>
                  <div className="text-left min-w-0">
                    <span className="block text-xs sm:text-[15px] font-black tracking-tight text-[#111827] leading-tight">50+</span>
                    <span className="block text-[8.5px] sm:text-[11px] font-semibold text-[#475569] leading-tight mt-0.5">Bookings</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 px-1 sm:px-2">
                  <div className="flex h-8 w-8 sm:h-9.5 sm:w-9.5 shrink-0 items-center justify-center rounded-[11px] sm:rounded-[13px] bg-[#E8F8ED] text-[#15803D]">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.2} />
                  </div>
                  <div className="text-left min-w-0">
                    <span className="block text-xs sm:text-[15px] font-black tracking-tight text-[#111827] leading-tight">1.5K+</span>
                    <span className="block text-[8.5px] sm:text-[11px] font-semibold text-[#475569] leading-tight mt-0.5">Hours Booked</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 px-1 sm:px-2">
                  <div className="flex h-8 w-8 sm:h-9.5 sm:w-9.5 shrink-0 items-center justify-center rounded-[11px] sm:rounded-[13px] bg-[#E8F8ED] text-[#15803D]">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.2} />
                  </div>
                  <div className="text-left min-w-0">
                    <span className="block text-xs sm:text-[15px] font-black tracking-tight text-[#111827] leading-tight">5K+</span>
                    <span className="block text-[8.5px] sm:text-[11px] font-semibold text-[#475569] leading-tight mt-0.5">People Served</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 px-1 sm:px-2">
                  <div className="flex h-8 w-8 sm:h-9.5 sm:w-9.5 shrink-0 items-center justify-center rounded-[11px] sm:rounded-[13px] bg-[#E8F8ED] text-[#15803D]">
                    <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.2} />
                  </div>
                  <div className="text-left min-w-0">
                    <span className="block text-xs sm:text-[15px] font-black tracking-tight text-[#111827] leading-tight">30%+</span>
                    <span className="block text-[8.5px] sm:text-[11px] font-semibold text-[#475569] leading-tight mt-0.5">Repeat Bookings</span>
                  </div>
                </div>
              </div>

              {/* Membership Discounts Card */}
              <div className="rounded-2xl border border-purple-100 bg-[#FAF9FF] p-3.5 sm:p-4 text-left transition shadow-3xs">
                {/* Header with Crown and Toggle */}
                <div
                  onClick={() => setIsDiscountsOpen(v => !v)}
                  className="flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200/60 shadow-3xs">
                      <Crown className="h-5 w-5 text-amber-500 fill-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm sm:text-base text-[#111111] leading-tight">
                        Membership Discounts
                      </h4>
                      <p className="text-[11px] sm:text-xs font-medium text-slate-500 leading-tight mt-0.5 truncate">
                        Get exclusive discounts and cashback on space bookings.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-purple-100/60 transition cursor-pointer"
                    aria-label={isDiscountsOpen ? 'Collapse discounts' : 'Expand discounts'}
                  >
                    {isDiscountsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                {/* Membership List */}
                {isDiscountsOpen && (
                  <div className="mt-3.5 space-y-2">
                    {MEMBERSHIP_TIERS.map(tier => {
                      const isSelected = selectedMembershipId === tier.id;
                      const discountAmount = Math.round(activePrice * (tier.discountPercent / 100));
                      const discountedPrice = Math.max(0, activePrice - discountAmount);
                      const IconComponent = tier.icon;

                      return (
                        <div
                          key={tier.id}
                          onClick={() =>
                            setSelectedMembershipId(prev => (prev === tier.id ? null : tier.id))
                          }
                          className={`flex items-center justify-between gap-2 rounded-2xl p-2.5 sm:p-3 transition cursor-pointer ${
                            isSelected
                              ? 'border-2 border-[#6344E7] bg-white shadow-xs'
                              : 'border border-slate-100 bg-white hover:border-purple-200'
                          }`}
                        >
                          {/* Left: Icon, Name, Subtitle */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tier.iconBg} ${tier.iconColor}`}
                            >
                              <IconComponent size={18} className="stroke-[2.2]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-extrabold text-[#111111] truncate">
                                {tier.name}
                              </p>
                              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 mt-0.5 truncate">
                                Up to {tier.discountPercent}% OFF • {tier.cashbackPercent}% Cashback
                              </p>
                            </div>
                          </div>

                          {/* Right: Vertical divider, Savings, Prices, Radio button */}
                          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            <div className="h-7 w-px bg-slate-200" />
                            <div className="text-right">
                              <p className="text-[11px] sm:text-xs font-bold text-[#6344E7] leading-tight">
                                Save ₹{formatInr(discountAmount)}
                              </p>
                              <div className="flex items-baseline justify-end gap-1 mt-0.5">
                                <span className="text-xs sm:text-sm font-black text-[#111111]">
                                  ₹{formatInr(discountedPrice)}
                                </span>
                                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 line-through">
                                  ₹{formatInr(activePrice)}
                                </span>
                              </div>
                            </div>
                            {/* Radio circle */}
                            <div
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                                isSelected ? 'border-[#6344E7]' : 'border-slate-300'
                              }`}
                            >
                              {isSelected && (
                                <div className="h-2.5 w-2.5 rounded-full bg-[#6344E7]" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Learn More About Membership link */}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onClose();
                        navigate('/membership');
                      }}
                      className="w-full mt-2 flex items-center justify-between rounded-2xl bg-[#F3E8FF] hover:bg-[#E9D5FF] px-3.5 py-2.5 text-[#6344E7] transition active:scale-[0.99] cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                        <Info size={16} className="shrink-0" />
                        <span>Learn More About Membership</span>
                      </div>
                      <ChevronRight size={16} className="shrink-0" />
                    </button>
                  </div>
                )}
              </div>

              {/* Best For Section */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-sm sm:text-base text-[#111111]">Best For</h4>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {[
                    {label: 'Parties', icon: PartyPopper},
                    {label: 'Shows', icon: Drama},
                    {label: 'Meetings', icon: Users},
                    {label: 'Workshops', icon: GraduationCap},
                    {label: 'Podcasts', icon: Mic},
                    {label: 'Photo & Film Shoots', icon: Clapperboard},
                    {label: 'Art Exhibitions', icon: Sparkles},
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <span
                        key={idx}
                        className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50/50 px-3 py-1.5 text-xs font-bold text-[#6344E7]"
                      >
                        <Icon size={14} className="text-[#6344E7] shrink-0" />
                        <span>{item.label}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Amenities Section */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-sm sm:text-base text-[#111111]">Amenities</h4>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-3xs">
                    <Wifi size={14} className="text-slate-600 shrink-0" />
                    <span>WiFi</span>
                    <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-black text-emerald-700">FREE</span>
                  </span>
                  <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-3xs">
                    <Volume2 size={14} className="text-slate-600 shrink-0" />
                    <span>Speaker</span>
                    <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-black text-emerald-700">FREE</span>
                  </span>
                  <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-3xs">
                    <AirVent size={14} className="text-slate-600 shrink-0" />
                    <span>Air Conditioned</span>
                  </span>
                  <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-3xs">
                    <Projector size={14} className="text-slate-600 shrink-0" />
                    <span>Projector</span>
                  </span>
                  <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-3xs">
                    <Armchair size={14} className="text-slate-600 shrink-0" />
                    <span>Flexible Setup</span>
                  </span>
                </div>
              </div>

              {/* Date and Time Selectors - always in the same row */}
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-1">
                {/* Dates Selector with Calendar Popover */}
                <div className="relative" ref={calendarRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDatePicker(v => !v);
                      setShowTimePicker(false);
                    }}
                    className="flex w-full h-11 sm:h-12 items-center gap-1.5 sm:gap-2.5 rounded-2xl border border-slate-200 bg-[#F8FAFC] px-2.5 sm:px-3.5 text-xs sm:text-sm font-bold text-slate-800 transition hover:bg-slate-100 cursor-pointer"
                  >
                    <Calendar size={16} className="text-[#6344E7] shrink-0" />
                    <span className="truncate">{formatDateDisplay(selectedDate)}</span>
                  </button>

                  {/* Calendar Dropdown Popover */}
                  {showDatePicker && (
                    <div className="absolute left-0 top-full z-40 mt-1 w-72 max-w-[calc(100vw-40px)] rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                      {/* Calendar Header with Month/Year and navigation arrows */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-extrabold text-slate-900">
                            {monthLabel}
                          </span>
                          <ChevronDown size={13} className="text-slate-500 stroke-[2.5]" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={prevMonth}
                            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                            title="Previous Month"
                          >
                            <ArrowUp size={14} className="stroke-[2.2]" />
                          </button>
                          <button
                            type="button"
                            onClick={nextMonth}
                            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                            title="Next Month"
                          >
                            <ArrowDown size={14} className="stroke-[2.2]" />
                          </button>
                        </div>
                      </div>

                      {/* Weekday Labels (Su Mo Tu We Th Fr Sa) */}
                      <div className="grid grid-cols-7 pt-2 pb-1 text-center text-[11px] font-bold text-slate-600">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(w => (
                          <div key={w} className="py-0.5">
                            {w}
                          </div>
                        ))}
                      </div>

                      {/* Day Number Grid */}
                      <div className="grid grid-cols-7 gap-1 text-center text-xs">
                        {calendarDays.map((cell, idx) => {
                          const isSelected =
                            cell.monthOffset === 0 && isSameDay(cell.date, selectedDate);
                          const isInactive = cell.monthOffset !== 0;

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectDay(cell.date)}
                              className={`h-7 w-7 mx-auto flex items-center justify-center rounded-md text-xs font-semibold transition cursor-pointer ${
                                isSelected
                                  ? 'bg-[#1E293B] text-white font-bold shadow-xs'
                                  : isInactive
                                    ? 'text-slate-300 hover:text-slate-400'
                                    : 'text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {cell.dayNumber}
                            </button>
                          );
                        })}
                      </div>

                      {/* Bottom Quick Links: Clear & Today */}
                      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setShowDatePicker(false)}
                          className="text-[#2563EB] hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const now = new Date();
                            setSelectedDate(now);
                            setViewYear(now.getFullYear());
                            setViewMonth(now.getMonth());
                            const d = now.getDay();
                            setActiveSegment(d === 0 || d === 6 ? 'weekend' : 'weekday');
                            setShowDatePicker(false);
                          }}
                          className="text-[#2563EB] hover:underline cursor-pointer"
                        >
                          Today
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timing Selector with Popover */}
                <div className="relative" ref={timePickerRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTimePicker(v => !v);
                      setShowDatePicker(false);
                    }}
                    className="flex w-full h-11 sm:h-12 items-center justify-between rounded-2xl border border-slate-200 bg-[#F8FAFC] px-2.5 sm:px-3.5 text-xs sm:text-sm font-bold text-slate-800 transition hover:bg-slate-100 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2.5 truncate">
                      <Clock size={16} className="text-[#6344E7] shrink-0" />
                      <span className="truncate">
                        {formatTime12(startTime)} – {formatTime12(endTime)}
                      </span>
                    </div>
                    <ChevronDown size={15} className="text-slate-400 shrink-0" />
                  </button>

                  {/* Time Picker Dropdown Popover */}
                  {showTimePicker && (
                    <div className="absolute right-0 top-full z-40 mt-1 w-72 max-w-[calc(100vw-40px)] rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                        <span className="text-xs font-extrabold text-slate-900">Select Time Slot</span>
                        <span className="text-[11px] font-bold text-[#6344E7]">{getDurationHours(startTime, endTime)} hrs</span>
                      </div>

                      {/* Timing Presets */}
                      <div className="py-2.5 space-y-1.5 border-b border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Popular Slots</p>
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          {[
                            { label: '06:00 – 09:00 AM', start: '06:00', end: '09:00' },
                            { label: '09:00 – 12:00 PM', start: '09:00', end: '12:00' },
                            { label: '12:00 – 03:00 PM', start: '12:00', end: '15:00' },
                            { label: '03:00 – 06:00 PM', start: '15:00', end: '18:00' },
                            { label: '06:00 – 09:00 PM', start: '18:00', end: '21:00' },
                            { label: '06:00 – 11:00 PM', start: '18:00', end: '23:00' },
                          ].map(slot => (
                            <button
                              key={slot.label}
                              type="button"
                              onClick={() => {
                                setStartTime(slot.start);
                                setEndTime(slot.end);
                                setShowTimePicker(false);
                              }}
                              className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-bold transition cursor-pointer ${
                                startTime === slot.start && endTime === slot.end
                                  ? 'bg-[#6344E7] text-white'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {slot.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Start & End time inputs */}
                      <div className="pt-2.5 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Custom Timing</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Start Time</label>
                            <input
                              type="time"
                              value={startTime}
                              onChange={e => setStartTime(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-2.5 py-1.5 text-xs font-extrabold text-slate-800 outline-none focus:border-[#6344E7]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">End Time</label>
                            <input
                              type="time"
                              value={endTime}
                              onChange={e => setEndTime(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-2.5 py-1.5 text-xs font-extrabold text-slate-800 outline-none focus:border-[#6344E7]"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowTimePicker(false)}
                        className="mt-3 w-full rounded-xl bg-[#6344E7] py-2 text-xs font-bold text-white hover:bg-[#5235D9] transition cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Weekday & Weekend Segmented Control & Price Display */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <div className="inline-flex items-center rounded-full bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveSegment('weekday')}
                    className={`rounded-full px-5 py-2 text-xs sm:text-sm font-bold transition cursor-pointer ${
                      activeSegment === 'weekday'
                        ? 'bg-[#6344E7] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Weekday
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSegment('weekend')}
                    className={`rounded-full px-5 py-2 text-xs sm:text-sm font-bold transition cursor-pointer ${
                      activeSegment === 'weekend'
                        ? 'bg-[#6344E7] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Weekend
                  </button>
                </div>

                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-2xl sm:text-3xl font-black text-[#6344E7] tracking-tight">
                      ₹{formatInr(finalUnitPrice || activePrice)}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-500">/ hour</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5">
                    Regular pricing: ₹{formatInr(comparePrice || Math.round((finalUnitPrice || activePrice) * 1.25))} / hour
                  </p>
                </div>
              </div>

              {/* Description */}
              {space.description && (
                <div className="pt-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    About Space
                  </p>
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-600">
                    {space.description}
                  </p>
                </div>
              )}
                </>
              )}
            </>
          )}

          {activeTab === 'highlights' && (
            <div className="space-y-4 py-1 text-left">
              {/* Media Section Header */}
              <div className="flex items-center justify-between gap-3">
                {/* Left: Lavender Square Icon + Title + Count */}
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F3E8FF] text-[#7C3AED]">
                    <ImageIcon size={22} className="stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg sm:text-xl font-black text-[#111111] leading-tight">
                      Media
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      {sortedMedia.length} items
                    </p>
                  </div>
                </div>

                {/* Right: Sort Button with Dropdown */}
                <div className="relative" ref={sortDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowSortDropdown(v => !v)}
                    className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-3xs hover:bg-slate-50 transition cursor-pointer"
                  >
                    <ArrowUpDown size={14} className="stroke-[2.2] text-slate-600" />
                    <span>{mediaSortOrder === 'recent' ? 'Recent to Oldest' : 'Oldest to Recent'}</span>
                    <ChevronDown size={14} className="stroke-[2.2] text-slate-500" />
                  </button>

                  {showSortDropdown && (
                    <div className="absolute right-0 top-full mt-1.5 z-30 w-44 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setMediaSortOrder('recent');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                          mediaSortOrder === 'recent'
                            ? 'bg-[#F3E8FF] text-[#7C3AED]'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Recent to Oldest
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMediaSortOrder('oldest');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                          mediaSortOrder === 'oldest'
                            ? 'bg-[#F3E8FF] text-[#7C3AED]'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Oldest to Recent
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Filter Pills Row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {/* All (8) */}
                <button
                  type="button"
                  onClick={() => setMediaCategory('all')}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shrink-0 ${
                    mediaCategory === 'all'
                      ? 'bg-[#6344E7] text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>All ({highlightMedia.length})</span>
                </button>

                {/* Parties (3) */}
                <button
                  type="button"
                  onClick={() => setMediaCategory(c => (c === 'parties' ? 'all' : 'parties'))}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shrink-0 ${
                    mediaCategory === 'parties'
                      ? 'bg-[#6344E7] text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <PartyPopper size={14} className={mediaCategory === 'parties' ? 'text-white' : 'text-[#7C3AED]'} />
                  <span>Parties (3)</span>
                </button>

                {/* Shows (2) */}
                <button
                  type="button"
                  onClick={() => setMediaCategory(c => (c === 'shows' ? 'all' : 'shows'))}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shrink-0 ${
                    mediaCategory === 'shows'
                      ? 'bg-[#6344E7] text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Drama size={14} className={mediaCategory === 'shows' ? 'text-white' : 'text-[#7C3AED]'} />
                  <span>Shows (2)</span>
                </button>

                {/* Meetings (1) */}
                <button
                  type="button"
                  onClick={() => setMediaCategory(c => (c === 'meetings' ? 'all' : 'meetings'))}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shrink-0 ${
                    mediaCategory === 'meetings'
                      ? 'bg-[#6344E7] text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Users size={14} className={mediaCategory === 'meetings' ? 'text-white' : 'text-[#7C3AED]'} />
                  <span>Meetings (1)</span>
                </button>

                {/* Workshops (1) */}
                <button
                  type="button"
                  onClick={() => setMediaCategory(c => (c === 'workshops' ? 'all' : 'workshops'))}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shrink-0 ${
                    mediaCategory === 'workshops'
                      ? 'bg-[#6344E7] text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Palette size={14} className={mediaCategory === 'workshops' ? 'text-white' : 'text-[#7C3AED]'} />
                  <span>Workshops (1)</span>
                </button>

                {/* More ⌵ */}
                <button
                  type="button"
                  onClick={() => setMediaCategory(c => (c === 'more' ? 'all' : 'more'))}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shrink-0 ${
                    mediaCategory === 'more'
                      ? 'bg-[#6344E7] text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <MoreHorizontal size={14} className={mediaCategory === 'more' ? 'text-white' : 'text-[#7C3AED]'} />
                  <span>More</span>
                  <ChevronDown size={13} className={mediaCategory === 'more' ? 'text-white' : 'text-slate-500'} />
                </button>
              </div>

              {/* 3-Column Highlights Media Grid */}
              {sortedMedia.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-400">
                  <ImageIcon className="mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">No media available in this category.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {sortedMedia.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => openPhotoLightbox(sortedMedia, idx)}
                      className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100 cursor-pointer shadow-3xs hover:shadow-md transition active:scale-95"
                    >
                      <img
                        src={item.url}
                        alt={item.title || space.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Feedback section temporarily hidden */}
          {/* activeTab === 'feedback' */ false && activeTab === 'feedback' && (
            <div className="space-y-4 py-1 text-left">
              {/* Header: Title, subtitle, and + Add Feedback button */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                 
                </div>
              
              </div>

              {/* Category Pills (Photos, Videos, Reviews) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setFeedbackFilter(f => (f === 'photos' ? 'all' : 'photos'))}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shrink-0 ${
                    feedbackFilter === 'photos'
                      ? 'bg-[#F3E8FF] text-[#7C3AED] shadow-2xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <ImageIcon size={14} className={feedbackFilter === 'photos' ? 'text-[#7C3AED]' : 'text-slate-500'} />
                  <span>Photos ({visitorPhotos.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackFilter(f => (f === 'videos' ? 'all' : 'videos'))}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shrink-0 ${
                    feedbackFilter === 'videos'
                      ? 'bg-[#F3E8FF] text-[#7C3AED] shadow-2xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <PlayCircle size={14} className={feedbackFilter === 'videos' ? 'text-[#7C3AED]' : 'text-slate-500'} />
                  <span>Videos ({visitorVideos.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackFilter(f => (f === 'reviews' ? 'all' : 'reviews'))}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shrink-0 ${
                    feedbackFilter === 'reviews'
                      ? 'bg-[#F3E8FF] text-[#7C3AED] shadow-2xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Quote size={13} className={feedbackFilter === 'reviews' ? 'text-[#7C3AED]' : 'text-slate-500'} />
                  <span>Reviews ({reviews.length})</span>
                </button>
              </div>

              {/* Photos Section */}
              {(feedbackFilter === 'all' || feedbackFilter === 'photos') && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-50 text-[#6344E7]">
                        <ImageIcon size={14} />
                      </div>
                      <h4 className="text-sm font-extrabold text-[#111111]">Photos</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFeedbackFilter(f => (f === 'photos' ? 'all' : 'photos'))}
                      className="flex items-center gap-1 text-xs font-bold text-[#6344E7] hover:underline cursor-pointer"
                    >
                      <span>{feedbackFilter === 'photos' ? 'Show Less' : 'View All'}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  {/* 3-Column Photos Grid */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                    {(feedbackFilter === 'photos' ? visitorPhotos : visitorPhotos.slice(0, 6)).map((photo, idx) => {
                      const isLastCardInPreview =
                        feedbackFilter === 'all' && idx === 5 && visitorPhotos.length > 6;
                      const remainingCount = visitorPhotos.length - 6;

                      return (
                        <div
                          key={photo.id}
                          onClick={() => {
                            if (isLastCardInPreview) {
                              setFeedbackFilter('photos');
                            } else {
                              openPhotoLightbox(visitorPhotos, idx);
                            }
                          }}
                          className="group relative aspect-4/3 sm:aspect-square w-full overflow-hidden rounded-xl sm:rounded-2xl bg-slate-100 cursor-pointer shadow-3xs hover:shadow-md transition active:scale-95"
                        >
                          <img
                            src={photo.url}
                            alt={photo.title || 'Visitor photo'}
                            className={`h-full w-full object-cover transition duration-300 ${
                              isLastCardInPreview ? 'blur-xs scale-105' : 'group-hover:scale-105'
                            }`}
                            loading="lazy"
                          />

                          {/* +18 overlay on the 6th card */}
                          {isLastCardInPreview && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-2xs transition group-hover:bg-black/55">
                              <span className="text-base sm:text-lg font-black text-white tracking-wide">
                                +{remainingCount > 0 ? remainingCount : 18}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Videos Section */}
              {(feedbackFilter === 'all' || feedbackFilter === 'videos') && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-50 text-[#6344E7]">
                        <PlayCircle size={14} />
                      </div>
                      <h4 className="text-sm font-extrabold text-[#111111]">Videos</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFeedbackFilter(f => (f === 'videos' ? 'all' : 'videos'))}
                      className="flex items-center gap-1 text-xs font-bold text-[#6344E7] hover:underline cursor-pointer"
                    >
                      <span>{feedbackFilter === 'videos' ? 'Show Less' : 'View All'}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  {/* 2-Column Videos Grid */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                    {(feedbackFilter === 'videos' ? visitorVideos : visitorVideos.slice(0, 2)).map(video => (
                      <div
                        key={video.id}
                        onClick={() => setPreviewVideo(video)}
                        className="group relative aspect-16/10 w-full overflow-hidden rounded-xl sm:rounded-2xl bg-slate-900 cursor-pointer shadow-3xs hover:shadow-md transition active:scale-95"
                      >
                        {video.poster ? (
                          <img
                            src={video.poster}
                            alt={video.title || 'Visitor video'}
                            className="h-full w-full object-cover opacity-85 transition duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <video
                            src={video.url}
                            preload="metadata"
                            className="h-full w-full object-cover opacity-85"
                            muted
                          />
                        )}

                        {/* Centered Play Button Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs shadow-md transition group-hover:scale-110 group-hover:bg-black/75">
                            <Play size={15} fill="white" className="ml-0.5" />
                          </div>
                        </div>

                        {/* Duration Badge Bottom-Right */}
                        <div className="absolute bottom-1.5 right-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-white backdrop-blur-xs">
                          {video.duration || '01:24'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews Section matching reference mockup (media_1794654455716_8cbdeb1d.jpg) */}
              {(feedbackFilter === 'all' || feedbackFilter === 'reviews') && (
                <div className="space-y-4 pt-2">
                  {/* Reviews Header: Left icon + title, Right + Add Review button */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F3E8FF] text-[#7C3AED]">
                        <ReviewIcon className="h-6 w-6 stroke-[2.2]" />
                      </div>
                      <h3 className="font-display text-xl sm:text-2xl font-black text-[#111111] leading-tight">
                        Reviews
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddFeedbackModal(true)}
                      className="flex items-center gap-1.5 rounded-2xl bg-[#6344E7] hover:bg-[#5235D9] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-purple-500/20 transition active:scale-95 cursor-pointer shrink-0"
                    >
                      <Plus size={15} className="stroke-[2.5]" />
                      <span>Add Review</span>
                    </button>
                  </div>

                  {/* Rating Breakdown Summary Card */}
                  <div className="rounded-3xl border border-purple-100/70 bg-[#FAF9FF] p-4 sm:p-5 grid grid-cols-4 divide-x divide-slate-100/90 shadow-3xs text-center">
                    {/* Overall Rating */}
                    <div className="flex flex-col items-center justify-center px-1">
                      <div className="flex items-center gap-1 text-3xl sm:text-4xl font-black text-[#111111] leading-none">
                        <span>4.8</span>
                        <Star size={24} className="fill-amber-400 text-amber-400 shrink-0" />
                      </div>
                      <span className="font-extrabold text-xs sm:text-sm text-[#111111] mt-2 leading-tight">
                        Overall Rating
                      </span>
                      <span className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5">
                        from 53 reviews
                      </span>
                    </div>

                    {/* Service */}
                    <div className="flex flex-col items-center justify-center px-1">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7C3AED]">
                        <ClocheIcon className="h-6 w-6" />
                      </div>
                      <div className="flex items-center gap-1 text-base sm:text-lg font-black text-[#111111] mt-1 leading-none">
                        <span>4.9</span>
                        <Star size={14} className="fill-amber-400 text-amber-400 shrink-0" />
                      </div>
                      <span className="text-xs text-slate-500 font-bold mt-1">
                        Service
                      </span>
                    </div>

                    {/* Cleanliness */}
                    <div className="flex flex-col items-center justify-center px-1">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7C3AED]">
                        <Sparkles size={22} className="stroke-[2.2]" />
                      </div>
                      <div className="flex items-center gap-1 text-base sm:text-lg font-black text-[#111111] mt-1 leading-none">
                        <span>4.8</span>
                        <Star size={14} className="fill-amber-400 text-amber-400 shrink-0" />
                      </div>
                      <span className="text-xs text-slate-500 font-bold mt-1">
                        Cleanliness
                      </span>
                    </div>

                    {/* Ambience */}
                    <div className="flex flex-col items-center justify-center px-1">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7C3AED]">
                        <Sofa size={22} className="stroke-[2.2]" />
                      </div>
                      <div className="flex items-center gap-1 text-base sm:text-lg font-black text-[#111111] mt-1 leading-none">
                        <span>4.7</span>
                        <Star size={14} className="fill-amber-400 text-amber-400 shrink-0" />
                      </div>
                      <span className="text-xs text-slate-500 font-bold mt-1">
                        Ambience
                      </span>
                    </div>
                  </div>

                  {/* Filter Pills & Sort Dropdown */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-1">
                      {/* Top Rated */}
                      <button
                        type="button"
                        onClick={() => setReviewFilter(f => (f === 'top' ? 'all' : 'top'))}
                        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shrink-0 ${
                          reviewFilter === 'top'
                            ? 'bg-[#6344E7] text-white shadow-xs'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Star
                          size={13}
                          className={reviewFilter === 'top' ? 'fill-white text-white' : 'text-[#7C3AED]'}
                        />
                        <span>Top Rated</span>
                      </button>

                      {/* Service */}
                      <button
                        type="button"
                        onClick={() => setReviewFilter(f => (f === 'service' ? 'all' : 'service'))}
                        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shrink-0 ${
                          reviewFilter === 'service'
                            ? 'bg-[#6344E7] text-white shadow-xs'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <ClocheIcon
                          className={`h-3.5 w-3.5 ${reviewFilter === 'service' ? 'text-white' : 'text-[#7C3AED]'}`}
                        />
                        <span>Service</span>
                      </button>

                      {/* Cleanliness */}
                      <button
                        type="button"
                        onClick={() => setReviewFilter(f => (f === 'cleanliness' ? 'all' : 'cleanliness'))}
                        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shrink-0 ${
                          reviewFilter === 'cleanliness'
                            ? 'bg-[#6344E7] text-white shadow-xs'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Sparkles
                          size={13}
                          className={reviewFilter === 'cleanliness' ? 'text-white' : 'text-[#7C3AED]'}
                        />
                        <span>Cleanliness</span>
                      </button>

                      {/* Ambience */}
                      <button
                        type="button"
                        onClick={() => setReviewFilter(f => (f === 'ambience' ? 'all' : 'ambience'))}
                        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shrink-0 ${
                          reviewFilter === 'ambience'
                            ? 'bg-[#6344E7] text-white shadow-xs'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Sofa
                          size={13}
                          className={reviewFilter === 'ambience' ? 'text-white' : 'text-[#7C3AED]'}
                        />
                        <span>Ambience</span>
                      </button>
                    </div>

                    {/* Sort button with dropdown */}
                    <div className="relative shrink-0" ref={reviewSortRef}>
                      <button
                        type="button"
                        onClick={() => setShowReviewSortDropdown(v => !v)}
                        className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-3xs hover:bg-slate-50 transition cursor-pointer"
                      >
                        <ArrowUpDown size={13} className="text-slate-600" />
                        <span>
                          {reviewSortOrder === 'recent'
                            ? 'Recent'
                            : reviewSortOrder === 'highest'
                            ? 'Highest'
                            : 'Lowest'}
                        </span>
                        <ChevronDown size={13} className="text-slate-500" />
                      </button>

                      {showReviewSortDropdown && (
                        <div className="absolute right-0 top-full mt-1.5 z-30 w-36 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-lg">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewSortOrder('recent');
                              setShowReviewSortDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                              reviewSortOrder === 'recent'
                                ? 'bg-[#F3E8FF] text-[#7C3AED]'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            Recent
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReviewSortOrder('highest');
                              setShowReviewSortDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                              reviewSortOrder === 'highest'
                                ? 'bg-[#F3E8FF] text-[#7C3AED]'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            Highest Rated
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReviewSortOrder('lowest');
                              setShowReviewSortDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                              reviewSortOrder === 'lowest'
                                ? 'bg-[#F3E8FF] text-[#7C3AED]'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            Lowest Rated
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reviews List */}
                  <div className="space-y-3">
                    {filteredReviews.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-400">
                        <p className="text-xs font-medium">No reviews found matching this filter.</p>
                      </div>
                    ) : (
                      filteredReviews.map(item => (
                        <div
                          key={item.id}
                          className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 space-y-3 text-left shadow-3xs hover:shadow-xs transition"
                        >
                          {/* Header: Avatar, Name & Ratings Badges, and More Options */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              {/* Round Avatar */}
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F3E8FF] text-[#7C3AED] font-black text-base shadow-3xs">
                                {item.avatarInitial || item.name.charAt(0).toUpperCase()}
                              </div>

                              <div className="min-w-0 flex-1 space-y-1">
                                {/* Name and Badges Row (Single Line) */}
                                <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none flex-nowrap pb-0.5">
                                  <h4 className="font-black text-sm sm:text-base text-[#111111] leading-tight shrink-0 whitespace-nowrap">
                                    {item.name}
                                  </h4>

                                  {/* Overall Rating Badge */}
                                  <div className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200/60 px-1.5 sm:px-2 py-0.5 text-xs font-black text-slate-800">
                                    <span>{Number(item.rating).toFixed(1)}</span>
                                    <Star size={11} className="fill-amber-400 text-amber-400" />
                                  </div>

                                  {/* Service Badge */}
                                  <div className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-lg bg-[#FAF5FF] border border-purple-200/60 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-slate-600">
                                    <ClocheIcon className="h-3.5 w-3.5 text-[#7C3AED]" />
                                    <span>
                                      Service <strong className="font-black text-slate-900">{Number(item.serviceRating ?? item.rating).toFixed(1)}</strong>
                                    </span>
                                  </div>

                                  {/* Cleanliness Badge */}
                                  <div className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-lg bg-[#FAF5FF] border border-purple-200/60 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-slate-600">
                                    <Sparkles size={12} className="text-[#7C3AED]" />
                                    <span>
                                      Cleanliness <strong className="font-black text-slate-900">{Number(item.cleanlinessRating ?? item.rating).toFixed(1)}</strong>
                                    </span>
                                  </div>

                                  {/* Ambience Badge */}
                                  <div className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-lg bg-[#FAF5FF] border border-purple-200/60 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-slate-600">
                                    <Sofa size={12} className="text-[#7C3AED]" />
                                    <span>
                                      Ambience <strong className="font-black text-slate-900">{Number(item.ambienceRating ?? item.rating).toFixed(1)}</strong>
                                    </span>
                                  </div>
                                </div>

                                {/* Date */}
                                <p className="text-[11px] font-semibold text-slate-400">
                                  {item.date}
                                </p>
                              </div>
                            </div>

                            {/* More Options */}
                            <button
                              type="button"
                              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer shrink-0"
                              aria-label="Review options"
                            >
                              <MoreHorizontal size={18} />
                            </button>
                          </div>

                          {/* Comment Text */}
                          <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                            {item.comment}
                          </p>

                          {/* Attached Media Thumbnails */}
                          {Array.isArray(item.media) && item.media.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 pt-1">
                              {item.media.map((med, mIdx) => (
                                <div
                                  key={med.id || mIdx}
                                  onClick={() => {
                                    if (med.type === 'photo') {
                                      const photoItems = item.media!
                                        .filter(m => m.type === 'photo')
                                        .map((m, pIdx) => ({
                                          id: m.id || `rev-photo-${pIdx}`,
                                          type: 'photo' as const,
                                          url: m.url,
                                          title: `${item.name}'s photo`,
                                        }));
                                      const targetIdx = photoItems.findIndex(p => p.url === med.url);
                                      openPhotoLightbox(photoItems, targetIdx >= 0 ? targetIdx : 0);
                                    } else {
                                      setPreviewVideo({
                                        id: med.id,
                                        type: 'video',
                                        url: med.url,
                                        poster: med.poster,
                                        title: `${item.name}'s video tour`,
                                      });
                                    }
                                  }}
                                  className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl sm:rounded-2xl bg-slate-900 cursor-pointer shadow-3xs hover:shadow-md transition active:scale-95"
                                >
                                  <img
                                    src={med.poster || med.url}
                                    alt={med.title || 'Review media'}
                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                    loading="lazy"
                                  />

                                  {med.type === 'video' && (
                                    <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                                      <Play size={10} fill="white" />
                                      <span>{med.duration || '0:56'}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions: Share and Book */}
        <div className="shrink-0 border-t border-slate-100 bg-white p-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleShare}
            className="flex h-12 sm:h-13 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 sm:px-8 text-[#6344E7] hover:bg-purple-50/50 transition active:scale-95 cursor-pointer shadow-3xs"
            title="Share space"
            aria-label="Share space"
          >
            <Share2 className="h-4.5 w-4.5 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">Share</span>
          </button>
          <button
            type="button"
            onClick={isCoworking ? handleBookCoworkingPlan : handleBook}
            className="flex-1 flex h-12 sm:h-13 items-center justify-center gap-2 rounded-2xl bg-[#6344E7] hover:bg-[#5235D9] text-white text-base font-bold shadow-md shadow-purple-500/25 transition active:scale-95 cursor-pointer"
          >
            <span>Book Now</span>
          </button>
        </div>
      </div>

      {/* Photo Lightbox Preview */}
      {activeLightboxIndex !== null && activeLightboxPhotos[activeLightboxIndex] && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveLightboxIndex(null)}
        >
          {/* Header */}
          <div
            className="flex w-full max-w-3xl items-center justify-between pb-3 text-white"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <p className="text-sm font-bold text-white">{space.name}</p>
              <p className="text-xs text-white/60">
                Photo {activeLightboxIndex + 1} of {activeLightboxPhotos.length}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveLightboxIndex(null)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
              aria-label="Close photo preview"
            >
              <X size={20} />
            </button>
          </div>

          {/* Main Image */}
          <div
            className="relative flex max-h-[80vh] w-full max-w-3xl items-center justify-center overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={activeLightboxPhotos[activeLightboxIndex].url}
              alt={space.name}
              className="max-h-[78vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
            />

            {/* Left Nav Arrow */}
            {activeLightboxPhotos.length > 1 && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setActiveLightboxIndex(prev =>
                    prev === null ? 0 : prev === 0 ? activeLightboxPhotos.length - 1 : prev - 1,
                  );
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition cursor-pointer"
                aria-label="Previous photo"
              >
                <ChevronLeft size={22} />
              </button>
            )}

            {/* Right Nav Arrow */}
            {activeLightboxPhotos.length > 1 && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setActiveLightboxIndex(prev =>
                    prev === null ? 0 : (prev + 1) % activeLightboxPhotos.length,
                  );
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition cursor-pointer"
                aria-label="Next photo"
              >
                <ChevronRight size={22} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {previewVideo && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewVideo(null)}
        >
          {/* Header */}
          <div
            className="flex w-full max-w-2xl items-center justify-between pb-3 text-white"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <p className="text-sm font-bold text-white">{space.name}</p>
              <p className="text-xs text-white/60">{previewVideo.title || 'Video Tour'}</p>
            </div>
            <button
              type="button"
              onClick={() => setPreviewVideo(null)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
              aria-label="Close video player"
            >
              <X size={20} />
            </button>
          </div>

          {/* Video Player */}
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-black shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <video
              src={previewVideo.url}
              controls
              autoPlay
              playsInline
              className="max-h-[75vh] w-full bg-black object-contain"
            />
          </div>
        </div>
      )}

      {/* Share Your Experience / Review Modal matching reference mockup (media_1794655857465_ea7cb2e4.jpg) */}
      {showAddFeedbackModal && (
        <div
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setShowAddFeedbackModal(false)}
        >
          <div
            className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] bg-white p-4 sm:p-6 shadow-2xl text-left animate-in fade-in slide-in-from-bottom duration-200 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Top drawer grab handle (Mobile) */}
            <div className="w-12 h-1 rounded-full bg-slate-300 mx-auto -mt-1 mb-2 sm:hidden" />

            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F3E8FF] text-[#7C3AED]">
                  <ReviewIcon className="h-6 w-6 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-lg sm:text-2xl font-black text-[#111111] leading-tight">
                    Share Your Experience
                  </h3>
                  <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5 truncate">
                    Help others by rating your experience at our space.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddFeedbackModal(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
                aria-label="Close review modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddFeedbackSubmit} className="space-y-4">
              {/* Overall Experience Slider Card */}
              <div className="rounded-3xl border border-purple-100/70 bg-[#FAF9FF] p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-3xs">
                <div className="shrink-0 leading-tight">
                  <span className="font-black text-sm sm:text-base text-[#111111] block">
                    Overall
                  </span>
                  <span className="font-black text-sm sm:text-base text-[#111111] block">
                    Experience <span className="text-red-500">*</span>
                  </span>
                </div>

                {/* Slider + Tick Labels */}
                <div className="flex-1 min-w-0">
                  <RatingSlider
                    value={newFeedbackRating}
                    onChange={setNewFeedbackRating}
                    min={1}
                    max={5}
                    step={0.1}
                  />
                  <div className="flex justify-between text-[10px] sm:text-[11px] font-bold text-slate-400 pt-1.5 px-0.5">
                    <div className="flex flex-col items-center">
                      <span>1</span>
                      <span className="text-[9px] font-semibold text-slate-400">Poor</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span>2</span>
                      <span className="text-[9px] font-semibold text-slate-400">Fair</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span>3</span>
                      <span className="text-[9px] font-semibold text-slate-400">Good</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span>4</span>
                      <span className="text-[9px] font-semibold text-slate-400">Very Good</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span>5</span>
                      <span className="text-[9px] font-semibold text-slate-400">Excellent</span>
                    </div>
                  </div>
                </div>

                {/* Score Pill with 3 Radiating Sparkles */}
                <div className="relative shrink-0 flex items-center justify-center self-end sm:self-center">
                  <div className="absolute -top-3.5 right-6 flex items-center gap-1 text-[#7C3AED]">
                    <span className="h-2 w-0.5 rounded-full bg-[#7C3AED] -rotate-45" />
                    <span className="h-2.5 w-0.5 rounded-full bg-[#7C3AED] -translate-y-0.5" />
                    <span className="h-2 w-0.5 rounded-full bg-[#7C3AED] rotate-45" />
                  </div>
                  <div className="rounded-2xl border border-purple-100 bg-white px-3.5 py-2 shadow-xs flex items-baseline">
                    <span className="font-black text-xl sm:text-2xl text-[#111111]">
                      {Number(newFeedbackRating).toFixed(1)}
                    </span>
                    <span className="text-xs font-bold text-slate-400 ml-1">/ 5</span>
                  </div>
                </div>
              </div>

              {/* Rate the Key Areas */}
              <div>
                <h4 className="font-black text-sm sm:text-base text-[#111111] mb-2.5">
                  Rate the Key Areas
                </h4>
                <div className="divide-y divide-slate-100/90 rounded-3xl border border-slate-100 bg-[#FAF9FF]/40 p-3 sm:p-4 space-y-3 shadow-3xs">
                  {/* Service */}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#7C3AED]">
                      <ClocheIcon className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-[#111111] w-20 sm:w-24 shrink-0">
                      Service
                    </span>
                    <RatingSlider
                      value={newFeedbackService}
                      onChange={setNewFeedbackService}
                      min={1}
                      max={5}
                      step={0.1}
                    />
                    <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-1 text-xs font-black text-[#111111] shrink-0 min-w-[54px] text-center shadow-3xs">
                      {Number(newFeedbackService).toFixed(1)} / 5
                    </div>
                  </div>

                  {/* Cleanliness */}
                  <div className="flex items-center gap-3 pt-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#7C3AED]">
                      <Sparkles size={16} className="stroke-[2.2]" />
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-[#111111] w-20 sm:w-24 shrink-0">
                      Cleanliness
                    </span>
                    <RatingSlider
                      value={newFeedbackCleanliness}
                      onChange={setNewFeedbackCleanliness}
                      min={1}
                      max={5}
                      step={0.1}
                    />
                    <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-1 text-xs font-black text-[#111111] shrink-0 min-w-[54px] text-center shadow-3xs">
                      {Number(newFeedbackCleanliness).toFixed(1)} / 5
                    </div>
                  </div>

                  {/* Ambience */}
                  <div className="flex items-center gap-3 pt-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#7C3AED]">
                      <Sofa size={16} className="stroke-[2.2]" />
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-[#111111] w-20 sm:w-24 shrink-0">
                      Ambience
                    </span>
                    <RatingSlider
                      value={newFeedbackAmbience}
                      onChange={setNewFeedbackAmbience}
                      min={1}
                      max={5}
                      step={0.1}
                    />
                    <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-1 text-xs font-black text-[#111111] shrink-0 min-w-[54px] text-center shadow-3xs">
                      {Number(newFeedbackAmbience).toFixed(1)} / 5
                    </div>
                  </div>
                </div>
              </div>

              {/* Reviewer Name */}
              <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 focus-within:border-[#6344E7] transition shadow-3xs">
                <input
                  type="text"
                  value={newFeedbackName}
                  onChange={e => setNewFeedbackName(e.target.value)}
                  placeholder="Your Name (e.g. Riya Sharma)"
                  className="w-full text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none bg-transparent font-medium"
                />
              </div>

              {/* Textarea for Experience */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 focus-within:border-[#6344E7] transition shadow-3xs">
                <div className="flex items-start gap-2">
                  <Pencil size={15} className="text-slate-400 mt-0.5 shrink-0" />
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={newFeedbackComment}
                    onChange={e => setNewFeedbackComment(e.target.value)}
                    placeholder="Tell us about your experience..."
                    className="w-full text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none resize-none bg-transparent"
                  />
                </div>
                <div className="text-[11px] font-semibold text-slate-400 text-right mt-1">
                  {newFeedbackComment.length} / 500
                </div>
              </div>

              {/* Photos / Videos Row */}
              <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none py-1">
                {/* Hidden File Input */}
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  ref={reviewFileInputRef}
                  onChange={handleFilesAdded}
                />

                {/* Add Button */}
                <button
                  type="button"
                  onClick={() => reviewFileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center w-28 sm:w-32 h-20 sm:h-22 rounded-2xl border-2 border-dashed border-[#A855F7]/70 bg-[#FAF5FF] text-[#7C3AED] hover:bg-[#F3E8FF] transition cursor-pointer shrink-0 p-2"
                >
                  <Camera size={22} className="stroke-[2.2] text-[#7C3AED] mb-1" />
                  <span className="font-bold text-[10px] sm:text-[11px] text-[#111111] leading-tight text-center">
                    Add Photos / Videos
                  </span>
                  <span className="text-[9px] font-semibold text-slate-400 mt-0.5">
                    (Optional)
                  </span>
                </button>

                {/* Attached Previews */}
                {reviewMediaList.map(med => (
                  <div
                    key={med.id}
                    className="relative w-28 sm:w-32 h-20 sm:h-22 rounded-2xl overflow-hidden bg-slate-900 shrink-0 shadow-3xs group"
                  >
                    <img
                      src={med.poster || med.url}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setReviewMediaList(prev => prev.filter(m => m.id !== med.id))
                      }
                      className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition cursor-pointer shadow-xs"
                      aria-label="Remove media"
                    >
                      <X size={12} className="stroke-[2.5]" />
                    </button>

                    {med.type === 'video' && (
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
                        <Play size={8} fill="white" />
                        <span>{med.duration || '0:56'}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Question Row 1: Would you book again? */}
              <div className="rounded-2xl border border-slate-100 bg-[#FAF9FF]/60 p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-3xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#7C3AED]">
                    <Calendar size={16} className="stroke-[2.2]" />
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-[#111111]">
                    Would you book again?
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setWouldBookAgain(true)}
                    className={`flex items-center gap-1 rounded-xl px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
                      wouldBookAgain
                        ? 'bg-[#7C3AED] text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {wouldBookAgain && <Check size={12} className="stroke-[3]" />}
                    <span>Yes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWouldBookAgain(false)}
                    className={`flex items-center gap-1 rounded-xl px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
                      !wouldBookAgain
                        ? 'bg-[#7C3AED] text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>No</span>
                  </button>
                </div>
              </div>

              {/* Question Row 2: Would you recommend? */}
              <div className="rounded-2xl border border-slate-100 bg-[#FAF9FF]/60 p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-3xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#7C3AED]">
                    <Users size={16} className="stroke-[2.2]" />
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-[#111111] leading-tight">
                    Would you recommend this space to your friends / family / colleagues?
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setWouldRecommend(true)}
                    className={`flex items-center gap-1 rounded-xl px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
                      wouldRecommend
                        ? 'bg-[#7C3AED] text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {wouldRecommend && <Check size={12} className="stroke-[3]" />}
                    <span>Yes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWouldRecommend(false)}
                    className={`flex items-center gap-1 rounded-xl px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
                      !wouldRecommend
                        ? 'bg-[#7C3AED] text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>No</span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full rounded-2xl bg-gradient-to-r from-[#6344E7] to-[#7C3AED] hover:from-[#5235D9] hover:to-[#6D28D9] py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer mt-2"
              >
                <Send size={18} className="-rotate-12 stroke-[2.2]" />
                <span>Submit Review</span>
              </button>
            </form>
          </div>
        </div>
      )}

      <ShareSpaceModal
        space={space}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />

      <CustomerSpaceCheckout
        space={bookingPassOverride || space}
        isOpen={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          setBookingPassOverride(null);
        }}
        initialDate={selectedDate}
        initialStartTime={startTime}
        initialEndTime={endTime}
      />

      <CoworkingBookingModal
        isOpen={showCoworkingBookingModal}
        onClose={() => setShowCoworkingBookingModal(false)}
        space={space}
        initialPlanId={selectedPlanId}
        initialStartDate={selectedDate}
      />

      {/* Space Booking Terms Modal */}
      {showTermsModal && (
        <div
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setShowTermsModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] bg-white p-5 sm:p-6 shadow-2xl text-left animate-in fade-in slide-in-from-bottom duration-200 space-y-3.5"
            onClick={e => e.stopPropagation()}
          >
            {/* Top drag handle indicator */}
            <div className="h-1.5 w-12 bg-slate-300 rounded-full mx-auto mb-2" />

            {/* Header: Title and Close button */}
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-display text-xl sm:text-2xl font-black text-[#111827]">
                Space Booking Terms
              </h3>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] text-slate-500 hover:bg-slate-200 transition cursor-pointer"
                aria-label="Close terms"
              >
                <X size={18} />
              </button>
            </div>

            {/* 3 Segmented Tabs: Disclaimer, Guidelines, T&Cs */}
            <div className="grid grid-cols-3 gap-2 pt-1 pb-1">
              <button
                type="button"
                onClick={() => setTermsActiveTab('disclaimer')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  termsActiveTab === 'disclaimer'
                    ? 'bg-[#6344E7] text-white shadow-md shadow-purple-500/20'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Info size={16} />
                <span>Disclaimer</span>
              </button>
              <button
                type="button"
                onClick={() => setTermsActiveTab('guidelines')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  termsActiveTab === 'guidelines'
                    ? 'bg-[#6344E7] text-white shadow-md shadow-purple-500/20'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CheckSquare size={16} />
                <span>Guidelines</span>
              </button>
              <button
                type="button"
                onClick={() => setTermsActiveTab('tcs')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  termsActiveTab === 'tcs'
                    ? 'bg-[#6344E7] text-white shadow-md shadow-purple-500/20'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText size={16} />
                <span>T&Cs</span>
              </button>
            </div>

            {/* Lavender Content Box */}
            <div className="rounded-3xl bg-[#F6F2FF] border border-purple-100/80 p-5 sm:p-6 text-left">
              {termsActiveTab === 'disclaimer' && (
                <>
                  <div className="mb-3.5 text-[#6344E7]">
                    <Info className="h-6 w-6 stroke-[2.2]" />
                  </div>
                  <ul className="space-y-3 text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                    <li className="flex items-start gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#6344E7] mt-2 shrink-0" />
                      <span>Images are for reference only. Actual setup, layout, and decor may vary.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#6344E7] mt-2 shrink-0" />
                      <span>Space availability is subject to confirmation at the time of booking.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#6344E7] mt-2 shrink-0" />
                      <span>Pricing, offers, and amenities are subject to change without prior notice.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#6344E7] mt-2 shrink-0" />
                      <span>We are not liable for any loss, damage, or injury during the event.</span>
                    </li>
                  </ul>
                </>
              )}

              {termsActiveTab === 'guidelines' && (
                <>
                  <div className="mb-3.5 text-[#6344E7]">
                    <CheckSquare className="h-6 w-6 stroke-[2.2]" />
                  </div>
                  <ul className="space-y-3 text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                    <li className="flex items-start gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#6344E7] mt-2 shrink-0" />
                      <span><strong>Pure Vegetarian Food Only:</strong> Non-vegetarian food, eggs, and alcohol are strictly prohibited inside the premises.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#6344E7] mt-2 shrink-0" />
                      <span><strong>Timings & Buffer:</strong> Entry is permitted 10 minutes prior to slot. Setup and wrap-up must be completed within the reserved hours.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#6344E7] mt-2 shrink-0" />
                      <span><strong>Sound & Noise:</strong> Loud music or heavy amplification must adhere to residential silence guidelines and conclude by 10:00 PM.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#6344E7] mt-2 shrink-0" />
                      <span><strong>Cleanliness & Care:</strong> Please treat art fixtures and equipment with respect. Any damages will be billed at actual replacement cost.</span>
                    </li>
                  </ul>
                </>
              )}

              {termsActiveTab === 'tcs' && (
                <>
                  <div className="mb-3.5 text-[#6344E7]">
                    <FileText className="h-6 w-6 stroke-[2.2]" />
                  </div>
                  <ul className="space-y-3 text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                    <li className="flex items-start gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#6344E7] mt-2 shrink-0" />
                      <span><strong>Rescheduling Policy:</strong> Rescheduling requests made at least 48 hours prior to the slot are accommodated free of charge based on slot availability.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#6344E7] mt-2 shrink-0" />
                      <span><strong>Cancellation Policy:</strong> Cancellations made at least 48 hours prior receive an 80% refund or booking credit; non-refundable within 48 hours.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#6344E7] mt-2 shrink-0" />
                      <span><strong>Security & Conduct:</strong> Organizers and guests must maintain decorum and cooperate with security personnel throughout the event.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#6344E7] mt-2 shrink-0" />
                      <span><strong>Non-Transferable:</strong> Bookings cannot be sub-leased or transferred to external third parties without prior written approval.</span>
                    </li>
                  </ul>
                </>
              )}
            </div>

            {/* Bottom confirmation button */}
            <button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="w-full rounded-2xl bg-[#6344E7] hover:bg-[#5235D9] py-3 text-xs sm:text-sm font-bold text-white transition cursor-pointer shadow-md shadow-purple-500/20"
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
