import {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  ChevronLeft,
  Search,
  X,
  UtensilsCrossed,
  Sparkles,
  Coffee,
  CalendarCheck,
} from 'lucide-react';
import {motion} from 'framer-motion';
import {foodCategoryEmoji} from '../../data/foodMenu';
import {fetchCustomerFoods, type FoodMenuItem} from '../../services/food.service';
import {FoodBookingModal} from '../../components/woofoo/FoodBookingModal';

export default function FoodMenuPage() {
  const navigate = useNavigate();

  const [menu, setMenu] = useState<FoodMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedItemForBooking, setSelectedItemForBooking] = useState<string | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    void fetchCustomerFoods(controller.signal)
      .then(items => {
        if (!controller.signal.aborted) setMenu(items);
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        setMenu([]);
        setLoadError(error instanceof Error ? error.message : 'Could not load the food menu.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const categories = useMemo(() => {
    const names = [...new Set(menu.map(item => item.category).filter(Boolean))];
    names.sort((a, b) => a.localeCompare(b));
    return [{id: 'all', label: 'All', emoji: '🍽️'}, ...names.map(name => ({
      id: name,
      label: name,
      emoji: foodCategoryEmoji(name),
    }))];
  }, [menu]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const inCategory =
      activeCategory === 'all'
        ? menu
        : menu.filter(item => item.category === activeCategory);

    if (!query) return inCategory;

    const matches = (item: FoodMenuItem) =>
      item.name.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query));

    const inCat = inCategory.filter(matches);
    if (inCat.length > 0) return inCat;
    return menu.filter(matches);
  }, [activeCategory, menu, searchQuery]);

  const handleOpenBooking = (itemName?: string) => {
    setSelectedItemForBooking(itemName);
    setIsBookingOpen(true);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };

  return (
    <div className="min-h-dvh bg-[#FAFBFD] text-left pb-16">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 border-b border-black/[0.05] bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Back Button & Title */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <button
                type="button"
                onClick={handleBack}
                className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border border-black/[0.06] bg-white text-slate-700 shadow-xs transition hover:bg-slate-50 hover:scale-95 active:scale-90 cursor-pointer"
                aria-label="Back"
              >
                <ChevronLeft className="h-5 w-5 sm:h-5 sm:w-5 text-[#111111]" strokeWidth={2.5} />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-lg sm:text-2xl font-black text-[#111111] tracking-tight">
                    Food Menu
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF0EB] px-2 py-0.5 text-[10.5px] font-extrabold text-[#EA580C] border border-[#FFEDD5]">
                    <Coffee className="h-3 w-3" />
                    WooFoo
                  </span>
                </div>
                <p className="hidden sm:block text-xs text-slate-500 font-medium truncate mt-0.5">
                  Explore our delicious food and beverages.
                </p>
              </div>
            </div>

            {/* Right: Booking CTA Button */}
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => handleOpenBooking()}
                className="py-2 px-3.5 sm:py-2.5 sm:px-5 rounded-xl sm:rounded-2xl bg-[#EA580C] text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 sm:gap-2 shadow-sm hover:bg-[#D97706] active:scale-95 transition-all duration-150 cursor-pointer"
              >
                <CalendarCheck className="h-4 w-4" strokeWidth={2.5} />
                <span>Booking</span>
              </button>
            </div>
          </div>

          {/* Subtitle visible on mobile below header row */}
          <p className="sm:hidden text-[11px] text-slate-500 font-medium mt-1 pl-1">
            Explore our delicious food and beverages.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search food or drinks..."
              className="w-full rounded-2xl border border-slate-200/90 bg-[#F8FAFC] pl-10 pr-9 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#EA580C] focus:outline-none focus:ring-2 focus:ring-orange-100 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition text-xs"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs (Horizontally scrollable on mobile) */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-2.5">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 -mx-1 px-1">
            {categories.map(cat => {
              const isActive = activeCategory === cat.id;
              const count =
                cat.id === 'all'
                  ? menu.length
                  : menu.filter(item => item.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSearchQuery('');
                  }}
                  className={`flex items-center gap-1.5 py-2 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 ${
                    isActive
                      ? 'bg-[#EA580C] text-white shadow-sm shadow-orange-500/25 ring-2 ring-orange-400/20'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-orange-50/50 hover:text-[#EA580C] hover:border-orange-200'
                  }`}
                >
                  <span className="text-sm">{cat.emoji}</span>
                  <span>{cat.label}</span>
                  <span
                    className={`ml-1 text-[10px] sm:text-xs rounded-full px-1.5 py-0.2 font-extrabold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Food Card Grid */}
      <main className="mx-auto max-w-6xl px-3 sm:px-6 pt-4 sm:pt-6">
        {loading ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-12 text-center shadow-xs">
            <p className="text-sm font-semibold text-slate-500">Loading the menu…</p>
          </div>
        ) : loadError ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-12 text-center shadow-xs">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">Menu unavailable</h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">{loadError}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-12 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C] mb-3">
              <UtensilsCrossed className="h-7 w-7" />
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">No Food or Drinks Found</h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              We couldn't find any items matching &ldquo;{searchQuery}&rdquo;. Try another search keyword or switch
              categories.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 py-2 px-4 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-bold hover:bg-slate-800 transition cursor-pointer"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredItems.map(item => (
              <FoodItemCard
                key={item.id}
                item={item}
                onBookClick={() => handleOpenBooking(item.name)}
              />
            ))}
          </div>
        )}

        {/* Experience Banner at Bottom */}
        <div className="mt-8 sm:mt-10 rounded-3xl border border-[#FFEDD5] bg-gradient-to-r from-[#FFF5EF] via-[#FFF9F5] to-white p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EA580C] text-white shadow-md shadow-orange-500/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-black text-slate-900">
                Planning a special celebration or date?
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Reserve your table in advance and let our team curate a memorable WooFoo culinary experience.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenBooking()}
            className="w-full sm:w-auto shrink-0 py-2.5 px-5 rounded-xl bg-[#EA580C] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#D97706] active:scale-95 transition shadow-sm cursor-pointer"
          >
            <CalendarCheck className="h-4 w-4" />
            <span>Book Experience Now</span>
          </button>
        </div>
      </main>

      {/* Booking Lead Modal */}
      <FoodBookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        preferredItemName={selectedItemForBooking}
      />
    </div>
  );
}

/** Individual Food Item Card */
function FoodItemCard({item, onBookClick}: {item: FoodMenuItem; onBookClick: () => void}) {
  return (
    <motion.article
      initial={{opacity: 0, y: 10}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.2}}
      onClick={onBookClick}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onBookClick();
        }
      }}
      role="button"
      tabIndex={0}
      className="group flex cursor-pointer flex-col justify-between overflow-hidden rounded-[18px] sm:rounded-[22px] border border-black/[0.06] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(234,88,12,0.12)] hover:-translate-y-1 transition-all duration-200"
    >
      <div>
        {/* Food Image Container with consistent dimensions */}
        <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100">
          <img
            src={item.image || undefined}
            alt={item.name}
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-108 ${
              item.image ? '' : 'hidden'
            }`}
          />
        </div>

        <div className="px-2.5 py-2 sm:px-3.5 sm:py-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border bg-white ${
                item.isVeg ? 'border-emerald-600' : 'border-rose-600'
              }`}
              title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
            >
              <span
                className={`h-2 w-2 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`}
              />
            </span>
            <h3 className="min-w-0 flex-1 truncate text-left text-xs font-extrabold leading-snug text-slate-900 transition-colors group-hover:text-[#EA580C] sm:text-sm">
              {item.name}
            </h3>
            <p className="shrink-0 text-right text-sm font-black tracking-tight text-[#EA580C] sm:text-base">
              ₹{item.price.toLocaleString('en-IN')}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBookClick();
              }}
              className="ml-1 py-1 px-2.5 rounded-lg bg-[#FFF0EB] text-[#EA580C] text-[11px] font-bold hover:bg-[#EA580C] hover:text-white transition cursor-pointer shrink-0"
            >
              Book
            </button>
          </div>

          {item.description ? (
            <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-relaxed text-slate-500 sm:text-xs">
              {item.description}
            </p>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}
