/**
 * Dynamically load the Razorpay checkout.js CDN script (idempotent).
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface RazorpayCheckoutOptions {
  keyId: string;
  orderId: string;
  amount: number;        // paise
  currency?: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  themeColor?: string;
  onSuccess: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  onDismiss?: () => void;
  onError?: (description: string) => void;
}

export function openRazorpayCheckout(options: RazorpayCheckoutOptions): void {
  const rzp = new (window as any).Razorpay({
    key: options.keyId,
    amount: options.amount,
    currency: options.currency ?? 'INR',
    name: options.name ?? 'WooWoo Art House',
    description: options.description ?? 'Membership',
    order_id: options.orderId,
    prefill: {
      name: options.prefill?.name ?? '',
      email: options.prefill?.email ?? '',
      contact: options.prefill?.contact ?? '',
    },
    theme: { color: options.themeColor ?? '#7c3aed' },
    modal: {
      ondismiss: () => options.onDismiss?.(),
    },
    handler: (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => {
      options.onSuccess(response);
    },
  });

  rzp.on('payment.failed', (response: { error: { description: string } }) => {
    options.onError?.(response?.error?.description ?? 'Payment failed');
  });

  rzp.open();
}
