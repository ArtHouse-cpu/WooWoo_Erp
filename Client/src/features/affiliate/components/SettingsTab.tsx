import React from 'react';
import { Bell, Trophy, Wallet, CheckCircle2, RotateCw, AlertCircle, XCircle } from 'lucide-react';
import {
  AffiliateToggle,
  AffiliateSelect,
  COOKIE_DURATION_OPTIONS,
  formatCurrency,
} from './affiliateShared';

type Props = {
  settings: any;
  handleSave: (payload: any) => Promise<void>;
};

export default function SettingsTab({ settings, handleSave }: Props) {
  const programControls = settings?.programControls || {};
  const withdrawal = settings?.withdrawal || {};
  const payoutSettings = settings?.payoutSettings || {};
  const notifications = settings?.notifications || {};
  const registrationSettings = settings?.registrationSettings || {};

  const saveNotifications = (patch: any) => handleSave({ notifications: { ...notifications, ...patch } });
  const saveRegistration = (patch: any) => handleSave({ registrationSettings: { ...registrationSettings, ...patch } });
  const saveProgram = (patch: any) => handleSave({ programControls: { ...programControls, ...patch } });

  const toggleAllowedType = async (type: string) => {
    const current = registrationSettings.allowedTypes || ['customer', 'partner', 'vendor'];
    const next = current.includes(type) ? current.filter((t: string) => t !== type) : [...current, type];
    await saveRegistration({ allowedTypes: next });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Affiliate Program Settings</h2>
        <p className="text-sm text-gray-500">Manage program controls and notifications.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="border rounded-xl bg-white p-6 space-y-5">
          <h3 className="font-semibold">Program Control</h3>
          <div className="flex justify-between items-center">
            <span className="text-sm">Enable Affiliate Program</span>
            <AffiliateToggle enabled={settings?.isEnabled !== false} onChange={(v) => handleSave({ isEnabled: v })} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Allow Self Referral</span>
            <AffiliateToggle enabled={!!programControls.allowSelfReferral} onChange={(v) => saveProgram({ allowSelfReferral: v })} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Multi-level Referrals</span>
            <AffiliateToggle enabled={!!programControls.multiLevelReferral} onChange={(v) => saveProgram({ multiLevelReferral: v })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Cookie Duration</label>
            <AffiliateSelect
              value={String(settings?.cookieDurationDays ?? 30)}
              onChange={(v) => handleSave({ cookieDurationDays: parseInt(v) })}
              options={COOKIE_DURATION_OPTIONS}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Auto Approve Commissions</span>
            <AffiliateToggle enabled={settings?.autoApproveCommissions !== false} onChange={(v) => handleSave({ autoApproveCommissions: v })} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Hold Commission (days)</span>
            <input
              type="number"
              value={payoutSettings.holdCommissionDays ?? 15}
              onChange={(e) => handleSave({ payoutSettings: { ...payoutSettings, holdCommissionDays: parseInt(e.target.value) || 0 } })}
              className="w-16 border rounded-lg p-1 text-sm text-center"
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Cancel Commission on Refund</span>
            <AffiliateToggle enabled={!!payoutSettings.cancelCommissionOnRefund} onChange={(v) => handleSave({ payoutSettings: { ...payoutSettings, cancelCommissionOnRefund: v } })} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Max Commission Per Order</span>
            <button
              type="button"
              onClick={async () => {
                const raw = window.prompt('Max commission per order (₹):', String(settings?.maxCommissionPerOrder ?? 10000));
                if (raw !== null) await handleSave({ maxCommissionPerOrder: parseFloat(raw) || 0 });
              }}
              className="border rounded-lg px-2 py-1 text-sm"
            >
              {formatCurrency(settings?.maxCommissionPerOrder ?? 10000)}
            </button>
          </div>
        </div>

        <div className="border rounded-xl bg-white p-6 space-y-5">
          <h3 className="font-semibold">Registration & Verification</h3>
          <div className="flex justify-between items-center">
            <span className="text-sm">Auto Verify Affiliates</span>
            <AffiliateToggle enabled={registrationSettings.autoVerifyAffiliates !== false} onChange={(v) => saveRegistration({ autoVerifyAffiliates: v })} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Require Bank / UPI Details</span>
            <AffiliateToggle enabled={registrationSettings.requireBankDetails !== false} onChange={(v) => saveRegistration({ requireBankDetails: v })} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Min Withdrawable Balance</span>
            <button
              type="button"
              onClick={async () => {
                const raw = window.prompt('Minimum withdrawable balance (₹):', String(withdrawal.minAmount ?? 2000));
                if (raw !== null) await handleSave({ withdrawal: { ...withdrawal, minAmount: parseFloat(raw) || 0 } });
              }}
              className="border rounded-lg px-2 py-1 text-sm"
            >
              {formatCurrency(withdrawal.minAmount ?? 2000)}
            </button>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Allowed Affiliate Types</p>
            {['customer', 'partner', 'vendor'].map((type) => (
              <label key={type} className="flex items-center gap-2 text-sm mb-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(registrationSettings.allowedTypes || ['customer', 'partner', 'vendor']).includes(type)}
                  onChange={() => toggleAllowedType(type)}
                />
                <span className="capitalize">{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="border rounded-xl bg-white p-6 space-y-3">
          <h3 className="font-semibold">Checkout Referral Discount</h3>
          <p className="text-xs text-gray-500">
            Checkout discounts for referred customers are controlled in the <strong>Commission Rules</strong> tab.
            Each segment (Store Supplies, Membership, Space Booking, Services, Food Orders) applies its own percentage or fixed discount to matching cart lines at Invoice/POS checkout.
          </p>
          <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
            Example: Store Supplies at 50% gives referred buyers 50% off all product/store-supply line items.
          </p>
        </div>

        <div className="border rounded-xl bg-white p-6 space-y-5">
          <h3 className="font-semibold">Notification Settings</h3>
          {[
            { key: 'newAffiliateRegistration', label: 'New Affiliate Registration', icon: Bell },
            { key: 'milestoneAchieved', label: 'Milestone Achieved', icon: Trophy },
            { key: 'payoutRequest', label: 'Payout Request', icon: Wallet },
            { key: 'payoutProcessed', label: 'Payout Processed', icon: CheckCircle2 },
            { key: 'refundOrderCancelled', label: 'Refund / Order Cancelled', icon: RotateCw },
          ].map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex justify-between items-center">
              <div className="flex gap-2 items-center text-sm"><Icon size={16} className="text-indigo-600" />{label}</div>
              <AffiliateToggle enabled={notifications[key] !== false} onChange={(v) => saveNotifications({ [key]: v })} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="border rounded-xl bg-white p-6 space-y-5 lg:col-span-2">
          <h3 className="font-semibold mb-2">Other Settings</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Affiliate Dashboard Access</span>
              <AffiliateToggle enabled={settings?.affiliateDashboardAccess !== false} onChange={(v) => handleSave({ affiliateDashboardAccess: v })} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Analytics Tracking</span>
              <AffiliateToggle enabled={settings?.analyticsTracking !== false} onChange={(v) => handleSave({ analyticsTracking: v })} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Coupon Based Tracking</span>
              <AffiliateToggle enabled={!!programControls.couponBasedTracking} onChange={(v) => saveProgram({ couponBasedTracking: v })} />
            </div>
          </div>
        </div>
        <div className="border border-red-200 rounded-xl bg-white p-6">
          <div className="flex gap-2 items-start mb-4"><AlertCircle size={20} className="text-red-600" /><div><h3 className="font-semibold">Danger Zone</h3><p className="text-xs text-gray-500">Irreversible actions</p></div></div>
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm('Reset all affiliate settings to defaults?')) return;
              await handleSave({ isEnabled: true });
              window.location.reload();
            }}
            className="w-full text-red-600 border border-red-200 rounded-lg py-2 text-sm mb-2"
          >
            Reset Settings
          </button>
          <button
            type="button"
            onClick={() => handleSave({ isEnabled: false })}
            className="w-full text-red-600 border border-red-200 rounded-lg py-2 text-sm flex items-center justify-center gap-2"
          >
            <XCircle size={16} /> Disable Program
          </button>
        </div>
      </div>
    </div>
  );
}
