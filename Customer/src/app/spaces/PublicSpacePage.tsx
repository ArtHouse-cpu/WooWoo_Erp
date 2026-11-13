import {useEffect, useState} from 'react';
import {Link, useParams, useSearchParams, useNavigate} from 'react-router-dom';
import axios from 'axios';
import {Crown, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Info, Tag} from 'lucide-react';
import {SpaceEnquiry} from '../../components/spaces/SpaceEnquiry';
import {ImageCarousel} from '../../components/ui/ImageCarousel';
import {
  formatInr,
  setSpacePageMeta,
  spacePriceLine,
  spaceShareUrl,
  MEMBERSHIP_TIERS,
} from '../../components/spaces/spaceActions';
import {fetchPublicSpace, type SpaceCard} from '../../services/space.service';

export default function PublicSpacePage() {
  const {id = ''} = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const membershipParam = searchParams.get('membership');

  const [space, setSpace] = useState<SpaceCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');

  const [isDiscountsOpen, setIsDiscountsOpen] = useState(Boolean(membershipParam));
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(membershipParam);

  useEffect(() => {
    if (membershipParam) {
      setSelectedMembershipId(membershipParam);
      setIsDiscountsOpen(true);
    }
  }, [membershipParam]);

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
      url: spaceShareUrl(space.id, selectedMembershipId),
    });
  }, [space, selectedMembershipId]);

  const basePrice = space?.weekdayPrice ?? space?.fromPrice ?? 0;
  const selectedTier = MEMBERSHIP_TIERS.find(t => t.id === selectedMembershipId) || null;
  const discountRate = selectedTier ? selectedTier.discountPercent / 100 : 0;
  const unitDiscount = Math.round(basePrice * discountRate);
  const finalUnitPrice = Math.max(0, basePrice - unitDiscount);

  return (
    <div className="min-h-dvh bg-[#FAFBFD]">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-[#4B5563] shadow-[0_2px_8px_rgba(15,23,42,0.02)] transition hover:scale-95 cursor-pointer"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5 text-[#111111]" strokeWidth={2.5} />
            </button>
            <p className="font-display text-lg font-bold text-[#111111]">WooWoo Spaces</p>
          </div>
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
            <div className="w-full bg-[#FFF7ED] md:min-h-[360px] flex items-center">
              <ImageCarousel
                images={space.images?.length > 0 ? space.images : space.imageUrl ? [space.imageUrl] : []}
                alt={space.name}
                aspectRatio="aspect-[4/3] md:aspect-auto md:h-full"
                roundedClassName="rounded-none md:rounded-l-3xl"
                showDots={(space.images?.length || 0) > 1}
                showArrows={(space.images?.length || 0) > 1}
              />
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

              {/* Price Display with Membership Discount */}
              <div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-black text-[#111111]">
                    {selectedTier && basePrice > finalUnitPrice ? (
                      <>
                        <span className="text-[#6344E7]">₹{formatInr(finalUnitPrice)}</span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-500"> / hr</span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-400 line-through ml-2">
                          ₹{formatInr(basePrice)}
                        </span>
                      </>
                    ) : (
                      <>From ₹{formatInr(space.fromPrice)}</>
                    )}
                  </span>
                  {selectedTier && basePrice > finalUnitPrice && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3E8FF] px-3 py-1 text-xs font-bold text-[#7C3AED] shadow-3xs">
                      <Tag size={13} className="shrink-0" />
                      <span>You save ₹{formatInr(unitDiscount)} ({selectedTier.discountPercent}%)</span>
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-[#EA580C] mt-1">{spacePriceLine(space)}</p>
              </div>

              {/* Membership Discounts Dropdown below actual price */}
              <div className="rounded-2xl border border-purple-100 bg-[#FAF9FF] p-3.5 text-left transition shadow-xs">
                {/* Dropdown Header Toggle */}
                <div
                  onClick={() => setIsDiscountsOpen(v => !v)}
                  className="flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-200/60 shadow-3xs">
                      <Crown className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-amber-500 fill-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-xs sm:text-sm text-[#111111] leading-tight">
                        Membership Discounts
                      </h4>
                      <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 leading-tight mt-0.5 truncate">
                        Get exclusive discounts and cashback on space booking
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-purple-100/60 transition cursor-pointer"
                    aria-label={isDiscountsOpen ? 'Collapse discounts' : 'Expand discounts'}
                  >
                    {isDiscountsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Dropdown Content */}
                {isDiscountsOpen && (
                  <div className="mt-3 space-y-2 border-t border-purple-100/60 pt-3">
                    {MEMBERSHIP_TIERS.map(tier => {
                      const isSelected = selectedMembershipId === tier.id;
                      const tierDiscount = Math.round(basePrice * (tier.discountPercent / 100));
                      const tierFinalPrice = Math.max(0, basePrice - tierDiscount);
                      const IconComponent = tier.icon;

                      return (
                        <div
                          key={tier.id}
                          onClick={() =>
                            setSelectedMembershipId(prev => (prev === tier.id ? null : tier.id))
                          }
                          className={`flex items-center justify-between gap-2 rounded-xl p-2 sm:p-2.5 transition cursor-pointer ${
                            isSelected
                              ? 'border-2 border-[#6344E7] bg-white shadow-xs'
                              : 'border border-slate-100 bg-white hover:border-purple-200'
                          }`}
                        >
                          {/* Left: Icon, Name, Subtitle */}
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tier.iconBg} ${tier.iconColor}`}
                            >
                              <IconComponent size={16} className="stroke-[2.2]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-[#111111] truncate">
                                {tier.name}
                              </p>
                              <p className="text-[10px] font-semibold text-slate-500 mt-0.5 truncate">
                                Up to {tier.discountPercent}% OFF • {tier.cashbackPercent}% Cashback
                              </p>
                            </div>
                          </div>

                          {/* Right: Vertical divider, Savings, Prices, Radio button */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="h-6 w-px bg-slate-200" />
                            <div className="text-right">
                              <p className="text-[10px] sm:text-[11px] font-bold text-[#6344E7] leading-tight">
                                Save ₹{formatInr(tierDiscount)}
                              </p>
                              <div className="flex items-baseline justify-end gap-1 mt-0.5">
                                <span className="text-xs font-black text-[#111111]">
                                  ₹{formatInr(tierFinalPrice)}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400 line-through">
                                  ₹{formatInr(basePrice)}
                                </span>
                              </div>
                            </div>
                            {/* Radio circle */}
                            <div
                              className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                                isSelected ? 'border-[#6344E7]' : 'border-slate-300'
                              }`}
                            >
                              {isSelected && (
                                <div className="h-2 w-2 rounded-full bg-[#6344E7]" />
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
                        navigate('/membership');
                      }}
                      className="w-full mt-2 flex items-center justify-between rounded-xl bg-[#F3E8FF] hover:bg-[#E9D5FF] px-3 py-2 text-[#6344E7] transition active:scale-[0.99] cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <Info size={15} className="shrink-0" />
                        <span>Learn More About Membership</span>
                      </div>
                      <ChevronRight size={15} className="shrink-0" />
                    </button>
                  </div>
                )}
              </div>

              <p className="text-sm leading-6 text-slate-600">
                {space.description || 'Ask us about this space and we will share the details.'}
              </p>
              <SpaceEnquiry space={space} membershipTier={selectedTier} />
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
