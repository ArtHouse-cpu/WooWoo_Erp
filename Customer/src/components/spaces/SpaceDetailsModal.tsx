import {useEffect} from 'react';
import {X} from 'lucide-react';
import type {SpaceCard} from '../../services/space.service';
import {formatInr, spacePriceLine} from './spaceActions';
import {SpaceEnquiry} from './SpaceEnquiry';
import {SpacePhoto} from './SpacePhoto';

export function SpaceDetailsModal({
  space,
  onClose,
}: {
  space: SpaceCard | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!space) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [space, onClose]);

  if (!space) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="space-details-title"
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#EA580C]">
            {space.spaceType || 'Space'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close space details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="aspect-square bg-[#FFF7ED]">
            <SpacePhoto src={space.imageUrl} alt={space.name} />
          </div>
          <div className="flex flex-col gap-3 p-4 text-left sm:p-5">
            <div>
              <h2 id="space-details-title" className="font-display text-2xl font-bold text-[#111111]">
                {space.name}
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {space.category || 'Studio'}
                {space.capacity ? ` · Up to ${space.capacity}` : ''}
              </p>
            </div>
            <p className="text-xl font-extrabold text-[#111111]">From ₹{formatInr(space.fromPrice)}</p>
            <p className="text-sm font-bold text-[#EA580C]">{spacePriceLine(space)}</p>
            <p className="text-sm leading-6 text-slate-600">
              {space.description || 'Ask us about this space and we will share the details.'}
            </p>
            <div className="mt-auto pt-2">
              <SpaceEnquiry space={space} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
