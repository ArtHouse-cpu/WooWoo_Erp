import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Crown,
  Laptop,
  Check,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  MessageCircle,
  BadgeIndianRupee,
  Calendar,
} from 'lucide-react';
import { formatInr, SPACE_WHATSAPP } from './spaceActions';

export interface RateCardPlan {
  id: string;
  name: string;
  duration: string;
  billingCycle: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'halfyearly';
  regularPrice: number;
  premiumPrice: number;
  savings: number;
  description: string;
  facilities: string[];
  popular?: boolean;
}

export const COWORKING_RATE_CARD_PLANS: RateCardPlan[] = [
  {
    id: 'day',
    name: '1 Day Pass',
    duration: 'Daily (1 Day)',
    billingCycle: 'daily',
    regularPrice: 399,
    premiumPrice: 319,
    savings: 80,
    description:
      'Daily access to flexible workstations, high-speed WiFi, hot beverages, and common creative amenities.',
    facilities: [
      'Flexible Workstation for the day',
      'High-Speed Wi-Fi (up to 300 Mbps)',
      'Complimentary Hot Coffee & Tea',
      'Access to Creative Lounge & Commons',
      '100% Power Backup & Ergonomic Seating',
    ],
  },
  {
    id: 'weekly',
    name: 'Weekly Pass',
    duration: 'Weekly (7 Days)',
    billingCycle: 'weekly',
    regularPrice: 2599,
    premiumPrice: 2079,
    savings: 520,
    description:
      '7-day unlimited access to modern coworking spaces, high-speed connectivity, and creative lounge perks.',
    facilities: [
      '7 Days Uninterrupted Workstation Access',
      'High-Speed Wi-Fi & Dedicated Power',
      'Complimentary Beverages & Pantry Access',
      'Access to Networking & Creative Events',
      'Flexible Hours (8:00 AM – 10:00 PM)',
    ],
  },
  {
    id: 'monthly',
    name: 'Monthly Pass',
    duration: 'Monthly (30 Days)',
    billingCycle: 'monthly',
    regularPrice: 7999,
    premiumPrice: 5999,
    savings: 2000,
    popular: true,
    description:
      'Monthly flexi desk membership with 24/7 access, meeting room credits, and community benefits.',
    facilities: [
      '30 Days Flexi Desk Workstation',
      'Meeting Room Booking Credits (2 Hours)',
      'High-Speed Fiber Connectivity',
      'Free Printing & Scanning Credits (50 pages)',
      'Locker Facility & Mail Handling Options',
    ],
  },
  {
    id: '3months',
    name: '3 Months Pass',
    duration: 'Quarterly (90 Days)',
    billingCycle: 'quarterly',
    regularPrice: 19999,
    premiumPrice: 13999,
    savings: 6000,
    description:
      'Quarterly dedicated workstation plan with storage locker, high-speed fiber internet, and boardroom booking credits.',
    facilities: [
      'Dedicated Workstation for 90 Days',
      'Boardroom Booking Credits (6 Hours)',
      'Personal Storage Locker Included',
      '3 Complimentary Guest Day Passes',
      'Priority Access to Studios & Workshops',
    ],
  },
  {
    id: '6months',
    name: '6 Months Pass',
    duration: 'Semi-Annual (180 Days)',
    billingCycle: 'halfyearly',
    regularPrice: 39998,
    premiumPrice: 27999,
    savings: 11999,
    description:
      'Semi-annual premier pass with priority desk booking, team room access, printing credits, and exclusive discounts.',
    facilities: [
      'Priority Workstation / Team Cabin Option',
      'Boardroom Booking Credits (15 Hours)',
      'Dedicated Safe Storage Locker',
      'Unlimited High-Speed Fiber Internet',
      'Exclusive 40% Discount on In-House Cafe & Supplies',
    ],
  },
];

const PRE_FILLED_WHATSAPP_MESSAGE =
  'Hi WooWoo Art House, I am interested in your coworking spaces. Please share more details about the available plans and pricing.';

export interface CoworkingRateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPass?: (passId: string) => void;
}

export function CoworkingRateCardModal({
  isOpen,
  onClose,
  onSelectPass,
}: CoworkingRateCardModalProps) {
  const navigate = useNavigate();
  const [selectedPlanId, setSelectedPlanId] = useState<string>('day');
  const [pricingMode, setPricingMode] = useState<'regular' | 'premium'>('premium');

  // Prevent background scrolling while open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const activePlan =
    COWORKING_RATE_CARD_PLANS.find(p => p.id === selectedPlanId) ||
    COWORKING_RATE_CARD_PLANS[0];

  const handleWhatsAppQuery = () => {
    const waUrl = `https://wa.me/${SPACE_WHATSAPP}?text=${encodeURIComponent(
      PRE_FILLED_WHATSAPP_MESSAGE,
    )}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleViewMembership = () => {
    onClose();
    navigate('/membership');
  };

  const handleBookSelectedPass = () => {
    onClose();
    if (onSelectPass) {
      onSelectPass(activePlan.id);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            className="relative z-10 flex w-full max-w-2xl max-h-[90dvh] sm:max-h-[88vh] flex-col rounded-t-[32px] sm:rounded-[28px] border border-slate-100 bg-white shadow-2xl overflow-hidden"
          >
            {/* Mobile Drag Indicator */}
            <div className="flex shrink-0 justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            {/* Sticky Header */}
            <header className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-3.5 backdrop-blur">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F3E8FF] text-[#7C3AED] shadow-2xs">
                  <BadgeIndianRupee size={20} className="stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                    Coworking Rate Card
                  </h2>
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">
                    Compare passes &amp; choose the ideal workspace plan
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close rate card"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-4">
              {/* ================= CHOOSE YOUR PLAN TABLE CARD (MATCHES REFERENCE) ================= */}
              <div>
                <h3 className="font-display text-sm sm:text-base font-black text-slate-900 mb-2.5">
                  Choose Your Plan
                </h3>

                <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-purple-100/90 bg-white shadow-xs">
                  {/* Table Column Header */}
                  <div className="grid grid-cols-[1.2fr_1fr_1.2fr] items-center px-4 py-3 bg-[#FAF8FE] border-b border-purple-100/70 text-xs font-bold text-slate-600">
                    <span>Plan</span>
                    <span className="text-center">Regular</span>
                    <div className="flex items-center justify-end gap-1 text-amber-700 font-extrabold">
                      <Crown size={14} className="text-amber-500" />
                      <span>Premium</span>
                    </div>
                  </div>

                  {/* Plan Rows */}
                  <div className="divide-y divide-purple-100/50">
                    {COWORKING_RATE_CARD_PLANS.map(plan => {
                      const isSelected = selectedPlanId === plan.id;
                      return (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`grid grid-cols-[1.2fr_1fr_1.2fr] items-center px-4 py-3 sm:py-3.5 transition cursor-pointer select-none ${
                            isSelected
                              ? 'bg-[#F9F5FF] border-l-4 border-l-[#7C3AED]'
                              : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                          }`}
                        >
                          {/* Plan Name & Tag */}
                          <div className="min-w-0 pr-1">
                            <p
                              className={`text-xs sm:text-sm font-bold truncate ${
                                isSelected ? 'text-[#7C3AED]' : 'text-slate-900'
                              }`}
                            >
                              {plan.name}
                            </p>
                            <p className="text-[10px] font-medium text-slate-400 truncate">
                              {plan.duration}
                            </p>
                          </div>

                          {/* Regular Price */}
                          <div
                            className="flex items-center justify-center gap-1.5"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedPlanId(plan.id);
                              setPricingMode('regular');
                            }}
                          >
                            <span
                              className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected && pricingMode === 'regular'
                                  ? 'border-[#7C3AED] bg-[#7C3AED] text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && pricingMode === 'regular' && (
                                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                              )}
                            </span>
                            <span
                              className={`text-xs sm:text-sm font-bold ${
                                isSelected && pricingMode === 'regular'
                                  ? 'text-[#7C3AED]'
                                  : 'text-slate-800'
                              }`}
                            >
                              ₹{formatInr(plan.regularPrice)}
                            </span>
                          </div>

                          {/* Premium Price with Pill */}
                          <div
                            className="flex items-center justify-end"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedPlanId(plan.id);
                              setPricingMode('premium');
                            }}
                          >
                            <div
                              className={`flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 rounded-full transition ${
                                isSelected && pricingMode === 'premium'
                                  ? 'bg-[#EFEBFF] text-[#7C3AED] ring-1 ring-purple-300'
                                  : 'bg-purple-50/60 text-purple-900 hover:bg-purple-100/60'
                              }`}
                            >
                              <span
                                className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected && pricingMode === 'premium'
                                    ? 'border-[#7C3AED] bg-[#7C3AED] text-white'
                                    : 'border-purple-300 bg-white'
                                }`}
                              >
                                {isSelected && pricingMode === 'premium' && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                )}
                              </span>
                              <span className="text-xs sm:text-sm font-black">
                                ₹{formatInr(plan.premiumPrice)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Membership Perks Banner (Matches Screenshot) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t border-amber-200/80 bg-[#FFFDF7] p-3 sm:p-3.5">
                    <div className="flex items-start gap-2">
                      <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] sm:text-xs font-semibold text-amber-950 leading-snug">
                        Enjoy upto 40% discount &amp; 5% cashback on food, supplies and space bookings.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleViewMembership}
                      className="self-end sm:self-auto inline-flex items-center gap-1 rounded-full border border-purple-200 bg-white px-3 py-1 text-[11px] sm:text-xs font-bold text-[#7C3AED] shadow-2xs hover:bg-purple-50 transition cursor-pointer shrink-0"
                    >
                      <span>Benefits</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* ================= SELECTED PLAN DETAILS CARD ================= */}
              <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-[#FAFBFD] p-4 sm:p-5 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F3E8FF] px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-[#7C3AED]">
                      <Calendar size={11} />
                      {activePlan.duration}
                    </span>
                    <h4 className="font-display text-base sm:text-lg font-black text-slate-900 mt-1">
                      {activePlan.name}
                    </h4>
                  </div>

                  {/* Pricing Comparison Summary */}
                  <div className="flex items-baseline gap-3">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Regular</p>
                      <p className="text-sm font-bold text-slate-700">
                        ₹{formatInr(activePlan.regularPrice)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-amber-600 flex items-center gap-0.5 justify-end">
                        <Crown size={11} />
                        Premium
                      </p>
                      <p className="text-base sm:text-lg font-black text-[#7C3AED]">
                        ₹{formatInr(activePlan.premiumPrice)}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  {activePlan.description}
                </p>

                {/* Included Facilities & Benefits */}
                <div className="mt-3.5 pt-3 border-t border-slate-200/60">
                  <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Included Facilities &amp; Amenities:
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                    {activePlan.facilities.map((fac, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span className="font-medium text-slate-700">{fac}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Direct Book Button */}
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-3">
                  <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck size={14} />
                    <span>Member saves ₹{formatInr(activePlan.savings)} on this plan</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleBookSelectedPass}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <span>Book {activePlan.name}</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Sticky Bottom Footer: Query on WhatsApp Button */}
            <footer className="sticky bottom-0 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-3.5 shadow-lg">
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium text-left">
                <Laptop size={15} className="text-[#7C3AED] shrink-0" />
                <span>Need custom desk solutions, group plans, or studio visits?</span>
              </div>

              <button
                type="button"
                onClick={handleWhatsAppQuery}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] hover:bg-[#20BD5A] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition active:scale-95 cursor-pointer shrink-0"
              >
                <MessageCircle size={17} className="stroke-[2.4]" />
                <span>Query on WhatsApp</span>
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
