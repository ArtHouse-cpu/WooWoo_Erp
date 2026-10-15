import {useEffect, useState, type ReactNode} from 'react';
import {useNavigate} from 'react-router-dom';
import axios from 'axios';
import {
  X,
  ShoppingBag,
  Tag,
  Grid,
  ShieldCheck,
  Truck,
  RotateCcw,
  Lock,
  ShoppingCart,
  MessageCircle,
  Search,
  Compass,
} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import {
  fetchCustomerProducts,
  type CustomerProduct,
} from '../../services/product.service';

const SUPPLIES_WHATSAPP = '918073988123';

function suppliesQueryUrl(product: {name: string; price: number}) {
  const text = [
    'Hi, I have a query about this product at WooWoo Art House.',
    `Name: ${product.name}`,
    `Price: ₹${formatInr(product.price)}`,
  ].join('\n');
  return `https://wa.me/${SUPPLIES_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

function formatInr(value: number) {
  return Math.max(0, Number(value) || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
}

function ProductPhoto({
  src,
  alt,
  fallback,
}: {
  src: string | null;
  alt: string;
  fallback?: ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#F3E8FF] text-[#7C3AED]">
        {fallback || <ShoppingBag className="h-6 w-6" />}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover"
      onError={() => setBroken(true)}
    />
  );
}

type SuppliesBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

type TabId = 'most-loved' | 'reviews' | 'new-arrivals';

export function SuppliesBottomSheet({isOpen, onClose}: SuppliesBottomSheetProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('most-loved');
  const [activeDot, setActiveDot] = useState(0);
  const [products, setProducts] = useState<CustomerProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CustomerProduct | null>(null);

  useEffect(() => {
    if (isOpen) return;
    setSearch('');
    setCategory('');
    setSearchOpen(false);
    setSelectedProduct(null);
    setActiveDot(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setProductsLoading(true);
      setProductsError('');
      fetchCustomerProducts(
        {search, category, limit: 100},
        controller.signal,
      )
        .then(result => {
          setProducts(result.products);
          if (result.categories.length) setCategories(result.categories);
          setActiveDot(0);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || axios.isCancel(error)) return;
          if (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') return;
          setProducts([]);
          setProductsError('Could not load products.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setProductsLoading(false);
        });
    }, search.trim() ? 250 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, search, category]);

  const visibleProducts = products;

  const toggleProduct = (product: CustomerProduct) => {
    setSearchOpen(false);
    setActiveDot(0);
    if (selectedProduct?._id === product._id) {
      setSelectedProduct(null);
      if (search === selectedProduct.name) setSearch('');
      return;
    }
    setSelectedProduct(product);
  };
  const queryText = search.trim().toLowerCase();
  const suggestions = queryText
    ? products
        .filter(product => {
          if (selectedProduct && product._id === selectedProduct._id && search === selectedProduct.name) {
            return false;
          }
          return (
            product.name.toLowerCase().includes(queryText) ||
            product.brandName.toLowerCase().includes(queryText) ||
            product.category.toLowerCase().includes(queryText)
          );
        })
        .slice(0, 8)
    : [];

  const slides = (visibleProducts.some(product => product.imageUrl)
    ? visibleProducts.filter(product => product.imageUrl)
    : visibleProducts
  ).slice(0, 8);
  const slideIndex = slides.length
    ? ((activeDot % slides.length) + slides.length) % slides.length
    : 0;
  const featured = selectedProduct ?? slides[slideIndex];
  const sideProducts = slides
    .filter(product => product._id !== featured?._id)
    .slice(0, 4);

  const tabs = [
    {id: 'most-loved' as TabId, label: 'Most Loved'},
    {id: 'reviews' as TabId, label: 'Reviews'},
    {id: 'new-arrivals' as TabId, label: 'New Arrivals'},
  ];

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

            {/* Close Button & Header Info */}
            <div className="relative shrink-0 px-5 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Supplies Icon inside soft lavender rounded square */}
                <div className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#F3E8FF] text-[#7C3AED]">
                  <ShoppingBag className="h-7 w-7" strokeWidth={2} />
                </div>
                <div className="text-left">
                  <h3 className="text-[19px] font-extrabold tracking-tight text-[#111111] leading-tight">
                    Supplies
                  </h3>
                  <p className="mt-0.5 text-[12px] font-bold text-[#6B7280]">
                    Art materials & more
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

            <div className="shrink-0 px-5 mb-3">
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    value={search}
                    onChange={event => {
                      setSearch(event.target.value);
                      setSelectedProduct(null);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    placeholder="Search product"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-[#111111] outline-none focus:border-[#EA580C]"
                  />
                </div>
                <select
                  value={category}
                  onChange={event => {
                    setCategory(event.target.value);
                    setSelectedProduct(null);
                    setSearch('');
                    setSearchOpen(false);
                  }}
                  aria-label="Category"
                  className="h-11 max-w-[42%] shrink-0 rounded-xl border border-slate-200 bg-white px-2 text-sm font-semibold text-[#111111] outline-none focus:border-[#EA580C]"
                >
                  <option value="">All categories</option>
                  {categories.map(name => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              {searchOpen && search.trim() && suggestions.length > 0 ? (
                <ul className="mt-1 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  {suggestions.map(product => (
                    <li key={product._id}>
                      <button
                        type="button"
                        onMouseDown={event => event.preventDefault()}
                        onClick={() => {
                          if (selectedProduct?._id === product._id) {
                            setSelectedProduct(null);
                            setSearch('');
                          } else {
                            setSelectedProduct(product);
                            setSearch(product.name);
                          }
                          setSearchOpen(false);
                          setActiveDot(0);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#FFF8F2]"
                      >
                        <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg">
                          <ProductPhoto src={product.imageUrl} alt="" fallback={<ShoppingBag className="h-4 w-4" />} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-extrabold text-[#111111]">
                            {product.name}
                          </span>
                          <span className="block truncate text-[11px] font-bold text-[#6B7280]">
                            {product.category || 'Supplies'} · ₹{formatInr(product.price)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {searchOpen && search.trim() && !productsLoading && suggestions.length === 0 && !selectedProduct ? (
                <p className="mt-1 px-1 text-[12px] font-bold text-[#9CA3AF]">No matching product.</p>
              ) : null}
            </div>

            {/* Interactive Category Tabs */}
            <div className="shrink-0 px-5 mb-4 flex gap-2.5 overflow-x-auto scrollbar-none">
              {tabs.map(tab => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 px-[18px] py-1.5 rounded-full border text-[13px] font-extrabold transition-all duration-200 ${
                      active
                        ? 'border-[#EA580C] bg-[#FFF8F2] text-[#EA580C]'
                        : 'border-slate-200 text-[#6B7280] hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Scrollable Contents */}
            <div className="flex-1 overflow-y-auto pb-6">
              {productsError ? (
                <p className="px-5 mb-3 text-left text-[12px] font-bold text-red-500">
                  {productsError}
                </p>
              ) : null}
              {productsLoading && visibleProducts.length === 0 ? (
                <p className="px-5 mb-4 text-[12px] font-bold text-[#9CA3AF]">Loading products…</p>
              ) : visibleProducts.length === 0 ? (
                <p className="px-5 mb-4 text-[12px] font-bold text-[#9CA3AF]">No products yet.</p>
              ) : activeTab === 'reviews' ? (
                <div className="flex flex-col items-center justify-center py-12 px-5 text-center text-[#6B7280]">
                  <ShoppingBag className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-[14px] font-extrabold text-[#111111]">Supplies Reviews</p>
                  <p className="mt-1 text-[12px]">Reviews will show here when customers leave them.</p>
                </div>
              ) : (
                <>
                  {activeTab === 'most-loved' && featured ? (
                    <div className="px-5 mb-4">
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => featured && toggleProduct(featured)}
                          className={`relative h-[255px] overflow-hidden rounded-[20px] border text-left shadow-xs ${
                            sideProducts.length ? '' : 'col-span-2'
                          } ${
                            selectedProduct?._id === featured?._id
                              ? 'border-[#EA580C] ring-2 ring-[#EA580C]'
                              : 'border-black/[0.05]'
                          }`}
                        >
                          <ProductPhoto src={featured.imageUrl} alt={featured.name} />
                          <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/35 to-transparent p-3.5 text-left">
                            <h4 className="text-[13px] font-black text-white leading-tight line-clamp-2">
                              {featured.name}
                            </h4>
                            <p className="mt-1 text-[9.5px] font-semibold text-white/80 leading-none">
                              {featured.category || featured.brandName || 'Art supplies'} · ₹{formatInr(featured.price)}
                            </p>
                          </div>
                        </button>
                        {sideProducts.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2.5">
                          {sideProducts.map(product => (
                            <button
                              key={product._id}
                              type="button"
                              onClick={() => toggleProduct(product)}
                              className={`relative h-[122px] overflow-hidden rounded-[16px] border text-left ${
                                selectedProduct?._id === product._id
                                  ? 'border-[#EA580C] ring-2 ring-[#EA580C]'
                                  : 'border-black/[0.05]'
                              }`}
                            >
                              <ProductPhoto src={product.imageUrl} alt={product.name} />
                              <div className="absolute left-2 bottom-2 max-w-[90%] rounded-[6px] bg-black/60 px-2 py-0.5 text-[8px] font-black text-white">
                                <span className="line-clamp-1">{product.name}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                        ) : null}
                      </div>
                      {slides.length > 1 ? (
                        <div className="flex justify-center gap-1.5 mt-3.5 mb-2">
                          {slides.map((product, index) => (
                            <button
                              key={product._id}
                              type="button"
                              onClick={() => setActiveDot(index)}
                              className={`h-1.5 rounded-full transition-all duration-200 ${
                                slideIndex === index ? 'bg-[#EA580C] w-3' : 'w-1.5 bg-[#E5E7EB]'
                              }`}
                              aria-label={`Show ${product.name}`}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="px-5 mb-4">
                    <h4 className="text-[15px] font-black text-[#111111] mb-3 text-left">
                      {activeTab === 'new-arrivals' ? 'New Arrivals' : 'Products'}
                    </h4>
                    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                      {visibleProducts.map(product => (
                        <button
                          key={product._id}
                          type="button"
                          onClick={() => toggleProduct(product)}
                          className={`w-[132px] shrink-0 overflow-hidden rounded-[16px] bg-[#F8FAFC] text-center ${
                            selectedProduct?._id === product._id
                              ? 'ring-2 ring-[#EA580C]'
                              : ''
                          }`}
                        >
                          <div className="h-[84px] w-full overflow-hidden">
                            <ProductPhoto src={product.imageUrl} alt={product.name} />
                          </div>
                          <div className="p-2.5">
                            <p className="text-[11px] font-black text-[#111111] leading-tight line-clamp-2">
                              {product.name}
                            </p>
                            <p className="mt-1 text-[12px] font-black text-[#7C3AED] leading-none">
                              ₹{formatInr(product.price)}
                            </p>
                            <p className="mt-1 text-[8px] font-bold text-[#9CA3AF] line-clamp-1">
                              {product.category || product.brandName || 'Supplies'}
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
                    {visibleProducts.length > 0 ? `${visibleProducts.length} Products` : 'Products'}
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
                    50+ Categories
                  </h5>
                  <p className="mt-1 text-[9px] text-[#9CA3AF] font-bold leading-tight">
                    Wide range to choose from
                  </p>
                </div>
              </div>

              {/* Trust Features Peach Strip */}
              <div className="mx-5 p-3 rounded-[16px] bg-[#FFF7ED] border border-[#FFEDD5] flex items-center justify-between gap-1">
                {/* Genuine Products */}
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4.5 w-4.5 text-[#EA580C] shrink-0" strokeWidth={2} />
                  <div className="text-[9px] font-extrabold text-[#111111] leading-tight text-left">
                    <div>Genuine</div>
                    <div className="text-[#EA580C]">Products</div>
                  </div>
                </div>

                {/* Separator */}
                <div className="h-6 w-[1px] bg-[#FFEDD5]" />

                {/* Fast Delivery */}
                <div className="flex items-center gap-1.5">
                  <Truck className="h-4.5 w-4.5 text-[#EA580C] shrink-0" strokeWidth={2} />
                  <div className="text-[9px] font-extrabold text-[#111111] leading-tight text-left">
                    <div>Fast</div>
                    <div className="text-[#EA580C]">Delivery</div>
                  </div>
                </div>

                {/* Separator */}
                <div className="h-6 w-[1px] bg-[#FFEDD5]" />

                {/* Easy Returns */}
                <div className="flex items-center gap-1.5">
                  <RotateCcw className="h-4.5 w-4.5 text-[#EA580C] shrink-0" strokeWidth={2} />
                  <div className="text-[9px] font-extrabold text-[#111111] leading-tight text-left">
                    <div>Easy</div>
                    <div className="text-[#EA580C]">Returns</div>
                  </div>
                </div>

                {/* Separator */}
                <div className="h-6 w-[1px] bg-[#FFEDD5]" />

                {/* Secure Payments */}
                <div className="flex items-center gap-1.5">
                  <Lock className="h-4.5 w-4.5 text-[#EA580C] shrink-0" strokeWidth={2} />
                  <div className="text-[9px] font-extrabold text-[#111111] leading-tight text-left">
                    <div>Secure</div>
                    <div className="text-[#EA580C]">Payments</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom sticky CTA Buttons */}
            <div className="sticky bottom-0 z-10 flex items-stretch gap-3 border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                aria-label="Explore supplies"
                title="Explore supplies"
                onClick={() => {
                  onClose();
                  navigate('/supplies');
                }}
                className="flex w-12 shrink-0 items-center justify-center rounded-[16px] bg-[#111111] text-white transition hover:bg-slate-800"
              >
                <Compass className="h-5 w-5" strokeWidth={2.5} />
              </button>
              <div className="flex min-w-0 flex-1 gap-3">
              {/* Order Online Button */}
              <button
                type="button"
                className="flex-1 py-3 px-3 rounded-[16px] border border-[#EA580C] text-[#EA580C] text-[14px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#FFF8F2] transition-colors cursor-pointer"
              >
                <ShoppingCart className="h-4.5 w-4.5" strokeWidth={2.5} />
                <span>Order Online</span>
              </button>

              {selectedProduct ? (
                <a
                  href={suppliesQueryUrl(selectedProduct)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-3 rounded-[16px] bg-[#EA580C] text-white text-[14px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#D97706] transition-colors shadow-xs cursor-pointer"
                >
                  <MessageCircle className="h-4.5 w-4.5" strokeWidth={2.5} />
                  <span>Query Now</span>
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex-1 py-3 px-3 rounded-[16px] bg-[#EA580C]/40 text-white text-[14px] font-extrabold flex items-center justify-center gap-1.5 cursor-not-allowed"
                >
                  <MessageCircle className="h-4.5 w-4.5" strokeWidth={2.5} />
                  <span>Query Now</span>
                </button>
              )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
