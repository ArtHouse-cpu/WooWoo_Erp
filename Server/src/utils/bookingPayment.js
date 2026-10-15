export const BOOKING_MIN_PAYMENT_PERCENT = 70;

export const BOOKING_MIN_PAYMENT_MESSAGE =
  'Minimum 70% payment is required to confirm the booking.';

/** Smallest amount that still covers the booking minimum, rounded up to paise. */
export const minimumBookingPayment = (total, percent = BOOKING_MIN_PAYMENT_PERCENT) => {
  const amount = Math.max(0, Number(total) || 0);
  const rate = Math.max(0, Number(percent) || 0);
  if (amount <= 0 || rate <= 0) return 0;
  return Math.ceil((amount * rate) / 100 * 100 - 1e-8) / 100;
};

/** Cash tendered above the total is change, so only the covered portion counts. */
export const appliedBookingPayment = (total, paid) => {
  const amount = Math.max(0, Number(total) || 0);
  const tendered = Math.max(0, Number(paid) || 0);
  return Math.min(amount, tendered);
};

/**
 * Returns the booking minimum-payment message, or an empty string when the
 * payment is allowed. Full payment must cover the whole total.
 */
export const bookingPaymentError = ({total, paid, paymentStatus}) => {
  const amount = Math.max(0, Number(total) || 0);
  if (amount <= 0) return '';

  const status = String(paymentStatus || '').trim().toLowerCase();
  const applied = appliedBookingPayment(amount, paid);
  const minimum = minimumBookingPayment(amount);
  if (status !== 'full' && status !== 'partial') return BOOKING_MIN_PAYMENT_MESSAGE;
  // Half a rupee covers paise rounding between the checkout total and the stored total.
  if (applied + 0.5 < minimum) return BOOKING_MIN_PAYMENT_MESSAGE;
  if (status === 'full' && amount - applied > 1) {
    return 'Full payment must cover the total booking amount.';
  }
  return '';
};
