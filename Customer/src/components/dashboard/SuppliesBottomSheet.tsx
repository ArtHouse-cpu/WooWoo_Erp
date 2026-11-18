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
}: {
  src: string | null | undefined;
  alt: string;
}) {
  const [broken, setBroken] = useState(false);
  const fallbackImg = 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=600&q=80';

  return (
    <img
      src={!broken && src ? src : fallbackImg}
      alt={alt}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      onError={() => setBroken(true)}
    />
  );
}

type SuppliesBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

type SupplyCategory = 'all' | 'stationery' | 'art-craft' | 'handmade-gifts';

// Curated authentic real supplies catalog
const defaultSupplies: CustomerProduct[] = [
  // Stationery
  {
    _id: 'stat-1',
    name: 'Hardbound Dot Grid Journal',
    brandName: 'WooWoo Stationery',
    price: 499,
    category: 'Stationery',
    subCategory: 'Notebooks',
    description: '160 GSM bleed-proof bamboo paper with gold foiled accents.',
    unit: 'piece',
    discountType: 'flat',
    discountValue: 0,
    availability: 'in_stock',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'],
  },
  {
    _id: 'stat-2',
    name: 'Vintage Calligraphy Ink & Pen Set',
    brandName: 'WooWoo Studio',
    price: 899,
    category: 'Stationery',
    subCategory: 'Pens',
    description: 'Hand-crafted brass dip pen with waterproof archival black ink.',
    unit: 'set',
    discountType: 'flat',
    discountValue: 0,
    availability: 'in_stock',
    imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=600&q=80'],
  },
  {
    _id: 'stat-3',
    name: 'Pastel Fineliner Drawing Pens (Set of 12)',
    brandName: 'WooWoo Craft',
    price: 349,
    category: 'Stationery',
    subCategory: 'Pens',
    description: '0.4mm precise archival ink pens for sketching & journaling.',
    unit: 'set',
    discountType: 'flat',
    discountValue: 0,
    availability: 'in_stock',
    imageUrl: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=600&q=80'],
  },
  {
    _id: 'stat-4',
    name: 'Minimalist Vegan Leather Desk Planner',
    brandName: 'WooWoo Studio',
    price: 649,
    category: 'Stationery',
    subCategory: 'Planners',
    description: 'Undated yearly & monthly organizer with bookmark ribbons.',
    unit: 'piece',
    discountType: 'flat',
    discountValue: 0,
    availability: 'in_stock',
    imageUrl: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=600&q=80'],
  },

  // Art & Craft
  {
    _id: 'art-1',
    name: 'Artist Heavy Body Acrylics (18 Colors)',
    brandName: 'WooWoo Art',
    price: 1199,
    category: 'Art & Craft',
    subCategory: 'Paints',
    description: 'High pigment load artist quality acrylic paints with satin finish.',
    unit: 'set',
    discountType: 'flat',
    discountValue: 0,
    availability: 'in_stock',
    imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=600&q=80'],
  },
  {
    _id: 'art-2',
    name: 'Birchwood Professional Brush Collection',
    brandName: 'WooWoo Art',
    price: 599,
    category: 'Art & Craft',
    subCategory: 'Brushes',
    description: '10-piece fine artist brushes for acrylics, oil & gouache.',
    unit: 'set',
    discountType: 'flat',
    discountValue: 0,
    availability: 'in_stock',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80'],
  },
  {
    _id: 'art-3',
    name: 'Cotton Stretched Canvas Boards (Pack of 4)',
    brandName: 'WooWoo Art',
    price: 449,
    category: 'Art & Craft',
    subCategory: 'Canvases',
    description: 'Triple gesso primed 380 GSM acid-free stretched canvas.',
    unit: 'pack',
    discountType: 'flat',
    discountValue: 0,
    availability: 'in_stock',
    imageUrl: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=600&q=80'],
  },
  {
    _id: 'art-4',
    name: 'Terracotta Air Dry Pottery Kit',
    brandName: 'WooWoo Craft',
    price: 799,
    category: 'Art & Craft',
    subCategory: 'Pottery',
    description: '2kg natural clay, 8 wooden tools, sponge & water-resistant sealant.',
    unit: 'kit',
    discountType: 'flat',
    discountValue: 0,
    availability: 'in_stock',
    imageUrl: 'https://images.unsplash.com/photo-1565192647048-f997ded87958?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1565192647048-f997ded87958?auto=format&fit=crop&w=600&q=80'],
  },
  {
    _id: 'art-5',
    name: 'Travel Pocket Watercolor Tin (24 Colors)',
    brandName: 'WooWoo Art',
    price: 749,
    category: 'Art & Craft',
    subCategory: 'Watercolors',
    description: 'Vibrant half-pan pigments with water reservoir brush & palette.',
    unit: 'set',
    discountType: 'flat',
    discountValue: 0,
    availability: 'in_stock',
    imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80'],
  },

  // Handmade Gifts
  {
    _id: 'gift-1',
    name: 'Handcrafted Soy Wax Botanical Candle',
    brandName: 'WooWoo Artisans',
    price: 499,
    category: 'Handmade Gifts',
    subCategory: 'Candles',
    description: 'Pure essential lavender oil with dried botanicals, 40hr burn.',
    unit: 'piece',
    discountType: 'flat',
    discountValue: 0,
    availability: 'in_stock',
    imageUrl: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=600&q=80'],
  },
  {
    _id: 'gift-2',
    name: 'Artisan Wheel-Thrown Ceramic Mug',
    brandName: 'WooWoo Pottery',
    price: 699,
    category: 'Handmade Gifts',
    subCategory: 'Ceramics',
    description: 'Stoneware coffee mug with organic reactive speckle glaze.',
    unit: 'piece',
    discountType: 'flat',
    discountValue: 0,
    availability: 'in_stock',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80'],
  },
  {
    _id: 'gift-3',
    name: 'Boho Macrame Woven Wall Tapestry',
    brandName: 'WooWoo Artisans',
    price: 899,
    category: 'Handmade Gifts',
    subCategory: 'Home Decor',
    description: 'Natural twisted unbleached cotton cord on driftwood branch.',
    unit: 'piece',
    discountType: 'flat',
    discountValue: 0,
    availability: 'in_stock',
    imageUrl: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=600&q=80'],
  },
  {
    _id: 'gift-4',
    name: 'Pressed Wildflower Floral Resin Coasters',
    brandName: 'WooWoo Artisans',
    price: 549,
    category: 'Handmade Gifts',
    subCategory: 'Resin Art',
    description: 'Set of 4 clear crystal coasters with real preserved garden blooms.',
    unit: 'set',
    discountType: 'flat',
    discountValue: 0,
    availability: 'in_stock',
    imageUrl: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=600&q=80'],
  },
];

export function SuppliesBottomSheet({isOpen, onClose}: SuppliesBottomSheetProps) {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<SupplyCategory>('all');
  const [activeDot, setActiveDot] = useState(0);
  const [apiProducts, setApiProducts] = useState<CustomerProduct[]>([]);
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
    fetchCustomerProducts({limit: 100}, controller.signal)
      .then(result => {
        setApiProducts(result.products || []);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || axios.isCancel(error)) return;
        setApiProducts([]);
      });

    return () => {
      controller.abort();
    };
  }, [isOpen]);

  // Merge API products with our rich real image defaults, ensuring real photography everywhere
  const allProducts = useMemo(() => {
    if (!apiProducts.length) return defaultSupplies;
    const enrichedApi = apiProducts.map((p, idx) => ({
      ...p,
      imageUrl: p.imageUrl || defaultSupplies[idx % defaultSupplies.length].imageUrl,
    }));
    return [...enrichedApi, ...defaultSupplies];
  }, [apiProducts]);

  // Filter products by selected category pill
  const displayedProducts = useMemo(() => {
    if (activeCategory === 'all') return allProducts;
    if (activeCategory === 'stationery') {
      return allProducts.filter(
        p =>
          p.category?.toLowerCase().includes('stationery') ||
          p.name?.toLowerCase().includes('journal') ||
          p.name?.toLowerCase().includes('pen') ||
          p.name?.toLowerCase().includes('planner')
      );
    }
    if (activeCategory === 'art-craft') {
      return allProducts.filter(
        p =>
          p.category?.toLowerCase().includes('art') ||
          p.category?.toLowerCase().includes('craft') ||
          p.name?.toLowerCase().includes('acrylic') ||
          p.name?.toLowerCase().includes('brush') ||
          p.name?.toLowerCase().includes('canvas') ||
          p.name?.toLowerCase().includes('clay') ||
          p.name?.toLowerCase().includes('color')
      );
    }
    if (activeCategory === 'handmade-gifts') {
      return allProducts.filter(
        p =>
          p.category?.toLowerCase().includes('gift') ||
          p.category?.toLowerCase().includes('handmade') ||
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
  const featured = selectedProduct ?? slides[slideIndex] ?? defaultSupplies[0];
  const sideProducts = slides
    .filter(product => product._id !== featured?._id)
    .slice(0, 4);

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
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563] transition hover:bg-[#E5E7EB]"
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
                    className={`shrink-0 px-3.5 py-1.5 rounded-full border text-[12px] font-extrabold flex items-center gap-1.5 transition-all duration-200 ${
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
              {/* Featured Hero Photo Mosaic */}
              {featured && (
                <div className="px-5 mb-4">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Featured big photo card */}
                    <button
                      type="button"
                      onClick={() => toggleProduct(featured)}
                      className={`group relative h-[250px] overflow-hidden rounded-[20px] border text-left shadow-xs transition-all ${
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
                            className={`group relative h-[119px] overflow-hidden rounded-[16px] border text-left transition-all ${
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
                          className={`h-1.5 rounded-full transition-all duration-200 ${
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
