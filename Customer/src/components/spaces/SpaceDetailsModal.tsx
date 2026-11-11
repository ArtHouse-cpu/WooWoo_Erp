import {useEffect, useRef, useState} from 'react';
import {
  X,
  Share2,
  Search,
  Info,
  Sparkles,
  MessageSquare,
  Calendar,
  Clock,
  Users,
  ChevronDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {toast} from 'sonner';
import type {SpaceCard} from '../../services/space.service';
import {
  formatInr,
  spaceShareUrl,
  copySpaceLink,
  openNativeShare,
  SPACE_WHATSAPP,
} from './spaceActions';
import {SpacePhoto} from './SpacePhoto';

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

export function SpaceDetailsModal({
  space,
  onClose,
}: {
  space: SpaceCard | null;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'info' | 'highlights' | 'feedback'>('info');
  const [activeSegment, setActiveSegment] = useState<'weekday' | 'weekend'>('weekday');

  // Date selection state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const calendarRef = useRef<HTMLDivElement | null>(null);

  // Custom Timing state
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('09:00');

  useEffect(() => {
    if (!space) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showDatePicker) {
          setShowDatePicker(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [space, onClose, showDatePicker]);

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

  if (!space) return null;

  // Prices
  const weekdayPrice = space.weekdayPrice ?? space.fromPrice;
  const weekendPrice = space.weekendPrice ?? Math.round(weekdayPrice * 1.3);
  const activePrice = activeSegment === 'weekday' ? weekdayPrice : weekendPrice;
  const comparePrice =
    activeSegment === 'weekday' && weekendPrice > weekdayPrice ? weekendPrice : null;

  const durationHours = getTimeDurationHours(startTime, endTime);
  const estimatedTotal = activePrice * durationHours;

  const handleShare = async () => {
    const url = spaceShareUrl(space.id);
    if (
      typeof window !== 'undefined' &&
      window.innerWidth < 768 &&
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      const result = await openNativeShare(space, url);
      if (result === 'shared') {
        toast.success('Space link shared');
        return;
      }
      if (result === 'cancelled') return;
    }
    try {
      await copySpaceLink(space.id);
      toast.success('Space link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleQuery = () => {
    const text = [
      'Hi, I have a query about this space at WooWoo Art House.',
      `Space: ${space.name}`,
      `Space ID: ${space.id}`,
      space.spaceType ? `Type: ${space.spaceType}` : '',
      `Date: ${formatDateDisplay(selectedDate)}`,
      `Custom Timing: ${startTime} to ${endTime} (${durationHours} ${durationHours === 1 ? 'hour' : 'hours'})`,
      `Plan: ${activeSegment === 'weekday' ? 'Weekday' : 'Weekend'} (₹${formatInr(activePrice)}/hr)`,
      `Estimated Rate: ₹${formatInr(estimatedTotal)}`,
      space.capacity ? `Capacity: Up to ${space.capacity} people` : '',
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
                    <span>Time Slot / Custom Timing</span>
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
                      <Clock size={14} className="text-slate-400 shrink-0 pointer-events-none" />
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
                      <Clock size={14} className="text-slate-400 shrink-0 pointer-events-none" />
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
            <div className="space-y-3 py-2">
              <h3 className="text-sm font-extrabold text-[#111111]">Space Highlights & Features</h3>
              <div className="space-y-2.5">
                {[
                  {
                    icon: '🎨',
                    title: 'Creative Atmosphere',
                    desc: 'Customizable art space suited for individual creation or group workshops.',
                  },
                  {
                    icon: '⚡',
                    title: 'High-Speed Wi-Fi & Outlets',
                    desc: 'Reliable fiber connection with accessible charging at every workstation.',
                  },
                  {
                    icon: '❄️',
                    title: 'Climate Controlled',
                    desc: 'Central cooling and abundant natural lighting from large floor-to-ceiling windows.',
                  },
                  {
                    icon: '🪑',
                    title: 'Ergonomic Setup',
                    desc: 'Comfortable swivel chairs and sturdy wooden worktables.',
                  },
                  {
                    icon: '☕',
                    title: 'WooWoo Café Onsite',
                    desc: 'Fresh coffee, artisanal teas, and gourmet snacks available right inside the studio.',
                  },
                  {
                    icon: '🧼',
                    title: 'Sanitized & Clean',
                    desc: 'Clean wash stations, sink with running water for painting cleanups, and restrooms.',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-[#FAFBFD] p-3"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900">{item.title}</p>
                      <p className="text-[11px] sm:text-xs text-slate-500 leading-snug mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between rounded-2xl bg-[#FAF5FF] border border-purple-100 p-3.5">
                <div>
                  <p className="text-xs font-bold text-[#7C3AED]">Community Rating</p>
                  <p className="text-2xl font-black text-slate-900 mt-0.5">4.9 / 5.0</p>
                </div>
                <div className="text-amber-400 text-lg">★★★★★</div>
              </div>
              <div className="space-y-2.5">
                {[
                  {
                    name: 'Priya Sharma',
                    date: 'Yesterday',
                    comment: 'The natural lighting and creative vibe here is unmatched. Will book again!',
                  },
                  {
                    name: 'Rahul Mehta',
                    date: '3 days ago',
                    comment: 'Hosted our fluid art workshop here. Smooth setup and super supportive staff.',
                  },
                  {
                    name: 'Ananya Deshmukh',
                    date: 'Last week',
                    comment: 'Calm, productive, and comfortable for long creative sessions.',
                  },
                ].map((fb, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-100 bg-white p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900">{fb.name}</p>
                      <span className="text-[10px] text-slate-400">{fb.date}</span>
                    </div>
                    <div className="text-amber-400 text-[11px]">★★★★★</div>
                    <p className="text-xs text-slate-600 leading-relaxed">{fb.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions: Share on left, Query on right */}
        <div className="border-t border-slate-100 bg-white p-4 flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleShare}
            className="flex h-12 w-14 sm:h-13 sm:w-16 shrink-0 items-center justify-center rounded-2xl border border-purple-200 bg-white text-[#6344E7] hover:bg-purple-50 transition active:scale-95 cursor-pointer shadow-xs"
            title="Share space"
            aria-label="Share space"
          >
            <Share2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleQuery}
            className="flex h-12 sm:h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#6344E7] hover:bg-[#5235D9] text-white text-base font-bold shadow-md shadow-purple-500/25 transition active:scale-95 cursor-pointer"
          >
            <Search className="h-4.5 w-4.5 stroke-[2.5]" />
            <span>Query</span>
          </button>
        </div>
      </div>
    </div>
  );
}
