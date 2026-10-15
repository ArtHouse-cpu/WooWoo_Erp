import {useEffect, useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import axios from 'axios';
import {SpaceEnquiry} from '../../components/spaces/SpaceEnquiry';
import {SpacePhoto} from '../../components/spaces/SpacePhoto';
import {formatInr, setSpacePageMeta, spacePriceLine, spaceShareUrl} from '../../components/spaces/spaceActions';
import {fetchPublicSpace, type SpaceCard} from '../../services/space.service';

export default function PublicSpacePage() {
  const {id = ''} = useParams();
  const [space, setSpace] = useState<SpaceCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setMissing(false);
    setError('');
    setSpace(null);
    fetchPublicSpace(id, controller.signal)
      .then(setSpace)
      .catch((err: unknown) => {
        if (controller.signal.aborted || axios.isCancel(err)) return;
        if (axios.isAxiosError(err) && err.code === 'ERR_CANCELED') return;
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setMissing(true);
          return;
        }
        setError('Could not load this space.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!space) return;
    return setSpacePageMeta({
      title: `${space.name} · WooWoo Spaces`,
      description: space.description || `${space.name} at WooWoo Art House.`,
      image: space.imageUrl,
      url: spaceShareUrl(space.id),
    });
  }, [space]);

  return (
    <div className="min-h-dvh bg-[#FAFBFD]">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <p className="font-display text-lg font-bold text-[#111111]">WooWoo Spaces</p>
          <Link to="/login" className="text-sm font-extrabold text-[#EA580C]">
            Customer login
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="aspect-[4/3] animate-pulse rounded-3xl bg-slate-100" />
            <div className="space-y-3">
              <div className="h-8 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        ) : missing ? (
          <Unavailable message="This space is unavailable." />
        ) : error ? (
          <Unavailable message={error} />
        ) : space ? (
          <article className="grid gap-6 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm md:grid-cols-2">
            <div className="aspect-[4/3] bg-[#FFF7ED] md:aspect-auto md:min-h-[360px]">
              <SpacePhoto src={space.imageUrl} alt={space.name} />
            </div>
            <div className="space-y-4 p-5 text-left sm:p-6">
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#EA580C]">
                {space.spaceType || 'Space'}
              </p>
              <h1 className="font-display text-3xl font-bold text-[#111111]">{space.name}</h1>
              <p className="font-semibold text-slate-500">
                {space.category || 'Studio'}
                {space.capacity ? ` · Up to ${space.capacity}` : ''}
              </p>
              <p className="text-2xl font-extrabold">From ₹{formatInr(space.fromPrice)}</p>
              <p className="text-sm font-bold text-[#EA580C]">{spacePriceLine(space)}</p>
              <p className="text-sm leading-6 text-slate-600">
                {space.description || 'Ask us about this space and we will share the details.'}
              </p>
              <SpaceEnquiry space={space} />
            </div>
          </article>
        ) : null}
      </main>
    </div>
  );
}

function Unavailable({message}: {message: string}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center">
      <h1 className="font-display text-2xl font-bold text-[#111111]">Space unavailable</h1>
      <p className="mt-2 text-sm font-semibold text-slate-500">{message}</p>
      <Link
        to="/login"
        className="mt-5 inline-flex rounded-xl bg-[#EA580C] px-4 py-2 text-sm font-extrabold text-white"
      >
        Go to WooWoo
      </Link>
    </div>
  );
}
