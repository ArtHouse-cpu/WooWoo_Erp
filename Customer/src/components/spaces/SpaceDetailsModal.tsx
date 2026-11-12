import {useEffect, useMemo, useRef, useState} from 'react';
import {
  X,
  Share2,
  Info,
  Sparkles,
  MessageSquare,
  Calendar,
  Clock,
  Users,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Play,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  PlayCircle,
  Quote,
  ArrowRight,
  Plus,
  Star,
} from 'lucide-react';
import {toast} from 'sonner';
import type {SpaceCard} from '../../services/space.service';
import {
  formatInr,
  spaceShareUrl,
  copySpaceLink,
  SPACE_WHATSAPP,
} from './spaceActions';
import {SpacePhoto} from './SpacePhoto';
import {ShareSpaceModal} from './ShareSpaceModal';

function formatDateDisplay(d: Date): string {
  const day = d.getDate();
  const month = new Intl.DateTimeFormat('en-GB', {month: 'short'}).format(d);
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function getTimeDurationHours(start: string, end: string): number {
  const [sh = 0, sm = 0] = start.split(':').map(Number);
  const [eh = 0, em = 0] = end.split(':').map(Number);
  const sMin = sh * 60 + sm;
  const eMin = eh * 60 + em;
  const diffMin = eMin >= sMin ? eMin - sMin : 24 * 60 - sMin + eMin;
  return Math.max(0.5, Math.round((diffMin / 60) * 10) / 10);
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

type MediaModalItem = {
  id: string;
  type: 'photo' | 'video';
  url: string;
  poster?: string;
  duration?: string;
  title?: string;
};

type FeedbackReview = {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  date: string;
  comment: string;
};

export function SpaceDetailsModal({
  space,
  onClose,
}: {
  space: SpaceCard | null;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'info' | 'highlights' | 'feedback'>('info');
  const [activeSegment, setActiveSegment] = useState<'weekday' | 'weekend'>('weekday');

  // Highlights Media state
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photos' | 'videos'>('all');
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
  const [newFeedbackRating, setNewFeedbackRating] = useState(5);
  const [newFeedbackComment, setNewFeedbackComment] = useState('');
  const [reviews, setReviews] = useState<FeedbackReview[]>([
    {
      id: 'rev-1',
      name: 'Rohit Sharma',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      rating: 5,
      date: 'Yesterday',
      comment: 'Amazing space! Clean, cozy and perfect for work and meetings. 🌟',
    },
    {
      id: 'rev-2',
      name: 'Priya Sharma',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      rating: 5,
      date: '2 days ago',
      comment: 'The natural lighting and creative vibe here is unmatched. Will book again!',
    },
    {
      id: 'rev-3',
      name: 'Ananya Deshmukh',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      rating: 5,
      date: 'Last week',
      comment: 'Calm, productive, and comfortable for long creative sessions. Staff is super supportive.',
    },
    {
      id: 'rev-4',
      name: 'Rahul Mehta',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      rating: 5,
      date: '3 days ago',
      comment: 'Hosted our fluid art workshop here. Smooth setup and great atmosphere.',
    },
    {
      id: 'rev-5',
      name: 'Sneha Patel',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
      rating: 5,
      date: '2 weeks ago',
      comment: 'Loved the artisanal coffee and quiet nook to get deep focus work done.',
    },
  ]);

  // Date selection state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const calendarRef = useRef<HTMLDivElement | null>(null);

  // Custom Timing state
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('09:00');
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (!space) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showAddFeedbackModal) {
          setShowAddFeedbackModal(false);
        } else if (activeLightboxIndex !== null) {
          setActiveLightboxIndex(null);
        } else if (previewVideo !== null) {
          setPreviewVideo(null);
        } else if (showDatePicker) {
          setShowDatePicker(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [space, onClose, showDatePicker, activeLightboxIndex, previewVideo, showAddFeedbackModal]);

  // Close calendar popover on outside click
  useEffect(() => {
    if (!showDatePicker) return;
    const onClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [showDatePicker]);

  // Highlights media aggregation for this specific space.name (called unconditionally for hooks compliance)
  const mediaItems = useMemo<MediaModalItem[]>(() => {
    if (!space) return [];
    const items: MediaModalItem[] = [];

    // 1. Gather all actual photos for this space
    const photoUrls = [
      space.imageUrl,
      ...(Array.isArray(space.images) ? space.images : []),
    ].filter(Boolean) as string[];
    const uniquePhotos = Array.from(new Set(photoUrls));

    uniquePhotos.forEach((url, i) => {
      items.push({
        id: `photo-${i}-${url}`,
        type: 'photo',
        url,
        title: `${space.name} - View ${i + 1}`,
      });
    });

    // 2. Gather all actual videos for this space
    const videoUrls = Array.isArray(space.videos) ? space.videos : [];
    const uniqueVideos = Array.from(new Set(videoUrls));

    uniqueVideos.forEach((url, i) => {
      items.push({
        id: `video-${i}-${url}`,
        type: 'video',
        url,
        poster: uniquePhotos[0] || undefined,
        duration: '01:24',
        title: `${space.name} - Video Tour ${i + 1}`,
      });
    });

    // 3. Fallback / supplementary media so the 3-column grid is always rich and complete
    // matching the reference mockup (media_1794413845792_bf5e2719.jpg)
    if (items.length < 6) {
      const supplementaryMedia: MediaModalItem[] = [
        {
          id: 'supp-photo-1',
          type: 'photo',
          url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
          title: `${space.name} Studio`,
        },
        {
          id: 'supp-video-1',
          type: 'video',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          poster: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
          duration: '01:24',
          title: `${space.name} Tour`,
        },
        {
          id: 'supp-photo-2',
          type: 'photo',
          url: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80',
          title: `${space.name} Workspace`,
        },
        {
          id: 'supp-photo-3',
          type: 'photo',
          url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
          title: `${space.name} Ambient Corner`,
        },
        {
          id: 'supp-photo-4',
          type: 'photo',
          url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
          title: `${space.name} Art Lounge`,
        },
        {
          id: 'supp-video-2',
          type: 'video',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
          poster: 'https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=800&q=80',
          duration: '02:10',
          title: `${space.name} Walkthrough`,
        },
      ];

      for (const fallback of supplementaryMedia) {
        if (!items.some(it => it.url === fallback.url)) {
          items.push(fallback);
        }
      }
    }

    return items;
  }, [space]);

  const photos = useMemo(() => mediaItems.filter(m => m.type === 'photo'), [mediaItems]);
  const videos = useMemo(() => mediaItems.filter(m => m.type === 'video'), [mediaItems]);

  const filteredMedia = useMemo(() => {
    if (mediaFilter === 'photos') return photos;
    if (mediaFilter === 'videos') return videos;
    return mediaItems;
  }, [mediaFilter, mediaItems, photos, videos]);

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

  const handleAddFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFeedbackName.trim();
    const comment = newFeedbackComment.trim();
    if (!name || !comment) {
      toast.error('Please enter your name and review');
      return;
    }
    const newReview: FeedbackReview = {
      id: `review-${Date.now()}`,
      name,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      rating: newFeedbackRating,
      date: 'Just now',
      comment,
    };
    setReviews(prev => [newReview, ...prev]);
    setNewFeedbackName('');
    setNewFeedbackComment('');
    setNewFeedbackRating(5);
    setShowAddFeedbackModal(false);
    toast.success('Thank you for your feedback!');
  };

  // Prices
  const weekdayPrice = space.weekdayPrice ?? space.fromPrice;
  const weekendPrice = space.weekendPrice ?? Math.round(weekdayPrice * 1.3);
  const activePrice = activeSegment === 'weekday' ? weekdayPrice : weekendPrice;
  const comparePrice =
    activeSegment === 'weekday' && weekendPrice > weekdayPrice ? weekendPrice : null;

  const durationHours = getTimeDurationHours(startTime, endTime);
  const estimatedTotal = activePrice * durationHours;

  const handleShare = async () => {
    // Open share modal on mobile screen
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowShareModal(true);
      return;
    }
    // Desktop: copy link directly to clipboard
    try {
      await copySpaceLink(space.id);
      toast.success('Space link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleBook = () => {
    const text = [
      'Hi, I would like to book this space at WooWoo Art House.',
      space.imageUrl ? `Image: ${space.imageUrl}` : '',
      `Product name: ${space.name}`,
      `Price: ₹${formatInr(activePrice)}/hr (${activeSegment === 'weekday' ? 'Weekday' : 'Weekend'})`,
      `Date: ${formatDateDisplay(selectedDate)}`,
      `Custom Timing: ${startTime} to ${endTime} (${durationHours} ${durationHours === 1 ? 'hour' : 'hours'})`,
      `Estimated Rate: ₹${formatInr(estimatedTotal)}`,
      space.capacity ? `Capacity: Up to ${space.capacity} people` : '',
      space.spaceType ? `Type: ${space.spaceType}` : '',
      `Link: ${spaceShareUrl(space.id)}`,
    ]
      .filter(Boolean)
      .join('\n');
    const waUrl = `https://wa.me/${SPACE_WHATSAPP}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
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
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:rounded-[32px] text-left"
      >
        {/* Header: Space Name on left, Close button on right */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 pt-4 pb-3">
          <h2
            id="space-details-title"
            className="truncate font-display text-xl sm:text-2xl font-black text-[#111111]"
            title={space.name}
          >
            {space.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
            aria-label="Close space details"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Tab navigation: Info first, then Highlights, then Feedback */}
        <div className="flex items-center gap-6 border-b border-slate-100 px-5 text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-1.5 py-3 border-b-2 transition cursor-pointer ${
              activeTab === 'info'
                ? 'border-[#6344E7] text-[#6344E7]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Info size={16} />
            <span>Info</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('highlights')}
            className={`flex items-center gap-1.5 py-3 border-b-2 transition cursor-pointer ${
              activeTab === 'highlights'
                ? 'border-[#6344E7] text-[#6344E7]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Sparkles size={16} />
            <span>Highlights</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-1.5 py-3 border-b-2 transition cursor-pointer ${
              activeTab === 'feedback'
                ? 'border-[#6344E7] text-[#6344E7]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <MessageSquare size={16} />
            <span>Feedback</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {activeTab === 'info' && (
            <>
              {/* Space Photo with Carousel indicator */}
              <div className="relative aspect-16/10 w-full overflow-hidden rounded-2xl bg-[#FFF9F3] flex items-center justify-center shadow-xs">
                <SpacePhoto src={space.imageUrl} alt={space.name} />
                {/* Dot pagination indicator */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/30 backdrop-blur-xs px-2.5 py-1">
                  <span className="h-2 w-2 rounded-full bg-white shadow-xs" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                </div>
              </div>

              {/* Status Badges: Available and Capacity */}
              <div className="flex items-center gap-3 pt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/60">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Available
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <Users size={15} className="text-slate-500" />
                  Up to {space.capacity > 0 ? space.capacity : 1}
                </span>
              </div>

              {/* Date Option (Calendar) & Custom Timing Option */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Dates Selector with Calendar Popover */}
                <div className="relative" ref={calendarRef}>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mb-1">
                    <Calendar size={14} className="text-slate-500" />
                    <span>Dates</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(v => !v)}
                    className="flex w-full h-10 items-center justify-between gap-1.5 rounded-2xl border border-slate-200 bg-[#F8FAFC] px-3 text-xs font-bold text-slate-800 transition hover:bg-slate-100 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Calendar size={14} className="text-[#6344E7] shrink-0" />
                      <span className="truncate">{formatDateDisplay(selectedDate)}</span>
                    </div>
                    <ChevronDown size={14} className="text-slate-400 shrink-0" />
                  </button>

                  {/* Calendar Dropdown Popover */}
                  {showDatePicker && (
                    <div className="absolute left-0 top-full z-40 mt-1 w-72 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
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

                {/* Time Slot / Custom Timing */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mb-1">
                    <Clock size={14} className="text-slate-500" />
                    <span>Time Slot </span>
                  </label>
                  <div className="flex h-10 items-center justify-between gap-1.5 rounded-2xl border border-slate-200 bg-[#F8FAFC] px-3 focus-within:border-[#6344E7] focus-within:bg-white transition">
                    {/* Start Time Input */}
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <input
                        type="time"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        className="w-full bg-transparent text-xs font-extrabold text-slate-800 outline-none cursor-pointer"
                        title="Start Time"
                      />
                      {/* <Clock size={14} className="text-slate-400 shrink-0 pointer-events-none" /> */}
                    </div>

                    <span className="text-[11px] font-bold text-slate-400 shrink-0 px-1">to</span>

                    {/* End Time Input */}
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <input
                        type="time"
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        className="w-full bg-transparent text-xs font-extrabold text-slate-800 outline-none cursor-pointer"
                        title="End Time"
                      />
                      {/* <Clock size={14} className="text-slate-400 shrink-0 pointer-events-none" /> */}
                    </div>
                  </div>
                </div>
              </div>

              {/* Weekday & Weekend Segmented Control & Price Display */}
              <div className="pt-2">
                <div className="inline-flex items-center rounded-full bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveSegment('weekday')}
                    className={`rounded-full px-5 py-1.5 text-xs font-bold transition cursor-pointer ${
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
                    className={`rounded-full px-5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      activeSegment === 'weekend'
                        ? 'bg-[#6344E7] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Weekend
                  </button>
                </div>

                {/* Price Display */}
                <div className="mt-2.5 flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-[#6344E7] tracking-tight">
                    ₹{formatInr(activePrice)}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">/ hour</span>
                  {comparePrice && (
                    <span className="text-sm font-semibold text-slate-400 line-through ml-1.5">
                      ₹{formatInr(comparePrice)}
                    </span>
                  )}
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

          {activeTab === 'highlights' && (
            <div className="space-y-3.5 py-1">
              {/* Media Header & Filter Tabs */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-purple-100 text-[#6344E7]">
                    <Sparkles size={16} />
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#111111]">Media</h3>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setMediaFilter('all')}
                    className={`rounded-full px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                      mediaFilter === 'all'
                        ? 'bg-[#F3E8FF] text-[#7C3AED] shadow-2xs'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    All ({mediaItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaFilter('photos')}
                    className={`rounded-full px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                      mediaFilter === 'photos'
                        ? 'bg-[#F3E8FF] text-[#7C3AED] shadow-2xs'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Photos ({photos.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaFilter('videos')}
                    className={`rounded-full px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                      mediaFilter === 'videos'
                        ? 'bg-[#F3E8FF] text-[#7C3AED] shadow-2xs'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Videos ({videos.length})
                  </button>
                </div>
              </div>

              {/* 3-Column Media Grid matching reference screenshot */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {filteredMedia.map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.type === 'photo') {
                        const idx = photos.findIndex(p => p.id === item.id);
                        openPhotoLightbox(photos, idx >= 0 ? idx : 0);
                      } else {
                        setPreviewVideo(item);
                      }
                    }}
                    className="group relative aspect-4/3 sm:aspect-square w-full overflow-hidden rounded-xl sm:rounded-2xl bg-slate-100 cursor-pointer shadow-3xs hover:shadow-md transition active:scale-95"
                  >
                    {item.type === 'photo' ? (
                      <img
                        src={item.url}
                        alt={item.title || space.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="relative h-full w-full bg-slate-900">
                        {item.poster ? (
                          <img
                            src={item.poster}
                            alt={item.title || space.name}
                            className="h-full w-full object-cover opacity-85 transition duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <video
                            src={item.url}
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
                          {item.duration || '01:24'}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-4 py-1 text-left">
              {/* Header: Title, subtitle, and + Add Feedback button */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-lg sm:text-xl font-black text-[#111111]">
                    Visitor Feedback
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Photos, videos and reviews from our visitors.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddFeedbackModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#6344E7] hover:bg-[#5235D9] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus size={14} className="stroke-[2.5]" />
                  <span>Add Feedback</span>
                </button>
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

              {/* Reviews & Testimonials Section */}
              {(feedbackFilter === 'all' || feedbackFilter === 'reviews') && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-50 text-[#6344E7]">
                        <Quote size={13} />
                      </div>
                      <h4 className="text-sm font-extrabold text-[#111111]">Reviews & Testimonials</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFeedbackFilter(f => (f === 'reviews' ? 'all' : 'reviews'))}
                      className="flex items-center gap-1 text-xs font-bold text-[#6344E7] hover:underline cursor-pointer"
                    >
                      <span>{feedbackFilter === 'reviews' ? 'Show Less' : 'View All'}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  {/* Horizontal Scroll / Carousel if 'all', or vertical list if 'reviews' */}
                  {feedbackFilter === 'reviews' ? (
                    <div className="space-y-2.5">
                      {reviews.map(item => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-slate-100 bg-[#FAFBFD] p-3.5 space-y-2 text-left shadow-3xs"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={item.avatar}
                              alt={item.name}
                              className="h-10 w-10 rounded-full object-cover shrink-0 border border-slate-200"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {item.name}
                              </p>
                              <div className="flex items-center gap-0.5 text-amber-400 text-xs mt-0.5">
                                {Array.from({length: 5}).map((_, i) => (
                                  <Star
                                    key={i}
                                    size={12}
                                    fill={i < item.rating ? 'currentColor' : 'none'}
                                    className={i < item.rating ? 'text-amber-400' : 'text-slate-200'}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">
                              {item.date}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed italic">
                            “{item.comment}”
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                      {reviews.map(item => (
                        <div
                          key={item.id}
                          className="w-[84%] sm:w-[78%] shrink-0 snap-center rounded-2xl border border-slate-100 bg-[#FAFBFD] p-3.5 space-y-2 text-left shadow-3xs"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={item.avatar}
                              alt={item.name}
                              className="h-10 w-10 rounded-full object-cover shrink-0 border border-slate-200"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {item.name}
                              </p>
                              <div className="flex items-center gap-0.5 text-amber-400 text-xs mt-0.5">
                                {Array.from({length: 5}).map((_, i) => (
                                  <Star
                                    key={i}
                                    size={12}
                                    fill={i < item.rating ? 'currentColor' : 'none'}
                                    className={i < item.rating ? 'text-amber-400' : 'text-slate-200'}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">
                              {item.date}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed italic line-clamp-3">
                            “{item.comment}”
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions: Share and Book in 30:70 ratio */}
        <div className="border-t border-slate-100 bg-white p-4 grid grid-cols-10 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={handleShare}
            className="col-span-3 flex h-12 sm:h-13 items-center justify-center gap-1.5 rounded-2xl border border-purple-200 bg-white text-[#6344E7] hover:bg-purple-50 transition active:scale-95 cursor-pointer shadow-xs"
            title="Share space"
            aria-label="Share space"
          >
            <Share2 className="h-4.5 w-4.5 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">Share</span>
          </button>
          <button
            type="button"
            onClick={handleBook}
            className="col-span-7 flex h-12 sm:h-13 items-center justify-center gap-2 rounded-2xl bg-[#6344E7] hover:bg-[#5235D9] text-white text-base font-bold shadow-md shadow-purple-500/25 transition active:scale-95 cursor-pointer"
          >
            <span>Book</span>
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

      {/* Add Feedback Modal */}
      {showAddFeedbackModal && (
        <div
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setShowAddFeedbackModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-[32px] sm:rounded-[28px] bg-white p-5 shadow-2xl text-left animate-in fade-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
                Share Your Experience
              </h3>
              <button
                type="button"
                onClick={() => setShowAddFeedbackModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddFeedbackSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Rating
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewFeedbackRating(star)}
                      className="p-1 text-amber-400 hover:scale-110 transition cursor-pointer"
                    >
                      <Star
                        size={22}
                        fill={star <= newFeedbackRating ? 'currentColor' : 'none'}
                        className={star <= newFeedbackRating ? 'text-amber-400' : 'text-slate-200'}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-500 ml-1.5">
                    {newFeedbackRating} / 5
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={newFeedbackName}
                  onChange={e => setNewFeedbackName(e.target.value)}
                  placeholder="e.g. Rohit Sharma"
                  className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#6344E7] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Your Review
                </label>
                <textarea
                  required
                  rows={3}
                  value={newFeedbackComment}
                  onChange={e => setNewFeedbackComment(e.target.value)}
                  placeholder="What did you love about this space?"
                  className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 text-xs font-medium text-slate-800 outline-none focus:border-[#6344E7] focus:bg-white resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-[#6344E7] py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-purple-500/25 hover:bg-[#5235D9] transition active:scale-95 cursor-pointer"
              >
                Submit Feedback
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
    </div>
  );
}
