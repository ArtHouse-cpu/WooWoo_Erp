import type {LucideIcon} from 'lucide-react';
import {
  Calendar,
  Coffee,
  Compass,
  Crown,
  Gift,
  Home,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Settings,
  ShoppingBag,
  Star,
  User,
  Users,
  Wrench,
  Activity
} from 'lucide-react';

export type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  to?: string;
  section?: string;
};

export type ActionItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: 'headphones' | 'map' | 'share';
  color: string;
  to?: string;
};

export const dashboardNav: NavItem[] = [
  {id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/home', section: 'Main'},

  {id: 'activities', label: 'Activities', icon: Activity, to: '/activities', section: 'Main'},
  
  {id: 'membership', label: 'Membership', icon: Crown, to: '/membership', section: 'Main'},

  {id: 'account', label: 'Account', icon: User, to: '/profile', section: 'Account'},

  {id: 'settings', label: 'Settings', icon: Settings, to: '/settings', section: 'Account'},
];

export const exploreItems = [
  {
    id: 'store',
    title: 'Store',
    subtitle: 'Art supplies',
    gradient: 'from-[#F3E8FF] to-[#EDE9FE]',
    iconColor: 'text-[#7C3AED]',
    icon: ShoppingBag,
  },
  {
    id: 'space',
    title: 'Space',
    subtitle: 'Book studio',
    gradient: 'from-[#FFEDD5] to-[#FED7AA]',
    iconColor: 'text-[#EA580C]',
    icon: MapPin,
  },
  {
    id: 'events',
    title: 'Events',
    subtitle: 'Workshops',
    gradient: 'from-[#DCFCE7] to-[#BBF7D0]',
    iconColor: 'text-[#16A34A]',
    icon: Star,
  },
  {
    id: 'cafe',
    title: 'Art Café',
    subtitle: 'Order food',
    gradient: 'from-[#FEF9C3] to-[#FDE68A]',
    iconColor: 'text-[#CA8A04]',
    icon: Coffee,
  },
];

export const exploreItemsDesktop = [
  {
    id: 'store',
    title: 'Supplies',
    subtitle: 'Art materials & more',
    icon: ShoppingBag,
    iconBg: 'bg-[#F3E8FF]',
    iconColor: 'text-[#7C3AED]',
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'space',
    title: 'Space',
    subtitle: 'Book studio space',
    icon: MapPin,
    iconBg: 'bg-[#FFEDD5]',
    iconColor: 'text-[#EA580C]',
    image: 'https://images.unsplash.com/photo-1599508704512-2f19efd1e35f?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'services',
    title: 'Services',
    subtitle: 'Creative services',
    icon: Wrench,
    iconBg: 'bg-[#DBEAFE]',
    iconColor: 'text-[#2563EB]',
    image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'events',
    title: 'Events',
    subtitle: 'Workshops & more',
    icon: Calendar,
    iconBg: 'bg-[#DCFCE7]',
    iconColor: 'text-[#16A34A]',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'cafe',
    title: 'WOOFOO',
    subtitle: 'Create Art & enjoy food',
    icon: Coffee,
    iconBg: 'bg-[#FEF9C3]',
    iconColor: 'text-[#CA8A04]',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'programs',
    title: 'Programs',
    subtitle: 'Grow & Earn with us',
    icon: Gift,
    iconBg: 'bg-[#FFF3EB]',
    iconColor: 'text-[#EA580C]',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=500&q=80',
  },
];

export const serviceItems = [
  {
    id: 'shop',
    title: 'Shop Supplies',
    desc: 'Buy art, craft & stationery supplies.',
    gradient: 'from-[#DBEAFE] via-[#EAF2FF] to-[#F0F7FF]',
    titleColor: 'text-[#1D4ED8]',
    btn: 'bg-[#2563EB]',
    blob: 'bg-[#93C5FD]/45',
    emoji: '🎨',
  },
  {
    id: 'book',
    title: 'Book Space',
    desc: 'Book creative spaces for events, workshops & meetings.',
    gradient: 'from-[#F3E8FF] via-[#F5E9FF] to-[#FAF5FF]',
    titleColor: 'text-[#7C3AED]',
    btn: 'bg-[#8B5CF6]',
    blob: 'bg-[#D8B4FE]/40',
    emoji: '🖼️',
  },
  {
    id: 'services',
    title: 'Get Services',
    desc: 'Find trusted creative services for your needs.',
    gradient: 'from-[#DCFCE7] via-[#E8F8EF] to-[#F0FDF4]',
    titleColor: 'text-[#15803D]',
    btn: 'bg-[#22C55E]',
    blob: 'bg-[#86EFAC]/40',
    emoji: '🖌️',
  },
  {
    id: 'food',
    title: 'Order Food',
    desc: 'Order delicious food from our in-house café.',
    gradient: 'from-[#FFEDD5] via-[#FFF1E6] to-[#FFF7ED]',
    titleColor: 'text-[#C2410C]',
    btn: 'bg-[#F97316]',
    blob: 'bg-[#FDBA74]/45',
    emoji: '🍜',
  },
];

export const actionItems: ActionItem[] = [
  {
    id: 'help',
    title: 'Help',
    subtitle: 'Get Support',
    icon: 'headphones' as const,
    color: 'text-[#9333EA]',
  },
  {
    id: 'visit',
    title: 'Visit',
    subtitle: 'Our Location',
    icon: 'map' as const,
    color: 'text-[#2563EB]',
  },
  {
    id: 'share',
    title: 'Share',
    subtitle: 'Invite & Earn',
    icon: 'share' as const,
    color: 'text-[#9333EA]',
  },
];

export const upcomingEvents = [
  {
    id: '1',
    title: 'Watercolor Workshop',
    date: 'Sat, 18 Jul',
    time: '4:00 PM',
    location: 'Studio A',
    tone: 'bg-[#DBEAFE] text-[#1D4ED8]',
  },
  {
    id: '2',
    title: 'Canvas Painting Session',
    date: 'Sun, 19 Jul',
    time: '11:00 AM',
    location: 'Gallery Hall',
    tone: 'bg-[#F3E8FF] text-[#7C3AED]',
  },
  {
    id: '3',
    title: 'Open Mic for Artists',
    date: 'Fri, 24 Jul',
    time: '6:30 PM',
    location: 'Art Café',
    tone: 'bg-[#FFEDD5] text-[#C2410C]',
  },
];

export const topArtists = [
  {id: '1', name: 'Aarav Sharma', handle: '@aarav_art', score: '2.4K', initial: 'A', tone: 'bg-[#DBEAFE] text-[#1D4ED8]'},
  {id: '2', name: 'Meera Kapoor', handle: '@meerak', score: '1.8K', initial: 'M', tone: 'bg-[#F3E8FF] text-[#7C3AED]'},
  {id: '3', name: 'Rohan Das', handle: '@rohan.creates', score: '1.2K', initial: 'R', tone: 'bg-[#DCFCE7] text-[#15803D]'},
];

export const mobileTabs = [
  {id: 'home', label: 'Home', icon: Home, to: '/home'},
  {id: 'explore', label: 'Explore', icon: Compass},
  {id: 'create', label: 'Create', icon: null},
  {id: 'messages', label: 'Messages', icon: MessageCircle},
  {id: 'profile', label: 'Profile', icon: Users, to: '/profile'},
];

export const artistQuote =
  'Every artist was first an amateur. Keep creating, keep inspiring!';
