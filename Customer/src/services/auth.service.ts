import { api } from "./axios";
import type {
  ApiResponse,
  Customer,
  OtpPurpose,
  ReferralDashboard,
  WalletDashboard,
  ActivityDashboard,
  ActivityInvoiceDetail,
  ActivityInsights,
} from "../types/auth";

export const authApi = {
  signup: (payload: {
    name: string;
    mobile: string;
    email?: string;
    password: string;
    confirmPassword?: string;
    gender?: string;
    dob?: string;
    ref?: string;
  }) => api.post<ApiResponse<Customer>>("/signup", payload),

  login: (payload: {
    identifier: string;
    password: string;
    rememberMe?: boolean;
  }) => api.post<ApiResponse<Customer>>("/login", payload),

  requestOtp: (payload: { mobile: string; countryCode?: string }) =>
    api.post<ApiResponse>("/login/otp", payload),

  verifyOtp: (payload: {
    mobile?: string;
    identifier?: string;
    otp: string;
    purpose?: OtpPurpose;
    name?: string;
    ref?: string;
  }) =>
    api.post<
      ApiResponse<Customer | { resetToken?: string; identifier?: string }>
    >("/verify-otp", payload),

  resendOtp: (payload: {
    mobile?: string;
    identifier?: string;
    purpose?: OtpPurpose;
  }) => api.post<ApiResponse>("/resend-otp", payload),

  forgotPassword: (payload: { identifier: string }) =>
    api.post<ApiResponse>("/forgot-password", payload),

  resetPassword: (payload: {
    identifier: string;
    newPassword: string;
    confirmPassword?: string;
    otp?: string;
    resetToken?: string;
  }) => api.post<ApiResponse<Customer>>("/reset-password", payload),

  refreshToken: () => api.post<ApiResponse<Customer>>("/refresh-token"),

  logout: () => api.post<ApiResponse>("/logout"),

  me: () => api.get<ApiResponse<Customer>>("/me"),

  getReferralDashboard: () =>
    api.get<ApiResponse<ReferralDashboard>>("/referral"),

  getWalletDashboard: () => api.get<ApiResponse<WalletDashboard>>("/wallet"),

  updateProfile: (
    payload: Partial<Customer> & {
      dob?: string;
      gender?: string;
      membershipType?: Customer["membershipType"];
      profileSetupCompleted?: boolean;
      onboardingCompleted?: boolean;
    },
  ) => api.put<ApiResponse<Customer>>("/profile", payload),

  deleteProfile: () => api.delete<ApiResponse>("/profile"),

  getMembershipPlans: () =>
    api.get<
      ApiResponse<
        Array<{
          id: string;
          planId: string;
          title: string;
          badge: string;
          tenure?: string;
          price: number;
          grossAmount?: number;
          discountAmount?: number;
          walletCashbackAmount?: number;
          cspEligible?: boolean;
          description: string;
          themeKey?: string;
          iconKey?: "user" | "star" | "graduation" | "crown" | "diamond";
          features?: Array<{ label: string; was?: number }>;
          discounts?: Array<{ icon: "store" | "service" | "food" | "space"; label: string }>;
          categories?: Array<{
            key: "food" | "space" | "products" | "services";
            icon: "store" | "service" | "food" | "space";
            label: string;
            discountPercent: number;
            cashbackPercent: number;
          }>;
          programs?: Array<{
            key: string;
            label: string;
            subtitle: string;
            eligible: boolean;
          }>;
          cashback?: string;
        }>
      >
    >("/membership/plans"),

  validateCoupon: (payload: { code: string; membershipType: string }) =>
    api.post<
      ApiResponse<{
        code: string;
        title: string;
        discountType: "percentage" | "flat";
        discountValue: number;
        orderAmount: number;
        discountAmount: number;
        payableAmount: number;
      }>
    >("/coupon/validate", payload),

  activateMembership: (payload: {
    membershipType: string;
    couponCode?: string;
  }) => api.post<ApiResponse<Customer>>("/membership/activate", payload),

  initiatePayuPayment: (payload: {
    membershipType: string;
    couponCode?: string;
  }) =>
    api.post<
      ApiResponse<{
        mode: "payu" | "free";
        activated?: boolean;
        customer?: Customer;
        paymentUrl?: string;
        params?: Record<string, string>;
        txnid?: string;
        orderId?: string;
        pricing?: {
          orderAmount: number;
          discountAmount: number;
          paidAmount: number;
          couponCode?: string | null;
        };
      }>
    >("/payments/payu/initiate", payload),

  getPaymentStatus: (txnid: string) =>
    api.get<
      ApiResponse<{
        txnid: string;
        status: string;
        membershipType: string;
        paidAmount: number;
      }>
    >(`/payments/${txnid}`),

  getActivity: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<ApiResponse<ActivityDashboard>>("/activity", { params }),

  getActivityInvoice: (invoice: string) =>
    api.get<ApiResponse<ActivityInvoiceDetail>>(`/activity/${invoice}`),

  getActivityInsights: () =>
    api.get<ApiResponse<ActivityInsights>>("/activity/insights"),
};
