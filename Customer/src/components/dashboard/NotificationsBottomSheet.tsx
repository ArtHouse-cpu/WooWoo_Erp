import {useState, useEffect} from 'react';
import {
  X,
  Bell,
  LayoutGrid,
  Tag,
  Calendar,
  Megaphone,
  User,
  Crown,
  Sparkles,
  Trophy,
  Wallet,
  Package,
  Check,
} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';

type NotificationsBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

type CategoryId = 'all' | 'offers' | 'events' | 'updates' | 'account' | 'membership' | 'activities';

type CategoryTab = {
  id: CategoryId;
  label: string;
  icon: any;
};

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  icon: any;
  category: CategoryId;
  unread: boolean;
};

const initialNotifications: NotificationItem[] = [
  {
    id: '1',
    title: 'ACC Winner Announcement! 🏆',
    description: 'The winners will be announced on 20 Dec 2025. Stay tuned!',
    time: '2m ago',
    icon: Trophy,
    category: 'events',
    unread: true,
  },
  {
    id: '2',
    title: 'New Event: Sip & Paint Night 🎨',
    description: 'Join us this Saturday for a relaxed evening of art, coffee & good vibes.',
    time: '1h ago',
    icon: Calendar,
    category: 'events',
    unread: true,
  },
  {
    id: '3',
    title: 'Wallet Update',
    description: '₹250 has been added to your wallet from your recent referral.',
    time: '3h ago',
    icon: Wallet,
    category: 'account',
    unread: false,
  },
  {
    id: '4',
    title: 'Profile Update Successful',
    description: 'Your profile information has been updated successfully.',
    time: '1d ago',
    icon: User,
    category: 'account',
    unread: false,
  },
  {
    id: '5',
    title: 'Order Shipped 📦',
    description: 'Your order #WW1234 has been shipped and will be delivered soon.',
    time: '1d ago',
    icon: Package,
    category: 'updates',
    unread: false,
  },
  {
    id: '6',
    title: 'Exciting Offer Just for You! ✨',
    description: 'Get 15% OFF on all art supplies. Valid till 30 Nov 2025.',
    time: '2d ago',
    icon: Tag,
    category: 'offers',
    unread: true,
  },
];

export function NotificationsBottomSheet({isOpen, onClose}: NotificationsBottomSheetProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const categories: CategoryTab[] = [
    {id: 'all', label: 'All', icon: LayoutGrid},
    {id: 'offers', label: 'Offers', icon: Tag},
    {id: 'events', label: 'Events', icon: Calendar},
    {id: 'updates', label: 'Updates', icon: Megaphone},
    {id: 'account', label: 'Account', icon: User},
    {id: 'membership', label: 'Membership', icon: Crown},
    {id: 'activities', label: 'Activities', icon: Sparkles},
  ];

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(item => ({...item, unread: false})));
  };

  const filteredNotifications =
    activeCategory === 'all'
      ? notifications
      : notifications.filter(item => item.category === activeCategory);

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
            transition={{type: 'spring', damping: 28, stiffness: 260}}
            className="relative z-10 flex max-h-[90dvh] h-auto w-full max-w-lg md:max-w-xl flex-col rounded-t-[32px] bg-white shadow-2xl overflow-hidden border-t border-slate-100 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            {/* Top Drag Handle */}
            <div className="flex shrink-0 justify-center py-2.5">
              <div className="h-1.5 w-12 rounded-full bg-[#E5E7EB]" />
            </div>

            {/* Header */}
            <div className="relative shrink-0 px-5 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Bell Icon in light-orange rounded square */}
                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[18px] bg-[#FFF0EB] text-[#EA580C]">
                  <Bell className="h-6 w-6" strokeWidth={2.25} />
                </div>
                <div className="text-left">
                  <h3 className="text-[19px] font-extrabold tracking-tight text-[#111111] leading-tight">
                    Notifications
                  </h3>
                  <p className="mt-1 text-[12px] font-semibold text-[#6B7280] leading-none">
                    Stay updated with what&apos;s important
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563] transition hover:bg-[#E5E7EB] cursor-pointer"
                aria-label="Close notifications modal"
              >
                <X className="h-4.5 w-4.5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Horizontally Scrollable Category Row */}
            <div className="shrink-0 px-5 pb-3 pt-1 border-b border-slate-100">
              <div
                className="flex gap-2 overflow-x-auto flex-nowrap scrollbar-hide py-1"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                    .scrollbar-hide::-webkit-scrollbar {
                      display: none;
                    }
                  `,
                  }}
                />
                {categories.map(cat => {
                  const CatIcon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`relative shrink-0 flex flex-col items-center justify-center text-center h-[68px] w-[64px] rounded-[16px] border transition-colors cursor-pointer ${
                        isActive
                          ? 'border-[#EA580C]/20 bg-white shadow-2xs'
                          : 'border-slate-100 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <CatIcon
                        className={`h-4.5 w-4.5 ${isActive ? 'text-[#EA580C]' : 'text-slate-600'}`}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      <span
                        className={`text-[9px] leading-tight text-center mt-1 px-0.5 ${
                          isActive
                            ? 'text-[#EA580C] font-extrabold'
                            : 'text-[#4B5563] font-bold'
                        }`}
                      >
                        {cat.label}
                      </span>
                      {isActive && (
                        <div className="absolute bottom-0 inset-x-0 h-0.75 bg-[#EA580C] rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Notification List */}
            <div className="flex-1 overflow-y-auto px-5 py-3 divide-y divide-slate-100 min-h-[280px]">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map(item => {
                  const ItemIcon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3.5 py-3.5 first:pt-1 last:pb-1 text-left"
                    >
                      {/* Left Icon Container */}
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[#F8FAFC] border border-slate-100 text-slate-700 shadow-2xs mt-0.5">
                        <ItemIcon className="h-5 w-5" strokeWidth={2} />
                      </div>

                      {/* Content Area */}
                      <div className="min-w-0 flex-1 pr-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-[13.5px] font-black text-[#111111] leading-tight">
                            {item.title}
                          </h4>
                          <span className="text-[10.5px] font-bold text-[#9CA3AF] shrink-0 mt-0.5">
                            {item.time}
                          </span>
                        </div>
                        <p className="mt-1 text-[11.5px] font-semibold text-[#6B7280] leading-snug">
                          {item.description}
                        </p>
                      </div>

                      {/* Unread Orange Dot */}
                      {item.unread && (
                        <div className="flex items-center self-center shrink-0 pl-1">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#EA580C]" />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300" strokeWidth={1.5} />
                  <p className="text-[13px] font-bold text-slate-500">No notifications found</p>
                </div>
              )}
            </div>

            {/* Bottom Action Button */}
            <div className="shrink-0 px-5 pt-3 pb-2 border-t border-slate-100 bg-white">
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="w-full py-3 rounded-[16px] border border-[#FFE4D6] bg-white text-[#EA580C] text-[13px] font-black hover:bg-[#FFF8F2] flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
              >
                <Check className="h-4 w-4" strokeWidth={2.5} />
                Mark all as read
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
