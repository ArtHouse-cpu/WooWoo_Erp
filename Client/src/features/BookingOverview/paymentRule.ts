export type BookingPaymentRule = {
  enablePartialPayment: boolean;
  minimumPaymentType: "percentage" | "fixed";
  minimumPaymentValue: number;
  paymentInstructions?: string;
  refundPercent?: number;
};

export const DEFAULT_BOOKING_PAYMENT_RULE: BookingPaymentRule = {
  enablePartialPayment: true,
  minimumPaymentType: "percentage",
  minimumPaymentValue: 70,
  paymentInstructions: "",
  refundPercent: 100,
};

export function minimumBookingPayment(total: number, percent = 70) {
  const amount = Math.max(0, Number(total) || 0);
  const rate = Math.max(0, Number(percent) || 0);
  if (amount <= 0 || rate <= 0) return 0;
  return Math.ceil((amount * rate) / 100 * 100 - 1e-8) / 100;
}

export function minimumFromBookingRule(total: number, rule: BookingPaymentRule) {
  const amount = Math.max(0, Number(total) || 0);
  if (amount <= 0) return 0;
  if (!rule.enablePartialPayment) return amount;
  if (rule.minimumPaymentType === "fixed") {
    const fixed = Math.max(0, Number(rule.minimumPaymentValue) || 0);
    return Math.min(amount, Math.ceil(fixed * 100 - 1e-8) / 100);
  }
  const percent = Math.min(100, Math.max(0, Number(rule.minimumPaymentValue) || 0));
  return minimumBookingPayment(amount, percent);
}

export function bookingRuleMessage(rule: BookingPaymentRule) {
  if (!rule.enablePartialPayment) {
    return "Full payment is required to confirm the booking.";
  }
  if (rule.minimumPaymentType === "fixed") {
    const value = Number(rule.minimumPaymentValue || 0).toLocaleString("en-IN");
    return `Minimum payment of ₹${value} is required to confirm the booking.`;
  }
  return `Minimum ${Number(rule.minimumPaymentValue || 0)}% payment is required to confirm the booking.`;
}

export function previewBookingPayment(total: number, rule: BookingPaymentRule) {
  const amount = Math.max(0, Number(total) || 0);
  const payable = minimumFromBookingRule(amount, rule);
  return {
    total: amount,
    payable,
    balance: Math.max(0, Math.round((amount - payable) * 100) / 100),
  };
}
