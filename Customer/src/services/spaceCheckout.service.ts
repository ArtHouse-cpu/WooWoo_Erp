import {api} from './axios';

export type SpaceQuote = {
  spaceId: string;
  spaceName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  hours: number;
  hourlyRate: number;
  dayType: string;
  baseAmount: number;
  offer: {name: string; freeHours: number; minimumHours: number; discount: number} | null;
  offers: Array<{name: string; rules: Array<{minimumHours: number; freeHours: number}>}>;
  membership: {label: string; percent: number; discount: number};
  coupon: {code: string; title: string; discount: number} | null;
  couponError: string;
  coupons: Array<{
    code: string;
    title: string;
    discountType: string;
    discountValue: number;
    minOrderAmount: number;
  }>;
  payable: number;
};

export type ConfirmedSpaceBooking = {
  id: string;
  bookingCode: string;
  spaceName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  grandTotal: number;
  paidAmount: number;
  paymentStatus: string;
  paymentMode: string;
  status: string;
  razorpayPaymentId: string;
};

type Envelope<T> = {success: boolean; message?: string; data: T};

export async function quoteSpaceBooking(body: {
  spaceId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  couponCode?: string;
}) {
  const {data} = await api.post<Envelope<SpaceQuote>>('/space-bookings/quote', body);
  return data.data;
}

export async function startSpaceCheckout(body: {
  spaceId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  couponCode?: string;
}) {
  const {data} = await api.post<
    Envelope<
      | {mode: 'free'; booking: ConfirmedSpaceBooking; quote: SpaceQuote}
      | {mode: 'razorpay'; keyId: string; orderId: string; amount: number; currency: string; quote: SpaceQuote}
    >
  >('/space-bookings/checkout', body);
  return data.data;
}

export async function verifySpaceCheckout(body: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const {data} = await api.post<Envelope<{booking: ConfirmedSpaceBooking}>>('/space-bookings/checkout/verify', body);
  return data.data.booking;
}
