import {api} from './axios';

export type CvpApplyPayload = {
  fullName: string;
  phone: string;
  profession: string;
  availability: string[];
  volunteeredBefore: boolean;
  events?: string;
  volunteerType?: 'Paid' | 'Unpaid' | 'Both' | '';
  photo: File;
};

const multipart = {
  transformRequest: [
    (data: FormData, headers?: {delete?: (name: string) => void}) => {
      headers?.delete?.('Content-Type');
      return data;
    },
  ],
};

export const cvpApi = {
  apply: (payload: CvpApplyPayload) => {
    const form = new FormData();
    form.append('fullName', payload.fullName);
    form.append('phone', payload.phone);
    form.append('profession', payload.profession);
    form.append('availability', JSON.stringify(payload.availability));
    form.append('volunteeredBefore', payload.volunteeredBefore ? 'true' : 'false');
    if (payload.volunteeredBefore) {
      form.append('events', payload.events || '');
      form.append('volunteerType', payload.volunteerType || '');
    }
    form.append('photo', payload.photo);
    return api.post<{
      success: boolean;
      message: string;
      application?: {_id: string};
    }>('/cvp/apply', form, multipart);
  },
};
