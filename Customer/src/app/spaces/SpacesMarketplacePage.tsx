import {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import axios from 'axios';
import {ArrowLeft, Search, Share2, MessageCircle} from 'lucide-react';
import {toast} from 'sonner';
import {SpaceDetailsModal} from '../../components/spaces/SpaceDetailsModal';
import {SpacePhoto} from '../../components/spaces/SpacePhoto';
import {ShareSpaceModal} from '../../components/spaces/ShareSpaceModal';
import {
  formatInr,
  spaceBookingUrl,
  copySpaceLink,
  SPACE_WHATSAPP,
} from '../../components/spaces/spaceActions';
import {
  fetchAvailableSpaces,
  groupSpacesByName,
  type SpaceCard,
} from '../../services/space.service';

export default function SpacesMarketplacePage() {
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<SpaceCard[]>([]);
  const [search, setSearch] = useState('');
  const [spaceType, setSpaceType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<SpaceCard | null>(null);
  const [shareSpace, setShareSpace] = useState<SpaceCard | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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

  const handleBook = (space: SpaceCard) => {
    const url = spaceBookingUrl(space);
    window.open(url, '_blank', 'noopener,noreferrer');
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
              className="rounded-full p-2 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-5 w-5" />
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
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {[
              {label: 'All', value: ''},
              {label: 'Exclusive', value: 'Exclusive'},
              {label: 'Coworking', value: 'Coworking'},
            ].map(tab => {
              const active =
                tab.value === ''
                  ? !spaceType
                  : spaceType.toLowerCase() === tab.value.toLowerCase();
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setSpaceType(tab.value)}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                    active
                      ? 'border-[#6344E7] bg-[#F3E8FF] text-[#7C3AED] shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        {error ? (
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({length: 8}).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-3xl border border-slate-100 bg-white p-3 shadow-xs">
                <div className="aspect-4/3 w-full animate-pulse rounded-2xl bg-slate-100" />
                <div className="mt-3 space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-24 animate-pulse rounded-full bg-slate-100" />
                  <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                  <div className="flex items-center justify-end gap-1.5 pt-2">
                    <div className="h-8 w-8 animate-pulse rounded-xl bg-slate-100" />
                    <div className="h-8 w-16 animate-pulse rounded-xl bg-slate-100" />
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map(space => (
              <div
                key={space.id}
                onClick={() => setSelected(space)}
                className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-100 bg-white p-3 text-left shadow-xs transition hover:-translate-y-1 hover:shadow-md cursor-pointer"
              >
                <div>
                  {/* Space Image Container */}
                  <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-[#FFF9F3] flex items-center justify-center">
                    <SpacePhoto src={space.imageUrl} alt={space.name} />
                  </div>

                  {/* Space Title */}
                  <div className="mt-3">
                    <h3
                      className="min-w-0 truncate text-xs sm:text-sm font-extrabold text-[#111111]"
                      title={space.name}
                    >
                      {space.name}
                    </h3>
                  </div>

                  {/* Capacity Badge (At the place of Available) */}
                  <div className="mt-1.5 flex items-center">
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-emerald-700 border border-emerald-200/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {space.capacity > 0
                        ? `Capacity: ${space.capacity} ${space.capacity === 1 ? 'person' : 'people'}`
                        : 'Capacity: Flexible'}
                    </span>
                  </div>

                  {/* Price (Just below capacity) */}
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-500">From</span>
                    <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                      ₹{formatInr(space.fromPrice)}
                    </span>
                    <span className="text-[11px] sm:text-xs font-medium text-slate-400">/ hour</span>
                  </div>
                </div>

                {/* Action Buttons (Share and Book) */}
                <div className="mt-3 flex items-center justify-end gap-1.5 pt-2 border-t border-slate-50">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      void handleShare(space);
                    }}
                    className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl border border-purple-200 bg-white text-[#6344E7] hover:bg-purple-50 transition active:scale-95 cursor-pointer shrink-0"
                    title="Share space"
                    aria-label="Share space"
                  >
                    <Share2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleBook(space);
                    }}
                    className="inline-flex items-center justify-center rounded-xl bg-[#6344E7] hover:bg-[#5235D9] px-3.5 sm:px-4 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer shrink-0"
                  >
                    Book
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selected ? (
        <SpaceDetailsModal space={selected} onClose={() => setSelected(null)} />
      ) : null}
      <ShareSpaceModal
        space={shareSpace}
        isOpen={Boolean(shareSpace)}
        onClose={() => setShareSpace(null)}
      />
    </div>
  );
}
