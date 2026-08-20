/**
 * BuyMembershipModal
 *
 * 1. Fetches all active membership plans.
 * 2. User selects a plan.
 * 3. Clicks "Pay with Razorpay" → calls backend to create order.
 * 4. Razorpay checkout widget opens.
 * 5. On success → calls backend verify endpoint → subscription created.
 */
import { useEffect, useState } from "react";
import { X, Check, Loader2, ShoppingBag } from "lucide-react";
import Swal from "sweetalert2";
import {
  handleGetMemberships,
  handleCreateMembershipRazorpayOrder,
  handleVerifyMembershipRazorpayPayment,
} from "@/services/apiClient";

// Extend window to include Razorpay loaded from CDN script
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

type Plan = {
  _id: string;
  planId: string;
  displayName: string;
  pricing: {
    amount?: number;
    grossAmount?: number;
    period?: string;
  };
  description?: string;
  status?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onSuccess: () => void;
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function formatInr(amount: number) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function BuyMembershipModal({
  open,
  onClose,
  customerId,
  customerName = "",
  customerEmail = "",
  customerPhone = "",
  onSuccess,
}: Props) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedPlanId("");
    setProcessing(false);

    const controller = new AbortController();
    const fetch = async () => {
      setLoadingPlans(true);
      try {
        const res = await handleGetMemberships({ status: "Active" }, controller.signal);
        const list: Plan[] = Array.isArray(res?.memberships)
          ? res.memberships.filter((p: Plan) => p.status === "Active")
          : [];
        setPlans(list);
        if (list.length === 1) setSelectedPlanId(list[0].planId);
      } catch {
        setPlans([]);
      } finally {
        setLoadingPlans(false);
      }
    };
    void fetch();
    return () => controller.abort();
  }, [open]);

  if (!open) return null;

  const selectedPlan = plans.find((p) => p.planId === selectedPlanId);

  const handlePay = async () => {
    if (!selectedPlan) {
      Swal.fire("Select a plan", "Please select a membership plan to continue.", "warning");
      return;
    }

    setProcessing(true);

    try {
      // 1. Load Razorpay SDK
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        Swal.fire("Error", "Failed to load Razorpay. Check your internet connection.", "error");
        setProcessing(false);
        return;
      }

      // 2. Create order on backend
      const orderData = await handleCreateMembershipRazorpayOrder(customerId, selectedPlan.planId);
      if (!orderData.success || !orderData.orderId) {
        Swal.fire("Error", orderData.message || "Failed to create payment order.", "error");
        setProcessing(false);
        return;
      }

      // 3. Open Razorpay checkout
      await new Promise<void>((resolve, reject) => {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,             // in paise
          currency: orderData.currency || "INR",
          name: "WooWoo Art House",
          description: `${selectedPlan.displayName} Membership`,
          order_id: orderData.orderId,
          prefill: {
            name: customerName,
            email: customerEmail,
            contact: customerPhone,
          },
          theme: { color: "#7c3aed" },
          modal: {
            ondismiss: () => {
              reject(new Error("DISMISSED"));
            },
          },
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            try {
              // 4. Verify on backend + create subscription
              const verifyResult = await handleVerifyMembershipRazorpayPayment(
                customerId,
                {
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  planId: selectedPlan.planId,
                },
              );

              if (!verifyResult.success) {
                reject(new Error(verifyResult.message || "Payment verification failed."));
                return;
              }

              resolve();
            } catch (err) {
              reject(err);
            }
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response: { error: { description: string } }) => {
          reject(new Error(response?.error?.description || "Payment failed."));
        });
        rzp.open();
      });

      // Success
      await Swal.fire({
        icon: "success",
        title: "Membership Activated!",
        text: `${selectedPlan.displayName} membership has been successfully activated.`,
        confirmButtonColor: "#7c3aed",
      });
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { message?: string } } };
      if (err.message === "DISMISSED") {
        // User closed the Razorpay modal — do nothing, just stop processing
      } else {
        Swal.fire(
          "Payment Failed",
          err?.response?.data?.message || err?.message || "Could not complete payment.",
          "error",
        );
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-violet-100 p-1.5">
              <ShoppingBag size={16} className="text-violet-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">Buy Membership</h3>
              {customerName ? (
                <p className="text-xs text-slate-500">for {customerName}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {/* Plan selector */}
          {loadingPlans ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading plans…
            </div>
          ) : plans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
              No active membership plans found.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-600">Select a plan</p>
              {plans.map((plan) => {
                const price = Number(plan.pricing?.amount ?? 0);
                const gross = Number(plan.pricing?.grossAmount ?? 0);
                const hasDiscount = gross > price && gross > 0;
                const isSelected = selectedPlanId === plan.planId;
                return (
                  <button
                    key={plan.planId}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.planId)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                      isSelected
                        ? "border-violet-500 bg-violet-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-semibold ${
                            isSelected ? "text-violet-800" : "text-slate-800"
                          }`}
                        >
                          {plan.displayName}
                        </span>
                        {plan.pricing?.period ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                            {plan.pricing.period}
                          </span>
                        ) : null}
                      </div>
                      {plan.description ? (
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {plan.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <div
                        className={`text-base font-bold ${
                          isSelected ? "text-violet-700" : "text-slate-800"
                        }`}
                      >
                        {formatInr(price)}
                      </div>
                      {hasDiscount ? (
                        <div className="text-xs text-slate-400 line-through">
                          {formatInr(gross)}
                        </div>
                      ) : null}
                    </div>
                    {isSelected ? (
                      <div className="shrink-0 rounded-full bg-violet-500 p-1 text-white">
                        <Check size={12} />
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}

          {/* Summary + pay button */}
          {selectedPlan ? (
            <div className="mt-5 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Plan</span>
                <span className="font-semibold text-slate-800">{selectedPlan.displayName}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">Amount</span>
                <span className="text-lg font-bold text-violet-700">
                  {formatInr(Number(selectedPlan.pricing?.amount ?? 0))}
                </span>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handlePay()}
            disabled={processing || loadingPlans || !selectedPlanId}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition-all hover:bg-violet-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <ShoppingBag size={16} />
                Pay with Razorpay
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="mt-2 w-full py-2 text-xs font-medium text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
