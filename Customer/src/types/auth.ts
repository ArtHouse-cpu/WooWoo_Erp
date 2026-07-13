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
  createdAt?: string;
  updatedAt?: string;
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
