import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import axios from 'axios';
import {ChevronLeft, Search, Package, ShoppingCart, Share2, ArrowUp} from 'lucide-react';
import {toast} from 'sonner';
import {ProductDetailsModal} from '../../components/supplies/ProductDetailsModal';
import {ShareProductModal} from '../../components/supplies/ShareProductModal';
import {ImageCarousel} from '../../components/ui/ImageCarousel';
import {
  formatInr,
  productQueryUrl,
  copyProductLink,
} from '../../components/supplies/productActions';
import {
  fetchCustomerProducts,
  type CustomerProduct,
} from '../../services/product.service';

function getOriginalPrice(product: CustomerProduct): number {
  if (!product.discountValue || product.discountValue <= 0) return 0;
  if (product.discountType === 'percentage') {
    if (product.discountValue >= 100) return 0;
    return Math.round(product.price / (1 - product.discountValue / 100));
  }
  return product.price + product.discountValue;
}

export default function SuppliesMarketplacePage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<CustomerProduct[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<CustomerProduct | null>(null);
  const [shareProduct, setShareProduct] = useState<CustomerProduct | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const tenthCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const checkScroll = () => {
      if (tenthCardRef.current) {
        const rect = tenthCardRef.current.getBoundingClientRect();
        setShowScrollTop(rect.top <= window.innerHeight);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', checkScroll, {passive: true});
    window.addEventListener('resize', checkScroll, {passive: true});
    checkScroll();
    return () => {
      window.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [products]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchCustomerProducts({search, limit: 200}, controller.signal)
      .then(result => {
        setProducts(result.products);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || axios.isCancel(err)) return;
        if (axios.isAxiosError(err) && err.code === 'ERR_CANCELED') return;
        setProducts([]);
        setError('Could not load supplies.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [search, reloadKey]);

  const handleBuy = (product: CustomerProduct) => {
    const url = productQueryUrl(product);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const scrollToTop = () => {
    window.scrollTo({top: 0, behavior: 'smooth'});
    document.documentElement.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleShare = async (product: CustomerProduct) => {
    // Open share link modal in mobile screen only
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShareProduct(product);
      return;
    }
    // Desktop: copy link directly to clipboard
    try {
      await copyProductLink(product._id);
      toast.success('Product link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className="min-h-dvh bg-[#FAFBFD] text-left">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-[#4B5563] shadow-[0_2px_8px_rgba(15,23,42,0.02)] transition hover:scale-95 cursor-pointer"
            aria-label="Back to home"
          >
            <ChevronLeft className="h-5 w-5 text-[#111111]" strokeWidth={2.5} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-bold text-[#111111]">
              Supplies
            </h1>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-[#F8FAFC] px-3 py-2.5 focus-within:border-[#EA580C]">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder="Search paints, brushes, paper..."
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
            />
          </label>
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
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-16 animate-pulse rounded-full bg-slate-100" />
                  </div>
                  <div className="h-4 w-1/3 animate-pulse rounded-full bg-slate-100" />
                  <div className="flex items-center justify-between pt-2">
                    <div className="h-5 w-14 animate-pulse rounded bg-slate-100" />
                    <div className="h-8 w-20 animate-pulse rounded-xl bg-slate-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <p className="text-lg font-extrabold text-[#111111]">No supplies found</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Try another search or keyword.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product, index) => {
              const inStock = product.availability !== 'out_of_stock';
              const originalPrice = getOriginalPrice(product);

              const cardImages =
                product.images?.length > 0 ? product.images : product.imageUrl ? [product.imageUrl] : [];

              return (
                <div
                  key={product._id}
                  ref={index === 9 ? tenthCardRef : undefined}
                  onClick={() => setSelected(product)}
                  className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-100 bg-white p-3 text-left shadow-xs transition hover:-translate-y-1 hover:shadow-md cursor-pointer"
                >
                  <div>
                    {/* Product Photo Container with scrollable images */}
                    <ImageCarousel
                      images={cardImages}
                      alt={product.name}
                      aspectRatio="aspect-4/3"
                      roundedClassName="rounded-2xl"
                      onImageClick={() => setSelected(product)}
                      badge={
                        inStock ? (
                          <span className="pointer-events-none absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur-xs px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-emerald-700 border border-emerald-200/80 shadow-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            In Stock
                          </span>
                        ) : (
                          <span className="pointer-events-none absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur-xs px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-rose-700 border border-rose-200/80 shadow-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            Out of Stock
                          </span>
                        )
                      }
                      showDots={cardImages.length > 1}
                      showArrows={cardImages.length > 1}
                    />

                    {/* Product Title */}
                    <div className="mt-3">
                      <h3
                        className="truncate text-xs sm:text-sm font-extrabold text-[#111111]"
                        title={product.name}
                      >
                        {product.name}
                      </h3>
                    </div>

                    {/* Category Pill */}
                    <div className="mt-1.5 flex items-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F3E8FF] px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-[#7C3AED]">
                        <Package size={12} className="shrink-0 text-[#7C3AED]" />
                        <span className="truncate max-w-[120px] sm:max-w-[150px]">
                          {product.category || 'Craft Supplies'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Price & Buy/Share Action Row */}
                  <div className="mt-3 flex items-center justify-between gap-1.5 pt-2 border-t border-slate-50">
                    <div className="flex items-baseline gap-1 min-w-0">
                      <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                        ₹{formatInr(product.price)}
                      </span>
                      {originalPrice > product.price && (
                        <span className="text-[11px] sm:text-xs font-semibold text-slate-400 line-through">
                          ₹{formatInr(originalPrice)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleBuy(product);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#6344E7] hover:bg-[#5235D9] px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
                      >
                        <ShoppingCart size={13} className="shrink-0" />
                        <span>Buy</span>
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          void handleShare(product);
                        }}
                        className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl border border-purple-200 bg-white text-[#6344E7] hover:bg-purple-50 transition active:scale-95 cursor-pointer shrink-0"
                        title="Share product"
                        aria-label="Share product"
                      >
                        <Share2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Scroll to Top Button (visible after scrolling past 10 cards) */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Go to top"
        title="Go to top"
        className={`fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[#6344E7] text-white shadow-lg shadow-purple-500/30 transition-all duration-300 hover:bg-[#5235D9] hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 ${
          showScrollTop
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <ArrowUp className="h-5 w-5 stroke-[2.5]" />
      </button>

      <ProductDetailsModal product={selected} onClose={() => setSelected(null)} />

      <ShareProductModal
        product={shareProduct}
        isOpen={Boolean(shareProduct)}
        onClose={() => setShareProduct(null)}
      />
    </div>
  );
}
