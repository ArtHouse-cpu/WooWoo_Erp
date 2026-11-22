import {api} from './axios';

export type CoworkingReceipt = {
  id: string;
  bookingCode: string;
  planName: string;
  spaceName?: string;
  spaceType?: string;
  drink?: string;
  startDate?: string;
  startTime?: string;
  endTime?: string;
  durationHours?: number;
  coworkingEnd?: string;
  membershipEnd?: string;
  membershipName?: string;
  regularTotal: number;
  payable: number;
  savings: number;
  discount?: number;
  cashback?: number;
  benefit?: number;
  paymentStatus?: string;
  paymentMode?: string;
  razorpayPaymentId?: string;
  status?: string;
  notes?: string;
  createdAt?: string;
};

type Envelope<T> = {success: boolean; message?: string; data: T};

const bodyOf = (input: {
  planId: string;
  startDate: string;
  drink: string;
  couponCode?: string;
  spaceId?: string;
  pricingType?: 'regular' | 'membership';
}) => input;

export async function quoteCoworkingBooking(input: {
  planId: string;
  startDate: string;
  drink: string;
  couponCode?: string;
  spaceId?: string;
  pricingType?: 'regular' | 'membership';
}) {
  const {data} = await api.post<Envelope<{
    payable: number;
    savings: number;
    regularTotal: number;
    coupon: {code: string; discount: number} | null;
    couponError: string;
  }>>('/coworking-bookings/quote', bodyOf(input));
  return data.data;
}

export async function startCoworkingCheckout(input: {
  planId: string;
  startDate: string;
  drink: string;
  couponCode?: string;
  spaceId?: string;
  pricingType?: 'regular' | 'membership';
}) {
  const {data} = await api.post<Envelope<
    | {mode: 'free'; booking: CoworkingReceipt}
    | {mode: 'razorpay'; keyId: string; orderId: string; amount: number; currency: string}
  >>('/coworking-bookings/checkout', bodyOf(input));
  return data.data;
}

export async function verifyCoworkingCheckout(body: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const {data} = await api.post<Envelope<{booking: CoworkingReceipt}>>('/coworking-bookings/checkout/verify', body);
  return data.data.booking;
}

export async function fetchMyBookings() {
  const {data} = await api.get<Envelope<CoworkingReceipt[]>>('/coworking-bookings');
  return data.data || [];
}

export function downloadCoworkingInvoice(booking: CoworkingReceipt) {
  const inr = (value: number) => `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${booking.bookingCode}</title>
<style>
  body{font-family:sans-serif;padding:36px;color:#0f172a;max-width:640px;margin:auto}
  h1{color:#6344e7;margin:0} .row{display:flex;justify-content:space-between;margin:10px 0}
  .paid{background:#ede9fe;color:#4c1d95;font-weight:800;padding:12px 16px;border-radius:12px;display:flex;justify-content:space-between}
</style></head><body>
  <h1>WooWoo Art House</h1>
  <p>Coworking invoice · ${booking.bookingCode}</p>
  <div class="row"><strong>Plan</strong><span>${booking.planName || ''}</span></div>
  <div class="row"><strong>Space</strong><span>${booking.spaceName || 'Coworking'}</span></div>
  <div class="row"><strong>Start</strong><span>${booking.startDate || ''}</span></div>
  <div class="row"><strong>Coworking till</strong><span>${booking.coworkingEnd || ''}</span></div>
  ${booking.membershipEnd ? `<div class="row"><strong>Membership till</strong><span>${booking.membershipEnd}</span></div>` : ''}
  <div class="row"><strong>Drink</strong><span>${booking.drink || ''}</span></div>
  <div class="row"><span>Regular price</span><span>${inr(booking.regularTotal)}</span></div>
  ${booking.savings > 0 ? `<div class="row"><span>Savings</span><span>${inr(booking.savings)}</span></div>` : ''}
  <div class="paid"><span>Amount paid</span><span>${inr(booking.payable)}</span></div>
  <p>${booking.razorpayPaymentId ? `Razorpay ${booking.razorpayPaymentId}` : ''}</p>
</body></html>`;
  const blob = new Blob([html], {type: 'text/html'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Invoice-${booking.bookingCode}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
