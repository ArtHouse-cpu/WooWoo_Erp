import {api} from './axios';
import type {ApiResponse, Customer, OtpPurpose} from '../types/auth';

export const authApi = {
  signup: (payload: {
    name: string;
    mobile: string;
    email?: string;
    password: string;
    confirmPassword?: string;
    gender?: string;
    dob?: string;
  }) => api.post<ApiResponse<Customer>>('/signup', payload),

  login: (payload: {identifier: string; password: string; rememberMe?: boolean}) =>
    api.post<ApiResponse<Customer>>('/login', payload),

  requestOtp: (payload: {mobile: string; countryCode?: string}) =>
    api.post<ApiResponse>('/login/otp', payload),

  verifyOtp: (payload: {
    mobile?: string;
    identifier?: string;
    otp: string;
    purpose?: OtpPurpose;
    name?: string;
  }) => api.post<ApiResponse<Customer | {resetToken?: string; identifier?: string}>>(
    '/verify-otp',
    payload,
  ),

  resendOtp: (payload: {
    mobile?: string;
    identifier?: string;
    purpose?: OtpPurpose;
  }) => api.post<ApiResponse>('/resend-otp', payload),

  forgotPassword: (payload: {identifier: string}) =>
    api.post<ApiResponse>('/forgot-password', payload),

  resetPassword: (payload: {
    identifier: string;
    newPassword: string;
    confirmPassword?: string;
    otp?: string;
    resetToken?: string;
  }) => api.post<ApiResponse<Customer>>('/reset-password', payload),

  refreshToken: () => api.post<ApiResponse<Customer>>('/refresh-token'),

  logout: () => api.post<ApiResponse>('/logout'),

  me: () => api.get<ApiResponse<Customer>>('/me'),

  updateProfile: (
    payload: Partial<Customer> & {
      dob?: string;
      gender?: string;
      membershipType?: Customer['membershipType'];
      profileSetupCompleted?: boolean;
      onboardingCompleted?: boolean;
    },
  ) => api.put<ApiResponse<Customer>>('/profile', payload),

  deleteProfile: () => api.delete<ApiResponse>('/profile'),

  activateMembership: (payload: {membershipType: NonNullable<Customer['membershipType']>}) =>
    api.post<ApiResponse<Customer>>('/membership/activate', payload),
};
