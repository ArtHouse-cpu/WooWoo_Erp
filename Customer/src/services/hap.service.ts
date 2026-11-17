import {api} from './axios';

export type HapApplicationStatus = 'under_review' | 'approved' | 'rejected';

export const HAP_PROFESSIONS = [
  'Student',
  'Working Professional',
  'Business Owner',
  'Freelancer',
  'Content Creator',
  'Influencer',
  'Artist',
  'Homemaker',
  'Other',
] as const;

export const HAP_NETWORK_RANGES = [
  '20+',
  '50+',
  '100+',
  '250+',
  '500+',
  '1,000+',
  '2,500+',
  '5,000+',
  '10,000+',
  '25,000+',
  '50,000+',
  '100,000+',
  '500,000+',
  '1M+',
] as const;

export const HAP_PROMOTION_CHANNELS = [
  'Instagram',
  'WhatsApp',
  'Offline Community',
  'College / Campus',
  'Other',
] as const;

export type HapApplication = {
  _id: string;
  customerId: string;
  customerName?: string;
  email?: string;
  mobile?: string;
  profession: string;
  networkSize: number | string;
  payoutDetail?: string;
  presence: string;
  promotionChannels?: string[];
  status: HapApplicationStatus;
  rejectionReason?: string;
  createdAt?: string;
};

export type HapApplyPayload = {
  customerId: string;
  profession: string;
  networkSize: string | number;
  payoutDetail?: string;
  presence: string;
  promotionChannels?: string[];
};

export const hapApi = {
  mine: () =>
    api.get<{success: boolean; message: string; data: HapApplication | null}>(
      '/hap/application',
    ),
  apply: (payload: HapApplyPayload) =>
    api.post<{success: boolean; message: string; data: HapApplication}>(
      '/hap/apply',
      payload,
    ),
  update: (payload: Omit<HapApplyPayload, 'customerId'>) =>
    api.patch<{success: boolean; message: string; data: HapApplication}>(
      '/hap/application',
      payload,
    ),
  withdraw: () =>
    api.delete<{success: boolean; message: string}>('/hap/application'),
};
