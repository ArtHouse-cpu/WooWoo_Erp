export interface Customer {
  _id: string;
  customerId?: string;
  name: string;
  email?: string;
  mobile: string;
  countryCode?: string;
  profileImage?: string;
  gender?: string;
  dob?: string | null;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  isVerified?: boolean;
  emailVerified?: boolean;
  mobileVerified?: boolean;
  status?: string;
  walletBalance?: number;
  walletAmount?: number;
  rewardPoints?: number;
  loginType?: string;
  membershipType?: 'none' | 'pro' | 'premium' | 'special' | 'junior' | 'general';
  profileSetupCompleted?: boolean;
  onboardingCompleted?: boolean;
  referralCode?: string | null;
  affiliateBalance?: number;
  affiliateReserved?: number;
  cashbackBalance?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReferralDashboard {
  programEnabled: boolean;
  referralCode: string;
  shareUrl: string;
  shareMessage: string;
  inviteReward: {
    enabled: boolean;
    type: 'percentage' | 'fixed' | string;
    value: number;
  };
  wallet: {
    affiliateBalance: number;
    affiliateReserved: number;
    cashbackBalance: number;
  };
  stats: {
    totalReferrals: number;
    activeReferrals: number;
    totalEarned: number;
    pendingEarnings: number;
    totalTransactions: number;
    totalOrders: number;
  };
  recentReferrals: Array<{
    id?: string;
    name: string;
    membershipType?: string;
    status?: string;
    joinedAt?: string;
    totalEarned: number;
    pendingEarnings: number;
  }>;
}

export interface WalletDashboard {
  balances: {
    totalAvailable: number;
    generalBalance: number;
    affiliateBalance: number;
    affiliateReserved: number;
    cashbackBalance: number;
    withdrawable: number;
  };
  summary: {
    cashbackBalance: number;
    totalAffiliateEarned: number;
    rewardTransactions: number;
    totalTransactions: number;
  };
  affiliateThisMonth: {
    earnings: number;
    referrals: number;
    revenue: number;
    conversionRate: number;
    transactionCount: number;
  };
  categories: Array<{
    category: string;
    label: string;
    amount: number;
    transactionCount: number;
  }>;
  transactions: Array<{
    id: string;
    kind: 'wallet' | 'commission' | 'withdrawal';
    title: string;
    type: 'credit' | 'debit';
    amount: number;
    status: string;
    category: string;
    createdAt: string;
  }>;
  referral: {
    referralCode: string;
    shareUrl: string;
    shareMessage: string;
  };
  updatedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  token?: string;
  refreshToken?: string;
  errors?: Array<{field: string; message: string}> | {code?: string} | null;
}

export type AuthMode = 'otp' | 'password';
export type OtpPurpose =
  | 'login'
  | 'signup'
  | 'forgot-password'
  | 'verify-mobile'
  | 'verify-email';
