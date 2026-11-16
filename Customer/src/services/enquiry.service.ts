import {api} from './axios';
import {useAuthStore} from '../store/authStore';

export type PortalEnquiryType = 'Space' | 'Store' | 'Service';

const recentSubmissions = new Map<string, number>();

function lastTen(value: string | undefined) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

/** Records a portal enquiry as an admin lead. Failures stay silent so the customer flow continues. */
export function recordPortalEnquiry(input: {
  enquiryType: PortalEnquiryType;
  itemName: string;
  description?: string;
}) {
  const itemName = input.itemName.trim();
  if (!itemName) return;

  const {customer, accessToken} = useAuthStore.getState();
  const phone = lastTen(customer?.mobile);
  if (!accessToken || !customer || !/^\d{10}$/.test(phone)) return;

  const burstKey = `${phone}:${input.enquiryType}:${itemName.toLowerCase()}`;
  const now = Date.now();
  const previous = recentSubmissions.get(burstKey) || 0;
  if (now - previous < 4000) return;
  recentSubmissions.set(burstKey, now);

  const enquiryKey = `${burstKey}:${now}`;
  void api
    .post('/enquiries', {
      enquiryType: input.enquiryType,
      itemName,
      description: (input.description || '').trim(),
      enquiryKey,
    })
    .catch(() => {
      recentSubmissions.delete(burstKey);
    });
}
