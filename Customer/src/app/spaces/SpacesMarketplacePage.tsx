import {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import axios from 'axios';
import {ArrowLeft, Search} from 'lucide-react';
import {SpaceDetailsModal} from '../../components/spaces/SpaceDetailsModal';
import {SpacePhoto} from '../../components/spaces/SpacePhoto';
import {formatInr} from '../../components/spaces/spaceActions';
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
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<SpaceCard | null>(null);
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

  const categories = useMemo(() => {
    const names = new Set(spaces.map(space => space.category).filter(Boolean));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [spaces]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return spaces.filter(space => {
      if (spaceType && space.spaceType.toLowerCase() !== spaceType.toLowerCase()) return false;
      if (category && space.category !== category) return false;
      if (!query) return true;
      return [space.name, space.category, space.spaceType, space.description]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [spaces, search, spaceType, category]);

  return (
    <div className="min-h-dvh bg-[#FAFBFD] text-left">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#EA580C]">
              WooWoo Spaces
            </p>
            <h1 className="truncate font-display text-xl font-bold text-[#111111]">Explore spaces</h1>
          </div>
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
            {['', 'Exclusive', 'Coworking'].map(type => (
              <Chip
                key={type || 'all-types'}
                label={type || 'All types'}
                active={spaceType === type}
                onClick={() => setSpaceType(type)}
              />
            ))}
            <Chip label="All categories" active={!category} onClick={() => setCategory('')} />
            {categories.map(name => (
              <Chip
                key={name}
                label={name}
                active={category === name}
                onClick={() => setCategory(name)}
              />
            ))}
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
              <div key={index} className="overflow-hidden rounded-3xl bg-white shadow-sm">
                <div className="aspect-[4/3] animate-pulse bg-slate-100" />
                <div className="space-y-2 p-3">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
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
              <button
                key={space.id}
                type="button"
                onClick={() => setSelected(space)}
                className="overflow-hidden rounded-3xl border border-slate-100 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="aspect-[4/3]">
                  <SpacePhoto src={space.imageUrl} alt={space.name} />
                </div>
                <div className="space-y-1 p-3">
                  <p className="line-clamp-2 text-sm font-extrabold text-[#111111]">{space.name}</p>
                  <p className="line-clamp-2 text-xs font-medium text-slate-500">
                    {space.description || space.category || 'Bookable space'}
                  </p>
                  <p className="text-sm font-extrabold text-[#111111]">From ₹{formatInr(space.fromPrice)}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#EA580C]">
                    {space.spaceType || 'Space'}
                    {space.category ? ` · ${space.category}` : ''}
                  </p>
                  <span className="inline-flex text-[11px] font-extrabold text-slate-400">View details</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <SpaceDetailsModal space={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${
        active
          ? 'border-[#EA580C] bg-[#FFF7ED] text-[#EA580C]'
          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}
