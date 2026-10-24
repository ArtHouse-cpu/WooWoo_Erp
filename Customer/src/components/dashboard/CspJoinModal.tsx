import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Store,
  Search,
  ChevronDown,
  Link2,
  Gift,
  Coins,
  Percent,
  Check,
  ArrowRight,
  Globe,
  MoreHorizontal,
  ShoppingBag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import {useAuthStore} from '../../store/authStore';
import {
  cspApi,
  normalizePrositeUrl,
  type CspApplication,
} from '../../services/csp.service';

type CspJoinModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

// Available categories for search & multi-select
const ALL_CATEGORIES = [
  'Art Supplies',
  'Home Decor',
  'Fashion',
  'Handmade Crafts',
  'Pottery & Ceramics',
  'Jewellery & Accessories',
  'Stationery & Journals',
  'Paintings & Canvas',
  'Toys & Dolls',
  'Candles & Fragrances',
  'Gift Hampers',
  'Prints & Digital Art',
  'Clothing & Apparel',
  'Organic Goods',
];

// Selling platforms
type PlatformOption = {
  id: string;
  name: string;
  renderIcon: () => React.ReactNode;
};

const PLATFORMS: PlatformOption[] = [
  {
    id: 'online_store',
    name: 'Online Store',
    renderIcon: () => (
      <ShoppingBag className="w-4 h-4 text-[#EA580C] shrink-0" strokeWidth={2.2} />
    ),
  },
  {
    id: 'amazon',
    name: 'Amazon',
    renderIcon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none">
        <text
          x="3"
          y="15"
          fill="#111827"
          fontSize="15"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          a
        </text>
        <path
          d="M5 17C8.5 19.5 14.5 19.5 18.5 15M18.5 15L16 14.5M18.5 15L17.5 17"
          stroke="#FF9900"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'meesho',
    name: 'Meesho',
    renderIcon: () => (
      <div className="w-4 h-4 rounded-xs bg-[#580044] flex items-center justify-center shrink-0">
        <span className="text-white font-black text-[9px] lowercase leading-none">m</span>
      </div>
    ),
  },
  {
    id: 'myntra',
    name: 'Myntra',
    renderIcon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
        <path
          d="M3 18L6.5 8C7.2 6.5 9.5 6.5 10.2 8L12 12L13.8 8C14.5 6.5 16.8 6.5 17.5 8L21 18"
          fill="none"
          stroke="url(#myntraGrad)"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="myntraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF3F6C" />
            <stop offset="50%" stopColor="#F25729" />
            <stop offset="100%" stopColor="#F9A01B" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: 'flipkart',
    name: 'Flipkart',
    renderIcon: () => (
      <div className="w-4 h-4 rounded-xs bg-[#FFE500] border border-[#2874F0]/30 flex items-center justify-center shrink-0">
        <span className="text-[#2874F0] font-black text-[10px] italic leading-none">f</span>
      </div>
    ),
  },
  {
    id: 'other_online',
    name: 'Other Online',
    renderIcon: () => (
      <Globe className="w-4 h-4 text-slate-700 shrink-0" strokeWidth={1.8} />
    ),
  },
  {
    id: 'offline_store',
    name: 'Offline Store',
    renderIcon: () => (
      <Store className="w-4 h-4 text-slate-700 shrink-0" strokeWidth={1.8} />
    ),
  },
  {
    id: 'other',
    name: 'Other',
    renderIcon: () => (
      <div className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center shrink-0">
        <MoreHorizontal className="w-3 h-3 text-slate-700" />
      </div>
    ),
  },
];

export function CspJoinModal({ isOpen, onClose }: CspJoinModalProps) {
  // Form states matching mockup
  const [brandName, setBrandName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
   
    
  ]);
  const [categorySearch, setCategorySearch] = useState('');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [prositeUrl, setPrositeUrl] = useState('');
  const [alreadySelling, setAlreadySelling] = useState<'yes' | 'no'>('yes');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'online_store',
  ]);

  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Close category dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRemoveCategory = (cat: string) => {
    setSelectedCategories((prev) => prev.filter((item) => item !== cat));
  };

  const handleToggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((item) => item !== cat) : [...prev, cat]
    );
  };



  const handleTogglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredCategories = ALL_CATEGORIES.filter((cat) =>
    cat.toLowerCase().includes(categorySearch.toLowerCase().trim())
  );

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<CspApplication | null>(null);
  const customer = useAuthStore(state => state.customer);

  // Reset isSubmitted when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setIsSubmitted(false);
      return;
    }
    let cancelled = false;
    cspApi
      .mine()
      .then(({data}) => {
        if (!cancelled) setExisting(data.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setExisting(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (existing?.status === 'under_review' || existing?.status === 'approved') {
      return;
    }
    if (!customer?._id) {
      Swal.fire({
        icon: 'warning',
        title: 'Sign in required',
        text: 'Sign in so we can attach this application to your customer id.',
        confirmButtonColor: '#EA580C',
      });
      return;
    }
    if (!brandName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Brand Name Required',
        text: 'Please enter your brand or business name.',
        confirmButtonColor: '#EA580C',
      });
      return;
    }
    if (selectedCategories.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Select Category',
        text: 'Please select at least one category.',
        confirmButtonColor: '#EA580C',
      });
      return;
    }
    const prosite = normalizePrositeUrl(prositeUrl);
    if (!prosite) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Prosite URL',
        text: 'Use a link like 1atives.com/pro/your-name.',
        confirmButtonColor: '#EA580C',
      });
      return;
    }
    if (alreadySelling === 'yes' && selectedPlatforms.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Where are you selling?',
        text: 'Select at least one place where you currently sell.',
        confirmButtonColor: '#EA580C',
      });
      return;
    }

    try {
      setSubmitting(true);
      const {data} = await cspApi.apply({
        customerId: customer._id,
        brandName: brandName.trim(),
        categories: selectedCategories,
        prositeUrl: prosite,
        alreadySelling: alreadySelling === 'yes',
        sellingPlatforms: alreadySelling === 'yes' ? selectedPlatforms : [],
      });
      setExisting(data.data);
      setIsSubmitted(true);
    } catch (error) {
      const message =
        (error as {response?: {data?: {message?: string}}})?.response?.data
          ?.message || 'Could not submit your application.';
      Swal.fire({
        icon: 'error',
        title: 'Application not submitted',
        text: message,
        confirmButtonColor: '#EA580C',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseAll = () => {
    setIsSubmitted(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Modal / Bottom Sheet Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            className="relative z-10 flex max-h-[94dvh] w-full max-w-lg flex-col rounded-t-[32px] sm:rounded-[32px] bg-white shadow-2xl overflow-hidden border-t sm:border border-slate-100"
          >
            {/* Mobile Drag Handle */}
            <div className="flex shrink-0 justify-center pt-3 pb-1">
              <div className="h-1.5 w-12 rounded-full bg-slate-300" />
            </div>

            {/* Header */}
            <div className="relative shrink-0 px-6 pt-2 pb-3 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    CSP Program
                  </h2>
                  {/* Orange Sparkle / Burst */}
                  <svg
                    className="w-5 h-5 text-[#F95721] shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="4" y1="14" x2="8" y2="12" />
                    <line x1="8" y1="6" x2="11" y2="9.5" />
                    <line x1="16" y1="5" x2="13.5" y2="9.5" />
                  </svg>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Join as a Creative Seller Partner
                </p>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
              
              {/* Highlight Benefits Strip */}
              <div className="rounded-2xl bg-[#FFF9F5] border border-[#FDEEE4] p-3 sm:p-3.5 flex items-center justify-between shadow-xs">
                {/* Highlight 1 */}
                <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
                  <Gift className="w-5 h-5 text-[#EA580C] shrink-0" strokeWidth={1.8} />
                  <span className="text-[10.5px] sm:text-[11px] leading-tight text-slate-700 font-medium">
                    Display your<br />products for{' '}
                    <strong className="font-extrabold text-[#EA580C]">FREE</strong>
                  </span>
                </div>

                <div className="w-[1px] h-7 bg-[#FDEEE4] shrink-0" />

                {/* Highlight 2 */}
                <div className="flex items-center gap-2 flex-1 min-w-0 px-2 justify-center">
                  <Coins className="w-5 h-5 text-[#EA580C] shrink-0" strokeWidth={1.8} />
                  <span className="text-[10.5px] sm:text-[11px] leading-tight text-slate-700 font-medium">
                    <strong className="font-extrabold text-[#EA580C]">Zero</strong> rent &amp;<br />
                    investment
                  </span>
                </div>

                <div className="w-[1px] h-7 bg-[#FDEEE4] shrink-0" />

                {/* Highlight 3 */}
                <div className="flex items-center gap-2 flex-1 min-w-0 pl-1 justify-end">
                  <Percent className="w-5 h-5 text-[#EA580C] shrink-0" strokeWidth={1.8} />
                  <span className="text-[10.5px] sm:text-[11px] leading-tight text-slate-700 font-medium">
                    <strong className="font-extrabold text-[#EA580C]">0%</strong> Commission<br />
                    on direct leads
                  </span>
                </div>
              </div>

              {existing?.status === 'rejected' && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <p className="font-bold">Application rejected</p>
                  <p className="mt-1">
                    {existing.rejectionReason || 'No reason was provided.'}
                  </p>
                  <p className="mt-1 text-xs">Update the form and apply again.</p>
                </div>
              )}
              {existing?.status === 'under_review' && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                  Your application is under review. We will update you after it is approved or rejected.
                </div>
              )}
              {existing?.status === 'approved' && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  Your application is approved. Open CSP Program from the sidebar.
                </div>
              )}

              {/* Field 1: Brand Name */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  Brand Name <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-3 transition focus-within:border-[#F95721] focus-within:ring-2 focus-within:ring-[#F95721]/10">
                  <Store className="w-4.5 h-4.5 text-slate-400 mr-2.5 shrink-0" />
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Enter your brand or business name"
                    className="w-full text-sm text-slate-800 placeholder:text-slate-400 outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* Field 2: Category (Multi-select) */}
              <div ref={categoryDropdownRef} className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-bold text-slate-800">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs font-medium text-slate-400">Select multiple</span>
                </div>

                {/* Selected Category Chips */}
                {selectedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedCategories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF3EB] border border-[#FED7AA] text-xs font-semibold text-[#EA580C]"
                      >
                        {cat}
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(cat)}
                          className="hover:text-red-600 transition cursor-pointer"
                        >
                          <X className="w-3 h-3" strokeWidth={2.5} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search / Select Trigger */}
                <div
                  onClick={() => setIsCategoryOpen((prev) => !prev)}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 cursor-pointer transition focus-within:border-[#F95721]"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={categorySearch}
                      onChange={(e) => {
                        setCategorySearch(e.target.value);
                        if (!isCategoryOpen) setIsCategoryOpen(true);
                      }}
                      onFocus={() => setIsCategoryOpen(true)}
                      placeholder="Search and select categories"
                      className="w-full text-sm text-slate-800 placeholder:text-slate-400 outline-none bg-transparent"
                    />
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                      isCategoryOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {/* Dropdown Menu */}
                {isCategoryOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl py-1 divide-y divide-slate-50">
                    {filteredCategories.length === 0 ? (
                      <p className="px-3.5 py-2.5 text-xs text-slate-400">
                        No categories found.
                      </p>
                    ) : (
                      filteredCategories.map((cat) => {
                        const isSelected = selectedCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => handleToggleCategory(cat)}
                            className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center justify-between hover:bg-slate-50 transition ${
                              isSelected ? 'text-[#EA580C] bg-[#FFF8F2]' : 'text-slate-700'
                            }`}
                          >
                            <span>{cat}</span>
                            {isSelected && <Check className="w-4 h-4 text-[#EA580C]" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Field 3: Atives Prosite URL */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  Atives Prosite URL <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-3 transition focus-within:border-[#F95721] focus-within:ring-2 focus-within:ring-[#F95721]/10">
                  <Link2 className="w-4.5 h-4.5 text-slate-400 mr-2.5 shrink-0" />
                  <input
                    type="url"
                    value={prositeUrl}
                    onChange={(e) => setPrositeUrl(e.target.value)}
                    placeholder="https://1atives.com/pro/your-name"
                    className="w-full text-sm text-slate-800 placeholder:text-slate-400 outline-none bg-transparent"
                  />
                </div>
                <a
                  href="https://1atives.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#EA580C] hover:underline cursor-pointer"
                >
                  <span>Learn more about Prosite</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Field 4: Already Selling? */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  Already Selling? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Yes Option */}
                  <div
                    onClick={() => setAlreadySelling('yes')}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition ${
                      alreadySelling === 'yes'
                        ? 'border-[#F97316] bg-[#FFF6EF]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        alreadySelling === 'yes'
                          ? 'border-[#EA580C]'
                          : 'border-slate-300'
                      }`}
                    >
                      {alreadySelling === 'yes' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
                      )}
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        alreadySelling === 'yes' ? 'text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      Yes
                    </span>
                  </div>

                  {/* No Option */}
                  <div
                    onClick={() => setAlreadySelling('no')}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition ${
                      alreadySelling === 'no'
                        ? 'border-[#F97316] bg-[#FFF6EF]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        alreadySelling === 'no'
                          ? 'border-[#EA580C]'
                          : 'border-slate-300'
                      }`}
                    >
                      {alreadySelling === 'no' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
                      )}
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        alreadySelling === 'no' ? 'text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      No
                    </span>
                  </div>
                </div>
              </div>

              {/* Field 5: Where are you currently selling? (Multi-select) */}
              {alreadySelling === 'yes' && (
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-2">
                    Where are you currently selling? <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                    {PLATFORMS.map((platform) => {
                      const isSelected = selectedPlatforms.includes(platform.id);
                      return (
                        <div
                          key={platform.id}
                          onClick={() => handleTogglePlatform(platform.id)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border-2 transition cursor-pointer select-none ${
                            isSelected
                              ? 'border-[#F97316] bg-[#FFF6EF]'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 pr-1">
                            {platform.renderIcon()}
                            <span
                              className={`text-[11px] sm:text-xs font-bold truncate ${
                                isSelected ? 'text-slate-900' : 'text-slate-700'
                              }`}
                            >
                              {platform.name}
                            </span>
                          </div>

                          {/* Checkmark or Empty Circle Indicator */}
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-[#EA580C] text-white'
                                : 'border-2 border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom padding for scroll clearance */}
              <div className="h-2" />
            </form>

            {/* Sticky Submit Button */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  existing?.status === 'under_review' ||
                  existing?.status === 'approved'
                }
                className="w-full py-3.5 px-4 rounded-2xl bg-[#F95721] hover:bg-[#EA580C] text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-[0.99] transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>
                  {submitting
                    ? 'Submitting...'
                    : existing?.status === 'approved'
                      ? 'Approved'
                      : existing?.status === 'under_review'
                        ? 'Under Review'
                        : 'Apply for CSP Program'}
                </span>
                <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>
          </motion.div>

          {/* Success Confirmation Modal (Image Reference media_1792415775048.png) */}
          <AnimatePresence>
            {isSubmitted && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Dimmed backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleCloseAll}
                  className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                />

                {/* Success Card Modal */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.88, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                  className="relative z-10 w-full max-w-[340px] rounded-[32px] bg-white p-6 pt-5 pb-6 shadow-2xl flex flex-col items-center border border-slate-100 text-center"
                >
                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={handleCloseAll}
                    className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/90 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
                    aria-label="Close confirmation"
                  >
                    <X className="h-4 w-4" strokeWidth={2.5} />
                  </button>

                  {/* Central Illustration */}
                  <div className="relative mt-2 flex items-center justify-center">
                    <svg
                      viewBox="0 0 160 160"
                      className="w-32 h-32"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Radiating Orange Sparkle / Dashes */}
                      <line x1="44" y1="36" x2="35" y2="28" stroke="#F95721" strokeWidth="4" strokeLinecap="round" />
                      <line x1="33" y1="58" x2="22" y2="61" stroke="#F95721" strokeWidth="4" strokeLinecap="round" />
                      <line x1="40" y1="84" x2="32" y2="92" stroke="#F95721" strokeWidth="4" strokeLinecap="round" />
                      <line x1="116" y1="36" x2="125" y2="28" stroke="#F95721" strokeWidth="4" strokeLinecap="round" />
                      <line x1="127" y1="58" x2="138" y2="61" stroke="#F95721" strokeWidth="4" strokeLinecap="round" />
                      <line x1="120" y1="84" x2="128" y2="92" stroke="#F95721" strokeWidth="4" strokeLinecap="round" />

                      {/* Document Card */}
                      <rect
                        x="46"
                        y="20"
                        width="68"
                        height="88"
                        rx="16"
                        fill="#FFF5ED"
                      />

                      {/* Clock Circle */}
                      <circle
                        cx="80"
                        cy="48"
                        r="16"
                        fill="none"
                        stroke="#F95721"
                        strokeWidth="3.2"
                      />
                      {/* Clock Hands */}
                      <path
                        d="M80 40V48L85 52"
                        stroke="#F95721"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Placeholder Bars */}
                      <rect x="57" y="73" width="46" height="4.5" rx="2.25" fill="#FCD8C1" />
                      <rect x="57" y="82" width="28" height="4.5" rx="2.25" fill="#FCD8C1" />

                      {/* Checkmark Badge */}
                      <circle cx="106" cy="94" r="14" fill="#F95721" />
                      <path
                        d="M100 94L104 98L112 90"
                        stroke="white"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  {/* Title */}
                  <h3 className="mt-3.5 text-[21px] font-black text-slate-900 tracking-tight">
                    Application Submitted
                  </h3>

                  {/* Status Pill */}
                  <div className="mt-2.5 inline-flex items-center px-4 py-1 rounded-full bg-[#FFF2E8] border border-[#FDEEE4] text-[12px] font-bold text-[#EA580C]">
                    Under Review
                  </div>

                  {/* Subtitle */}
                  <p className="mt-3.5 text-center text-[13.5px] font-semibold text-slate-500 leading-snug max-w-[230px]">
                    You’ll be contacted by our team in the next 24–48 hrs.
                  </p>

                  {/* Got It Button */}
                  <button
                    type="button"
                    onClick={handleCloseAll}
                    className="mt-6 w-full py-3.5 px-4 rounded-[18px] bg-[#F95721] hover:bg-[#EA580C] text-white text-[15px] font-black tracking-wide shadow-xs active:scale-[0.99] transition cursor-pointer"
                  >
                    Got it
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
}
export default CspJoinModal;
