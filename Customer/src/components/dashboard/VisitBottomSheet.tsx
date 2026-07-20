import {X, MapPin, Phone, Star, Store} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';

type VisitBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

type LocationCard = {
  id: string;
  badge: string;
  name: string;
  address: string;
  rating: number;
  reviewsCount: number;
  image: string;
  phone: string;
  mapsUrl: string;
};

function GoogleMapsPinIcon({className}: {className?: string}) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        fill="#EA4335"
        d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74L12 22l4-7.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"
      />
      <path
        fill="#34A853"
        d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74L12 22v-9.5A2.5 2.5 0 0 1 9.5 10c0-1.38 1.12-2.5 2.5-2.5V2z"
      />
      <path
        fill="#4285F4"
        d="M12 2v5.5c1.38 0 2.5 1.12 2.5 2.5 0 1.38-1.12 2.5-2.5 2.5V22l4-7.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"
      />
      <path fill="#FBBC04" d="M12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
    </svg>
  );
}

export function VisitBottomSheet({isOpen, onClose}: VisitBottomSheetProps) {
  const locations: LocationCard[] = [
    {
      id: 'bhilai',
      badge: '01',
      name: 'Bhilai',
      address: 'Nehru Nagar East, Bhilai, Chhattisgarh',
      rating: 4.8,
      reviewsCount: 126,
      image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=500&q=80',
      phone: '+919876543210',
      mapsUrl: 'https://maps.google.com/?q=Nehru+Nagar+East+Bhilai',
    },
    {
      id: 'raipur',
      badge: '02',
      name: 'Raipur',
      address: 'Civil Lines, Raipur, Chhattisgarh',
      rating: 4.9,
      reviewsCount: 182,
      image: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=500&q=80',
      phone: '+919876543211',
      mapsUrl: 'https://maps.google.com/?q=Civil+Lines+Raipur',
    },
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
            <div className="flex shrink-0 justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-slate-200" />
            </div>

            {/* Header Info */}
            <div className="relative shrink-0 px-5 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Location Icon inside soft peach rounded square */}
                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[16px] bg-[#FFF0EB] text-[#EA580C]">
                  <MapPin className="h-6.5 w-6.5" strokeWidth={2} />
                </div>
                <div className="text-left">
                  <h3 className="text-[20px] font-black tracking-tight text-[#111111] leading-none">
                    Visit Art House
                  </h3>
                  <p className="mt-1.5 text-[12px] font-medium text-[#6B7280] leading-none">
                    Find our houses near you
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563] transition hover:bg-[#E5E7EB]"
                aria-label="Close sheet"
              >
                <X className="h-4.5 w-4.5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Scrollable Contents */}
            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
              {/* Location Cards */}
              {locations.map(loc => (
                <div
                  key={loc.id}
                  className="rounded-[22px] border border-slate-100 bg-white p-3 shadow-3xs flex gap-3.5 items-stretch overflow-hidden"
                >
                  {/* Left Storefront Image */}
                  <div className="relative w-[130px] h-[135px] shrink-0 rounded-[16px] overflow-hidden bg-slate-100">
                    <img
                      src={loc.image}
                      alt={loc.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Right Details */}
                  <div className="flex-1 flex flex-col justify-between text-left py-0.5 min-w-0">
                    <div>
                      {/* Badge & Title Row */}
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center px-1.5 py-0.5 rounded-[6px] bg-[#EA580C] text-white text-[10px] font-black leading-none shrink-0">
                          {loc.badge}
                        </span>
                        <h4 className="text-[16px] font-black text-[#111111] leading-none truncate">
                          {loc.name}
                        </h4>
                      </div>

                      {/* Address */}
                      <p className="text-[11.5px] font-medium text-[#6B7280] leading-snug mt-2">
                        {loc.address}
                      </p>

                      {/* Google Rating */}
                      <div className="flex items-center gap-1 mt-2 text-[11px] font-bold text-[#111111]">
                        <span>{loc.rating}</span>
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-[10.5px] font-semibold text-[#9CA3AF]">
                          ({loc.reviewsCount} Google reviews)
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center gap-2 mt-3">
                      {/* Directions CTA */}
                      <a
                        href={loc.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-[12px] border border-slate-200 bg-white text-[#EA580C] text-[11.5px] font-bold shadow-3xs hover:bg-slate-50 transition cursor-pointer"
                      >
                        <GoogleMapsPinIcon className="h-4 w-4 shrink-0" />
                        <span>Directions</span>
                      </a>

                      {/* Call CTA */}
                      <a
                        href={`tel:${loc.phone}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-[12px] border border-slate-200 bg-white text-[#111111] text-[11.5px] font-bold shadow-3xs hover:bg-slate-50 transition cursor-pointer"
                      >
                        <Phone className="h-3.5 w-3.5 text-[#111111] shrink-0" strokeWidth={2.2} />
                        <span>Call</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}

              {/* Expansion Announcement Banner */}
              <div className="rounded-[20px] bg-[#FFF5F2] border border-[#FFEDD5] p-3.5 flex items-center gap-3.5 shadow-3xs">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#FFF0EB] text-[#EA580C]">
                  <Store className="h-5.5 w-5.5" strokeWidth={2} />
                </div>
                <div className="text-left">
                  <h4 className="text-[13px] font-black text-[#111111] leading-tight">
                    More art houses coming soon!
                  </h4>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#6B7280] leading-tight">
                    We're expanding to serve you better.
                  </p>
                </div>
              </div>

              {/* Footer Links & Divider */}
              <div className="border-t border-slate-100 pt-4 flex items-center justify-center gap-2.5 text-[#4B5563] text-[11px] font-bold">
                <span>Terms</span>
                <span className="text-slate-200">|</span>
                <span>About</span>
                <span className="text-slate-200">|</span>
                <span>Jobs</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
