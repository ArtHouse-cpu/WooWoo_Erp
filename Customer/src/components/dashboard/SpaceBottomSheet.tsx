import {useState} from 'react';
import {
  X,
  MapPin,
  Building,
  Building2,
  Laptop,
  Ticket,
  Calendar,
  Paintbrush,
  GraduationCap,
  Users,
  BookOpen,
  Ellipsis,
  Star,
  Shield,
  Briefcase,
  Wifi,
  VolumeX,
  Sofa,
  MessageCircle,
  Book,
} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';

type SpaceBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

type TabId = 'exclusive-space' | 'coworking';

type PillItem = {
  label: string;
  icon: any;
};

export function SpaceBottomSheet({isOpen, onClose}: SpaceBottomSheetProps) {
  const [activeTab, setActiveTab] = useState<TabId>('exclusive-space');
  const [activeDot, setActiveDot] = useState(0);

  const pills: PillItem[] = [
    {label: 'Shows', icon: Ticket},
    {label: 'Events', icon: Calendar},
    {label: 'Workshops', icon: Paintbrush},
    {label: 'Classes', icon: GraduationCap},
    {label: 'Meetups', icon: Users},
    {label: 'Seminars', icon: BookOpen},
    {label: 'more', icon: Ellipsis},
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
                {/* Space Icon inside soft peach rounded square */}
                <div className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#FFF0EB] text-[#EA580C]">
                  <MapPin className="h-7 w-7" strokeWidth={2} />
                </div>
                <div className="text-left">
                  <h3 className="text-[19px] font-extrabold tracking-tight text-[#111111] leading-tight">
                    Space
                  </h3>
                  <p className="mt-0.5 text-[12px] font-bold text-[#6B7280]">
                    Book studio space
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

            {/* Exclusive Space & Coworking Main Tabs */}
            <div className="shrink-0 px-5 mb-3 flex gap-3">
              {/* Exclusive Space Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('exclusive-space')}
                className={`flex-1 py-3 px-4 rounded-[16px] border text-[13px] font-extrabold flex items-center justify-center gap-2 transition-all duration-200 relative overflow-hidden cursor-pointer ${
                  activeTab === 'exclusive-space'
                    ? 'border-[#EA580C] bg-[#FFF0EB]/50 text-[#EA580C]'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Building className="h-4.5 w-4.5" strokeWidth={2.25} />
                <span>Exclusive Space</span>
                {activeTab === 'exclusive-space' && (
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-[#EA580C] rounded-full mx-6" />
                )}
              </button>

              {/* Coworking Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('coworking')}
                className={`flex-1 py-3 px-4 rounded-[16px] border text-[13px] font-extrabold flex items-center justify-center gap-2 transition-all duration-200 relative overflow-hidden cursor-pointer ${
                  activeTab === 'coworking'
                    ? 'border-[#EA580C] bg-[#FFF0EB]/50 text-[#EA580C]'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Laptop className="h-4.5 w-4.5" strokeWidth={2.25} />
                <span>Coworking</span>
                {activeTab === 'coworking' && (
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-[#EA580C] rounded-full mx-6" />
                )}
              </button>
            </div>

            {/* Scrollable Contents */}
            <div className="flex-1 overflow-y-auto pb-6">
              {activeTab === 'exclusive-space' ? (
                <>
                  {/* Create. Host. Inspire. subtitle */}
                  <div className="px-5 mb-3 text-left">
                    <p className="text-[12.5px] font-black text-[#1F2937]">
                      Create. Host. Inspire.
                    </p>
                  </div>

                  {/* Horizontal Scrollable Pill Row */}
                  <div className="px-5 mb-4 flex gap-2 overflow-x-auto scrollbar-none">
                    {pills.map((pill, idx) => {
                      const PillIcon = pill.icon;
                      return (
                        <div
                          key={idx}
                          className="shrink-0 px-3.5 py-1.5 rounded-full bg-[#FFF0EB] text-[#EA580C] border border-[#FFEDD5] text-[11px] font-bold flex items-center gap-1.5"
                        >
                          <PillIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
                          <span>{pill.label === 'more' ? `& ${pill.label}` : pill.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Featured Gallery */}
                  <div className="px-5 mb-5 grid grid-cols-5 gap-2.5">
                    {/* Left Large Image */}
                    <div className="col-span-3 relative h-[200px] overflow-hidden rounded-[20px] border border-black/[0.05]">
                      <img
                        src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=600&q=80"
                        alt="Events and Shows"
                        className="h-full w-full object-cover"
                      />
                      {/* Top Left Label */}
                      <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-[6px] bg-black/60 px-2 py-0.75 text-[8.5px] font-black text-white">
                        <Calendar className="h-2.5 w-2.5" />
                        <span>Events & Shows</span>
                      </div>
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      {/* Carousel Dots */}
                      <div className="absolute bottom-2.5 inset-x-0 flex justify-center gap-1">
                        {[0, 1, 2, 3].map(idx => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveDot(idx)}
                            className={`h-1.25 w-1.25 rounded-full transition-all duration-200 ${
                              activeDot === idx ? 'bg-white w-2.5' : 'bg-white/40'
                            }`}
                            aria-label={`Go to slide ${idx + 1}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Right Stacked Column */}
                    <div className="col-span-2 flex flex-col gap-2.5">
                      {/* Top Stacked */}
                      <div className="relative h-[95px] overflow-hidden rounded-[16px] border border-black/[0.05]">
                        <img
                          src="https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=400&q=80"
                          alt="Workshops and Classes"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-[6px] bg-black/60 px-2 py-0.5 text-[8px] font-black text-white">
                          <Briefcase className="h-2.2 w-2.2" />
                          <span>Workshops & Classes</span>
                        </div>
                      </div>

                      {/* Bottom Stacked */}
                      <div className="relative h-[95px] overflow-hidden rounded-[16px] border border-black/[0.05]">
                        <img
                          src="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&q=80"
                          alt="Meetups and Seminars"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-[6px] bg-black/60 px-2 py-0.5 text-[8px] font-black text-white">
                          <Users className="h-2.2 w-2.2" />
                          <span>Meetups & Seminars</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Available Spaces Section */}
                  <div className="mb-5">
                    <h4 className="text-[15px] font-black text-[#111111] px-5 mb-3 text-left">
                      Available Spaces
                    </h4>
                    <div className="px-5 grid grid-cols-4 gap-2">
                      {/* Mini */}
                      <div className="rounded-[16px] border border-transparent p-2.5 text-center flex flex-col items-center justify-between min-h-[120px] bg-[#F8FAFC] shadow-2xs">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E2E8F0]/60 text-slate-600">
                          <Building className="h-4 w-4" strokeWidth={2} />
                        </div>
                        <div className="my-1.5">
                          <p className="text-[11px] font-black text-[#111111] leading-tight">Mini</p>
                          <p className="text-[8.5px] font-bold text-[#4B5563] leading-none mt-0.5">Upto 20 People</p>
                        </div>
                        <p className="text-[7.5px] text-[#9CA3AF] font-bold leading-tight">Perfect for small sessions</p>
                      </div>

                      {/* Mega */}
                      <div className="rounded-[16px] border border-transparent p-2.5 text-center flex flex-col items-center justify-between min-h-[120px] bg-[#F8FAFC] shadow-2xs">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E2E8F0]/60 text-slate-600">
                          <Users className="h-4 w-4" strokeWidth={2} />
                        </div>
                        <div className="my-1.5">
                          <p className="text-[11px] font-black text-[#111111] leading-tight">Mega</p>
                          <p className="text-[8.5px] font-bold text-[#4B5563] leading-none mt-0.5">Upto 80 People</p>
                        </div>
                        <p className="text-[7.5px] text-[#9CA3AF] font-bold leading-tight">Ideal for events & workshops</p>
                      </div>

                      {/* Full Space */}
                      <div className="rounded-[16px] border border-transparent p-2.5 text-center flex flex-col items-center justify-between min-h-[120px] bg-[#F8FAFC] shadow-2xs">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E2E8F0]/60 text-slate-600">
                          <Building2 className="h-4 w-4" strokeWidth={2} />
                        </div>
                        <div className="my-1.5">
                          <p className="text-[11px] font-black text-[#111111] leading-tight">Full Space</p>
                          <p className="text-[8.5px] font-bold text-[#4B5563] leading-none mt-0.5">Upto 200 People</p>
                        </div>
                        <p className="text-[7.5px] text-[#9CA3AF] font-bold leading-tight">For large shows & exhibitions</p>
                      </div>

                      {/* Pricing Card */}
                      <div className="rounded-[16px] p-2.5 text-center flex flex-col justify-between min-h-[120px] bg-[#FFF0EB] border border-[#FFEDD5] shadow-2xs">
                        <p className="text-[9.5px] font-black text-[#EA580C] leading-none mt-0.5">Pricing</p>
                        <div>
                          <p className="text-[7px] font-bold text-[#9CA3AF] leading-none">Starts at</p>
                          <p className="text-[16px] font-black text-[#111111] my-0.5 leading-none">₹299</p>
                          <p className="text-[7.5px] font-bold text-[#9CA3AF] leading-none">/hour</p>
                        </div>
                        <div />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Coworking Intro subtitle */}
                  <div className="px-5 mb-3 text-left">
                    <p className="text-[12.5px] font-black text-[#1F2937]">
                      Work. Create. Relax.
                    </p>
                  </div>

                  {/* Horizontal Scrollable Coworking Pill Row */}
                  <div className="px-5 mb-4 flex gap-2 overflow-x-auto scrollbar-none">
                    {[
                      {label: 'Study', icon: Book},
                      {label: 'Work', icon: Laptop},
                      {label: 'Paint', icon: Paintbrush},
                      {label: 'Read', icon: BookOpen},
                      {label: 'more', icon: Ellipsis},
                    ].map((pill, idx) => {
                      const PillIcon = pill.icon;
                      return (
                        <div
                          key={idx}
                          className="shrink-0 px-3.5 py-1.5 rounded-full bg-[#FFF0EB] text-[#EA580C] border border-[#FFEDD5] text-[11px] font-bold flex items-center gap-1.5"
                        >
                          <PillIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
                          <span>{pill.label === 'more' ? `& ${pill.label}` : pill.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Coworking Featured Gallery */}
                  <div className="px-5 mb-5 grid grid-cols-5 gap-2.5">
                    {/* Left Large Image */}
                    <div className="col-span-3 relative h-[200px] overflow-hidden rounded-[20px] border border-black/[0.05]">
                      <img
                        src="https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=600&q=80"
                        alt="Quiet Zones"
                        className="h-full w-full object-cover"
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      
                      {/* Capsule Label at bottom-left */}
                      <div className="absolute left-2.5 bottom-2.5 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-white text-left">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/40 text-white bg-black/10">
                          <VolumeX className="h-2.5 w-2.5" />
                        </div>
                        <div className="leading-tight">
                          <div className="text-[9.5px] font-black">Quiet Zones</div>
                          <div className="text-[7.5px] text-white/80 font-bold">Focus in peace</div>
                        </div>
                      </div>

                      {/* Carousel Dots */}
                      <div className="absolute bottom-2.5 right-4 flex gap-1">
                        {[0, 1, 2, 3, 4].map(idx => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveDot(idx)}
                            className={`h-1.25 w-1.25 rounded-full transition-all duration-200 ${
                              activeDot === idx ? 'bg-white w-2.5' : 'bg-white/40'
                            }`}
                            aria-label={`Go to slide ${idx + 1}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Right Stacked Column */}
                    <div className="col-span-2 flex flex-col gap-2.5">
                      {/* Top Stacked */}
                      <div className="relative h-[95px] overflow-hidden rounded-[16px] border border-black/[0.05]">
                        <img
                          src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80"
                          alt="Open Seating"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <div className="absolute left-2 bottom-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-1 text-white text-left">
                          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/30 text-white">
                            <Users className="h-2 w-2" />
                          </div>
                          <div className="leading-none">
                            <div className="text-[7.5px] font-black">Open Seating</div>
                            <div className="text-[5.5px] text-white/80 font-bold">Collaborate & connect</div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Stacked */}
                      <div className="relative h-[95px] overflow-hidden rounded-[16px] border border-black/[0.05]">
                        <img
                          src="https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=400&q=80"
                          alt="Comfort Lounge"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <div className="absolute left-2 bottom-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-1 text-white text-left">
                          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/30 text-white">
                            <Sofa className="h-2 w-2" />
                          </div>
                          <div className="leading-none">
                            <div className="text-[7.5px] font-black">Comfort Lounge</div>
                            <div className="text-[5.5px] text-white/80 font-bold">Relax & recharge</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coworking Pass Section */}
                  <div className="mb-5">
                    <h4 className="text-[15px] font-black text-[#111111] px-5 mb-3 text-left">
                      Coworking Pass
                    </h4>
                    <div className="px-5 grid grid-cols-3 gap-2">
                      {/* Day Pass */}
                      <div className="relative rounded-[16px] border border-[#EA580C] p-2.5 text-center flex flex-col items-center justify-between min-h-[120px] bg-[#FFF0EB] shadow-2xs">
                        {/* Most Popular Badge */}
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#EA580C] text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
                          Most Popular
                        </div>
                        <Calendar className="h-4.5 w-4.5 text-[#EA580C] mt-1.5" strokeWidth={2.5} />
                        <div className="my-1.5">
                          <p className="text-[11px] font-black text-[#111111] leading-tight">Day Pass</p>
                          <p className="text-[13px] font-black text-[#EA580C] my-0.5 leading-none">₹299 <span className="text-[7.5px] text-[#9CA3AF] font-bold">/day</span></p>
                        </div>
                        <p className="text-[7.5px] text-[#9CA3AF] font-bold leading-tight">Access for 1 day</p>
                      </div>

                      {/* Week Pass */}
                      <div className="rounded-[16px] border border-slate-100 p-2.5 text-center flex flex-col items-center justify-between min-h-[120px] bg-[#F8FAFC] shadow-2xs">
                        <Calendar className="h-4.5 w-4.5 text-[#6B7280] mt-1.5" strokeWidth={2} />
                        <div className="my-1.5">
                          <p className="text-[11px] font-black text-[#111111] leading-tight">Week Pass</p>
                          <p className="text-[13px] font-black text-[#111111] my-0.5 leading-none">₹1,499 <span className="text-[7.5px] text-[#9CA3AF] font-bold">/week</span></p>
                        </div>
                        <p className="text-[7.5px] text-[#9CA3AF] font-bold leading-tight">Access for 7 days</p>
                      </div>

                      {/* Monthly Pass */}
                      <div className="rounded-[16px] border border-slate-100 p-2.5 text-center flex flex-col items-center justify-between min-h-[120px] bg-[#F8FAFC] shadow-2xs">
                        <Calendar className="h-4.5 w-4.5 text-[#6B7280] mt-1.5" strokeWidth={2} />
                        <div className="my-1.5">
                          <p className="text-[11px] font-black text-[#111111] leading-tight">Monthly Pass</p>
                          <p className="text-[13px] font-black text-[#111111] my-0.5 leading-none">₹4,999 <span className="text-[7.5px] text-[#9CA3AF] font-bold">/month</span></p>
                        </div>
                        <p className="text-[7.5px] text-[#9CA3AF] font-bold leading-tight">Access for 30 days</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Benefits Section */}
              {activeTab === 'exclusive-space' ? (
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-b border-slate-100 py-5 px-3 mb-5 mt-4">
                  {/* Benefit 1 */}
                  <div className="flex flex-col items-center text-center px-1">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF0EB] text-[#EA580C]">
                      <Star className="h-5 w-5 fill-[#EA580C] text-[#EA580C]" strokeWidth={2} />
                    </div>
                    <h5 className="text-[12px] font-black text-[#111111] mt-2.5 leading-none">
                      Premium Ambience
                    </h5>
                    <p className="mt-1 text-[8.5px] text-[#9CA3AF] font-bold leading-tight max-w-[95%]">
                      Inspiring creative spaces
                    </p>
                  </div>

                  {/* Benefit 2 */}
                  <div className="flex flex-col items-center text-center px-1">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E8F8EF] text-[#15803D]">
                      <Calendar className="h-5 w-5 text-[#15803D]" strokeWidth={2} />
                    </div>
                    <h5 className="text-[12px] font-black text-[#111111] mt-2.5 leading-none">
                      Instant Booking
                    </h5>
                    <p className="mt-1 text-[8.5px] text-[#9CA3AF] font-bold leading-tight max-w-[95%]">
                      Real-time availability
                    </p>
                  </div>

                  {/* Benefit 3 */}
                  <div className="flex flex-col items-center text-center px-1">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F3E8FF] text-[#7C3AED]">
                      <Shield className="h-5 w-5 text-[#7C3AED]" strokeWidth={2} />
                    </div>
                    <h5 className="text-[12px] font-black text-[#111111] mt-2.5 leading-none">
                      Safe & Hassle-free
                    </h5>
                    <p className="mt-1 text-[8.5px] text-[#9CA3AF] font-bold leading-tight max-w-[95%]">
                      Verified, well-managed spaces
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-b border-slate-100 py-5 px-3 mb-5 mt-4">
                  {/* Benefit 1 */}
                  <div className="flex flex-col items-center text-center px-1">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF0EB] text-[#EA580C]">
                      <Star className="h-5 w-5 text-[#EA580C]" strokeWidth={2} />
                    </div>
                    <h5 className="text-[12px] font-black text-[#111111] mt-2.5 leading-none">
                      Inspiring Environment
                    </h5>
                    <p className="mt-1 text-[8.5px] text-[#9CA3AF] font-bold leading-tight max-w-[95%]">
                      Designed for creatives
                    </p>
                  </div>

                  {/* Benefit 2 */}
                  <div className="flex flex-col items-center text-center px-1">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E8F8EF] text-[#15803D]">
                      <Wifi className="h-5 w-5 text-[#15803D]" strokeWidth={2} />
                    </div>
                    <h5 className="text-[12px] font-black text-[#111111] mt-2.5 leading-none">
                      High Speed Wi-Fi
                    </h5>
                    <p className="mt-1 text-[8.5px] text-[#9CA3AF] font-bold leading-tight max-w-[95%]">
                      Stay connected always
                    </p>
                  </div>

                  {/* Benefit 3 */}
                  <div className="flex flex-col items-center text-center px-1">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F3E8FF] text-[#7C3AED]">
                      <Sofa className="h-5 w-5 text-[#7C3AED]" strokeWidth={2} />
                    </div>
                    <h5 className="text-[12px] font-black text-[#111111] mt-2.5 leading-none">
                      Tea & Coffee
                    </h5>
                    <p className="mt-1 text-[8.5px] text-[#9CA3AF] font-bold leading-tight max-w-[95%]">
                      On the house
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom sticky CTA Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex gap-3 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {activeTab === 'exclusive-space' ? (
                <>
                  {/* Book Online Button */}
                  <button
                    type="button"
                    className="flex-1 py-3 px-3 rounded-[16px] border border-[#EA580C] text-[#EA580C] text-[14px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#FFF8F2] transition-colors cursor-pointer"
                  >
                    <Calendar className="h-4.5 w-4.5" strokeWidth={2.5} />
                    <span>Book Online</span>
                  </button>

                  {/* Visit Today Button */}
                  <button
                    type="button"
                    className="flex-1 py-3 px-3 rounded-[16px] bg-[#EA580C] text-white text-[14px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#D97706] transition-colors shadow-xs cursor-pointer"
                  >
                    <Calendar className="h-4.5 w-4.5" strokeWidth={2.5} />
                    <span>Visit Today</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Explore More Button */}
                  <button
                    type="button"
                    className="flex-1 py-3 px-3 rounded-[16px] border border-[#EA580C] text-[#EA580C] text-[14px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#FFF8F2] transition-colors cursor-pointer"
                  >
                    <Calendar className="h-4.5 w-4.5" strokeWidth={2.5} />
                    <span>Explore More</span>
                  </button>

                  {/* Query Now Button */}
                  <button
                    type="button"
                    className="flex-1 py-3 px-3 rounded-[16px] bg-[#EA580C] text-white text-[14px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#D97706] transition-colors shadow-xs cursor-pointer"
                  >
                    <MessageCircle className="h-4.5 w-4.5" strokeWidth={2.5} />
                    <span>Query Now</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
