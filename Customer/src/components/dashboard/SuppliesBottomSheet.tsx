import {useEffect, useState, useMemo} from 'react';
import {useNavigate} from 'react-router-dom';
import axios from 'axios';
import {
  X,
  ShoppingBag,
  Tag,
  Grid,
  MessageCircle,
  Compass,
  Sparkles,
  BookOpen,
  Palette,
  Gift,
  Package,
} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import {recordPortalEnquiry} from '../../services/enquiry.service';
import {
  fetchCustomerProducts,
  type CustomerProduct,
} from '../../services/product.service';

const SUPPLIES_WHATSAPP = '918073988123';

function suppliesQueryUrl(product?: {name?: string; price?: number; _id?: string; imageUrl?: string | null} | null) {
  if (product && product.name) {
    const text = [
      'Hi, I need to shop supplies from WooWoo Art House.',
      `Product: ${product.name}`,
      product.price ? `Price: ₹${formatInr(product.price)}` : '',
      product._id ? `Link: ${window.location.origin}/supplies/product/${encodeURIComponent(product._id)}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    return `https://wa.me/${SUPPLIES_WHATSAPP}?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/${SUPPLIES_WHATSAPP}?text=${encodeURIComponent('Hi, I need to shop supplies from WooWoo Art House.')}`;
}

function formatInr(value: number) {
  return Math.max(0, Number(value) || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
}

function ProductPhoto({
  src,
  alt,
  className = 'h-full w-full object-cover transition-transform duration-300 group-hover:scale-105',
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (!src || broken) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-purple-50/40 text-[#EA580C]/40">
        <Package className="h-8 w-8 stroke-[1.5]" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setBroken(true)}
    />
  );
}

type SuppliesBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

type SupplyCategory = 'all' | 'stationery' | 'art-craft' | 'handmade-gifts';

export function SuppliesBottomSheet({isOpen, onClose}: SuppliesBottomSheetProps) {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<SupplyCategory>('all');
  const [activeDot, setActiveDot] = useState(0);
  const [apiProducts, setApiProducts] = useState<CustomerProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CustomerProduct | null>(null);

  const categoryPills: {id: SupplyCategory; label: string; icon: any}[] = [
    {id: 'all', label: 'All Supplies', icon: Sparkles},
    {id: 'stationery', label: 'Stationery', icon: BookOpen},
    {id: 'art-craft', label: 'Art & Craft', icon: Palette},
    {id: 'handmade-gifts', label: 'Handmade Gifts', icon: Gift},
  ];

  useEffect(() => {
    if (isOpen) return;
    setSelectedProduct(null);
    setActiveDot(0);
    setActiveCategory('all');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setLoading(true);
    fetchCustomerProducts({limit: 100}, controller.signal)
      .then(result => {
        setApiProducts(result.products || []);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || axios.isCancel(error)) return;
        setApiProducts([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [isOpen]);

  const allProducts = apiProducts;

  // Filter products by selected category pill
  const displayedProducts = useMemo(() => {
    if (activeCategory === 'all') return allProducts;
    if (activeCategory === 'stationery') {
      return allProducts.filter(
        p =>
          p.category?.toLowerCase().includes('stationery') ||
          p.subCategory?.toLowerCase().includes('stationery') ||
          p.name?.toLowerCase().includes('journal') ||
          p.name?.toLowerCase().includes('pen') ||
          p.name?.toLowerCase().includes('notebook') ||
          p.name?.toLowerCase().includes('planner')
      );
    }
    if (activeCategory === 'art-craft') {
      return allProducts.filter(
        p =>
          p.category?.toLowerCase().includes('art') ||
          p.category?.toLowerCase().includes('craft') ||
          p.subCategory?.toLowerCase().includes('art') ||
          p.subCategory?.toLowerCase().includes('craft') ||
          p.name?.toLowerCase().includes('acrylic') ||
          p.name?.toLowerCase().includes('brush') ||
          p.name?.toLowerCase().includes('canvas') ||
          p.name?.toLowerCase().includes('clay') ||
          p.name?.toLowerCase().includes('paint') ||
          p.name?.toLowerCase().includes('color')
      );
    }
    if (activeCategory === 'handmade-gifts') {
      return allProducts.filter(
        p =>
          p.category?.toLowerCase().includes('gift') ||
          p.category?.toLowerCase().includes('handmade') ||
          p.subCategory?.toLowerCase().includes('gift') ||
          p.subCategory?.toLowerCase().includes('handmade') ||
          p.name?.toLowerCase().includes('candle') ||
          p.name?.toLowerCase().includes('mug') ||
          p.name?.toLowerCase().includes('macrame') ||
          p.name?.toLowerCase().includes('coaster')
      );
    }
    return allProducts;
  }, [allProducts, activeCategory]);

  const toggleProduct = (product: CustomerProduct) => {
    setActiveDot(0);
    if (selectedProduct?._id === product._id) {
      setSelectedProduct(null);
      return;
    }
    setSelectedProduct(product);
  };

  const slides = displayedProducts.slice(0, 8);
  const slideIndex = slides.length
    ? ((activeDot % slides.length) + slides.length) % slides.length
    : 0;
  const featured = selectedProduct ?? slides[slideIndex] ?? null;
  const sideProducts = featured
    ? slides.filter(product => product._id !== featured._id).slice(0, 4)
    : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Bottom Sheet Panel */}
          <motion.div
            initial={{y: '100%'}}
            animate={{y: 0}}
            exit={{y: '100%'}}
            transition={{type: 'spring', damping: 26, stiffness: 240}}
            className="relative z-10 flex max-h-[90dvh] h-auto w-full max-w-lg flex-col rounded-t-[32px] bg-white shadow-2xl overflow-hidden border-t border-slate-100"
          >
            {/* Top Drag Handle */}
            <div className="flex shrink-0 justify-center py-3">
              <div className="h-1.5 w-12 rounded-full bg-[#E5E7EB]" />
            </div>

            {/* Header Info */}
            <div className="relative shrink-0 px-5 pb-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Supplies Icon inside soft lavender rounded square */}
                <div className="flex h-13 w-13 items-center justify-center rounded-[16px] bg-[#F3E8FF] text-[#7C3AED]">
                  <ShoppingBag className="h-6.5 w-6.5" strokeWidth={2} />
                </div>
                <div className="text-left">
                  <h3 className="text-[19px] font-extrabold tracking-tight text-[#111111] leading-tight">
                    Supplies
                  </h3>
                  <p className="mt-0.5 text-[11.5px] font-bold text-[#6B7280]">
                    Stationery · Art & Craft · Handmade Gifts
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563] transition hover:bg-[#E5E7EB] cursor-pointer"
                aria-label="Close sheet"
              >
                <X className="h-4.5 w-4.5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Category Filter Pills (Stationery, Art & Craft, Handmade Gifts) */}
            <div className="shrink-0 px-5 mb-3.5 flex gap-2 overflow-x-auto scrollbar-none">
              {categoryPills.map(pill => {
                const active = activeCategory === pill.id;
                const Icon = pill.icon;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      setActiveCategory(pill.id);
                      setActiveDot(0);
                      setSelectedProduct(null);
                    }}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full border text-[12px] font-extrabold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                      active
                        ? 'border-[#EA580C] bg-[#FFF8F2] text-[#EA580C]'
                        : 'border-slate-200 text-[#6B7280] hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.5 : 2} />
                    <span>{pill.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable Contents */}
            <div className="flex-1 overflow-y-auto pb-6">
              {loading ? (
                <div className="px-5 mb-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-[250px] animate-pulse rounded-[20px] bg-slate-100" />
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="h-[119px] animate-pulse rounded-[16px] bg-slate-100" />
                      <div className="h-[119px] animate-pulse rounded-[16px] bg-slate-100" />
                      <div className="h-[119px] animate-pulse rounded-[16px] bg-slate-100" />
                      <div className="h-[119px] animate-pulse rounded-[16px] bg-slate-100" />
                    </div>
                  </div>
                  <div className="flex gap-2.5 overflow-hidden">
                    <div className="h-[160px] w-[136px] shrink-0 animate-pulse rounded-[18px] bg-slate-100" />
                    <div className="h-[160px] w-[136px] shrink-0 animate-pulse rounded-[18px] bg-slate-100" />
                    <div className="h-[160px] w-[136px] shrink-0 animate-pulse rounded-[18px] bg-slate-100" />
                  </div>
                </div>
              ) : displayedProducts.length === 0 ? (
                <div className="mx-5 my-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
                  <Package className="mx-auto h-9 w-9 text-slate-300 stroke-[1.5]" />
                  <p className="mt-2 text-[13.5px] font-extrabold text-slate-700">No supplies found</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    {activeCategory !== 'all'
                      ? 'Try selecting "All Supplies" or another category.'
                      : 'Products added in inventory will automatically show here.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Featured Hero Photo Mosaic */}
                  {featured && (
                    <div className="px-5 mb-4">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Featured big photo card */}
                        <button
                          type="button"
                          onClick={() => toggleProduct(featured)}
                          className={`group relative h-[250px] overflow-hidden rounded-[20px] border text-left shadow-xs transition-all cursor-pointer ${
                            sideProducts.length ? '' : 'col-span-2'
                          } ${
                            selectedProduct?._id === featured?._id
                              ? 'border-[#EA580C] ring-2 ring-[#EA580C]'
                              : 'border-black/[0.05]'
                          }`}
                        >
                          <ProductPhoto src={featured.imageUrl} alt={featured.name} />
                          <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/35 to-transparent p-3.5 text-left">
                            <span className="mb-1 inline-block w-fit rounded-[6px] bg-white/20 backdrop-blur-xs px-2 py-0.5 text-[8px] font-black uppercase text-white tracking-wider">
                              {featured.category || 'Featured'}
                            </span>
                            <h4 className="text-[13px] font-black text-white leading-tight line-clamp-2">
                              {featured.name}
                            </h4>
                            <p className="mt-1 text-[11px] font-extrabold text-white leading-none">
                              ₹{formatInr(featured.price)}
                            </p>
                          </div>
                        </button>

                        {/* Side Products */}
                        {sideProducts.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2.5">
                            {sideProducts.map(product => (
                              <button
                                key={product._id}
                                type="button"
                                onClick={() => toggleProduct(product)}
                                className={`group relative h-[119px] overflow-hidden rounded-[16px] border text-left transition-all cursor-pointer ${
                                  selectedProduct?._id === product._id
                                    ? 'border-[#EA580C] ring-2 ring-[#EA580C]'
                                    : 'border-black/[0.05]'
                                }`}
                              >
                                <ProductPhoto src={product.imageUrl} alt={product.name} />
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                                <div className="absolute left-2 bottom-2 max-w-[90%] rounded-[6px] bg-black/60 px-2 py-0.5 text-[8px] font-black text-white">
                                  <span className="line-clamp-1">{product.name}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      {/* Pagination Dots for Hero Slides */}
                      {slides.length > 1 ? (
                        <div className="flex justify-center gap-1.5 mt-3 mb-2">
                          {slides.map((product, index) => (
                            <button
                              key={product._id}
                              type="button"
                              onClick={() => setActiveDot(index)}
                              className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                                slideIndex === index ? 'bg-[#EA580C] w-3.5' : 'w-1.5 bg-[#E5E7EB]'
                              }`}
                              aria-label={`Show ${product.name}`}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Horizontally Scrollable Product Row */}
                  <div className="px-5 mb-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="text-[14px] font-black text-[#111111] text-left">
                        {activeCategory === 'stationery'
                          ? 'Stationery Collection'
                          : activeCategory === 'art-craft'
                          ? 'Art & Craft Supplies'
                          : activeCategory === 'handmade-gifts'
                          ? 'Handmade Gifts'
                          : 'All Supplies'}
                      </h4>
                      <span className="text-[11px] font-bold text-[#EA580C]">
                        {displayedProducts.length} items
                      </span>
                    </div>
                    <div className="flex gap-2.5 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-2">
                      {displayedProducts.map(product => (
                        <button
                          key={product._id}
                          type="button"
                          onClick={() => toggleProduct(product)}
                          className={`group w-[136px] shrink-0 snap-start overflow-hidden rounded-[18px] bg-white border text-left transition-all duration-200 cursor-pointer ${
                            selectedProduct?._id === product._id
                              ? 'border-[#EA580C] ring-2 ring-[#EA580C] shadow-md'
                              : 'border-slate-100 shadow-2xs hover:border-slate-300'
                          }`}
                        >
                          <div className="relative h-[95px] w-full overflow-hidden bg-slate-100">
                            <ProductPhoto src={product.imageUrl} alt={product.name} />
                            {product.category && (
                              <span className="absolute left-2 top-2 rounded-[5px] bg-black/60 px-1.5 py-0.5 text-[7px] font-black uppercase text-white tracking-wider backdrop-blur-xs">
                                {product.category}
                              </span>
                            )}
                          </div>
                          <div className="p-2.5">
                            <p className="text-[11px] font-black text-[#111111] leading-tight line-clamp-2">
                              {product.name}
                            </p>
                            <p className="mt-1 text-[12.5px] font-black text-[#EA580C] leading-none">
                              ₹{formatInr(product.price)}
                            </p>
                            <p className="mt-1 text-[8.5px] font-semibold text-[#6B7280] line-clamp-1">
                              {product.description || product.category || 'Quality Supplies'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Benefits Section */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-b border-slate-100 py-5 px-3 mb-5 mt-4">
                {/* Benefit 1 */}
                <div className="flex flex-col items-center text-center px-1">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F5F3FF] text-[#7C3AED]">
                    <Tag className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h5 className="text-[12px] font-black text-[#111111] mt-2 leading-none">
                    Upto 40% OFF
                  </h5>
                  <p className="mt-1 text-[9px] text-[#9CA3AF] font-bold leading-tight">
                    Best deals on top brands
                  </p>
                </div>

                {/* Benefit 2 */}
                <div className="flex flex-col items-center text-center px-1">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
                    <ShoppingBag className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h5 className="text-[12px] font-black text-[#111111] mt-2 leading-none">
                    5k+
                  </h5>
                  <p className="mt-1 text-[9px] text-[#9CA3AF] font-bold leading-tight">
                    Everything you need in one place
                  </p>
                </div>

                {/* Benefit 3 */}
                <div className="flex flex-col items-center text-center px-1">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F0FDF4] text-[#16A34A]">
                    <Grid className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h5 className="text-[12px] font-black text-[#111111] mt-2 leading-none">
                    50+ (Categories)
                  </h5>
                  <p className="mt-1 text-[9px] text-[#9CA3AF] font-bold leading-tight">
                    Curated handmade gifts
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom sticky CTA Buttons: Explore Supplies | Query Now */}
            <div className="sticky bottom-0 z-10 flex items-stretch gap-3 border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {/* Explore Supplies Button */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/supplies');
                }}
                className="flex-1 py-3 px-3 rounded-[16px] border border-[#EA580C] text-[#EA580C] text-[14px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#FFF8F2] transition-colors cursor-pointer"
              >
                <Compass className="h-4.5 w-4.5" strokeWidth={2.5} />
                <span>Explore Supplies</span>
              </button>

              {/* Query Now Button (WhatsApp) */}
              <button
                type="button"
                onClick={() => {
                  recordPortalEnquiry({
                    enquiryType: 'Store',
                    itemName: selectedProduct ? selectedProduct.name : 'Supplies General Inquiry',
                    description: 'Customer asked about shopping supplies from the customer portal.',
                  });
                  window.open(suppliesQueryUrl(selectedProduct), '_blank', 'noopener,noreferrer');
                }}
                className="flex-1 py-3 px-3 rounded-[16px] bg-[#EA580C] text-white text-[14px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#D97706] transition-colors shadow-xs cursor-pointer"
              >
                <MessageCircle className="h-4.5 w-4.5" strokeWidth={2.5} />
                <span>Query Now</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
