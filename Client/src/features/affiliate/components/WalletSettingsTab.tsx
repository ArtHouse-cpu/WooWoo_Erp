import React, { useEffect, useState } from 'react';
import { Wallet, CreditCard, Activity } from 'lucide-react';
import { handleGetAffiliateWalletSummary } from '@/services/apiClient';
import {
  AffiliateToggle,
  AffiliateSelect,
  PAYOUT_DAYS,
  PAYOUT_TIMES,
  TIMEZONES,
  formatCurrency,
} from './affiliateShared';

type Props = {
  settings: any;
  handleSave: (payload: any) => Promise<void>;
};

export default function WalletSettingsTab({ settings, handleSave }: Props) {
  const withdrawal = settings?.withdrawal || {};
  const payoutSettings = settings?.payoutSettings || {};
  const [summary, setSummary] = useState<any>({});

  useEffect(() => {
    handleGetAffiliateWalletSummary().then(setSummary).catch(() => setSummary({}));
  }, []);

  const saveWithdrawal = async (patch: any) => {
    await handleSave({ withdrawal: { ...withdrawal, ...patch } });
  };

  const savePayout = async (patch: any) => {
    await handleSave({ payoutSettings: { ...payoutSettings, ...patch } });
  };

  const editNumber = async (label: string, current: number, onSave: (v: number) => void) => {
    const raw = window.prompt(`Enter ${label}:`, String(current ?? 0));
    if (raw === null) return;
    const val = parseFloat(raw);
    if (Number.isNaN(val) || val < 0) return;
    await onSave(val);
  };

  const methods = withdrawal.methods || ['bank', 'upi', 'instant_upi'];
  const methodLabels: Record<string, string> = {
    bank: 'Bank Transfer',
    upi: 'UPI Transfer',
    instant_upi: 'Instant Payout (UPI)',
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Wallet Settings</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border border-gray-200 rounded-xl p-5 bg-white">
          <div className="flex items-center gap-2 mb-4"><Wallet size={20} className="text-indigo-600" /><span className="font-semibold text-sm">Minimum Withdrawal</span></div>
          <h2 className="text-3xl font-bold mb-2">{formatCurrency(withdrawal.minAmount ?? 2000)}</h2>
          <button type="button" onClick={() => editNumber('minimum withdrawal', withdrawal.minAmount ?? 2000, (v) => saveWithdrawal({ minAmount: v }))} className="px-4 py-1.5 text-indigo-600 border border-indigo-200 rounded-lg text-sm">Edit Amount</button>
        </div>
        <div className="border border-gray-200 rounded-xl p-5 bg-white">
          <h2 className="text-3xl font-bold mb-2">{withdrawal.processingFeePercentage ?? 0}%</h2>
          <p className="text-xs text-gray-500 mb-4">Withdrawal processing fee</p>
          <button type="button" onClick={() => editNumber('processing fee %', withdrawal.processingFeePercentage ?? 0, (v) => saveWithdrawal({ processingFeePercentage: v }))} className="px-4 py-1.5 text-indigo-600 border border-indigo-200 rounded-lg text-sm">Edit Fee</button>
        </div>
        <div className="border border-gray-200 rounded-xl p-5 bg-white">
          <div className="flex items-center gap-2 mb-4"><CreditCard size={20} className="text-indigo-600" /><span className="font-semibold text-sm">Withdrawal Methods</span></div>
          <div className="space-y-2 mb-4 text-sm">
            {['bank', 'upi', 'instant_upi'].map((m) => (
              <label key={m} className="flex justify-between items-center cursor-pointer">
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={methods.includes(m)} onChange={async (e) => {
                    const next = e.target.checked ? [...methods, m] : methods.filter((x: string) => x !== m);
                    await saveWithdrawal({ methods: next });
                  }} />
                  {methodLabels[m]}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="border border-gray-200 rounded-xl p-5 bg-white">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2"><Activity size={20} className="text-indigo-600" /><span className="font-semibold text-sm">Auto Payout</span></div>
            <AffiliateToggle enabled={!!payoutSettings.autoApproval} onChange={(v) => savePayout({ autoApproval: v })} />
          </div>
          <p className="text-xs text-gray-500">Automatically process payout requests when conditions are met.</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 border border-gray-200 rounded-xl p-6 bg-white">
          <h3 className="font-semibold mb-4">Payout Settings</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payout Frequency</label>
              <AffiliateSelect value={payoutSettings.frequency || 'weekly'} onChange={(v) => savePayout({ frequency: v })} options={[
                { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' },
              ]} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payout Day</label>
              <AffiliateSelect value={payoutSettings.payoutDay || 'Monday'} onChange={(v) => savePayout({ payoutDay: v })} options={PAYOUT_DAYS} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payout Time</label>
              <AffiliateSelect value={payoutSettings.payoutTime || '10:00 AM'} onChange={(v) => savePayout({ payoutTime: v })} options={PAYOUT_TIMES} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Timezone</label>
              <AffiliateSelect value={payoutSettings.timezone || 'Asia/Kolkata'} onChange={(v) => savePayout({ timezone: v })} options={TIMEZONES} />
            </div>
          </div>
          <div className="space-y-4 mt-6">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Auto Approve Payout Requests</span>
              <AffiliateToggle enabled={!!payoutSettings.autoApproval} onChange={(v) => savePayout({ autoApproval: v })} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Hold Commission (days)</span>
              <input type="number" defaultValue={payoutSettings.holdCommissionDays ?? 15} onBlur={(e) => savePayout({ holdCommissionDays: parseInt(e.target.value) || 0 })} className="w-16 text-center border rounded-lg p-1 text-sm" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Cancel Commission on Refund</span>
              <AffiliateToggle enabled={!!payoutSettings.cancelCommissionOnRefund} onChange={(v) => savePayout({ cancelCommissionOnRefund: v })} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Max Payout Per Request</span>
              <button type="button" onClick={() => editNumber('max payout', withdrawal.maxAmount ?? 50000, (v) => saveWithdrawal({ maxAmount: v }))} className="border rounded-lg px-3 py-1 text-sm">{formatCurrency(withdrawal.maxAmount ?? 50000)}</button>
            </div>
          </div>
        </div>
        <div className="w-full border border-gray-200 rounded-xl bg-white p-5 lg:w-80 lg:shrink-0">
          <h3 className="font-semibold mb-4">Wallet Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Total Wallet Balance</span><span className="font-medium">{formatCurrency(summary.totalWalletBalance)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Withdrawable</span><span className="font-bold text-green-600">{formatCurrency(summary.withdrawableBalance)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Pending Payouts</span><span>{formatCurrency(summary.pendingPayouts)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">In-Process</span><span>{formatCurrency(summary.inProcessPayouts)}</span></div>
            <div className="flex justify-between border-t pt-3"><span className="font-medium">Total Paid (All Time)</span><span className="font-bold">{formatCurrency(summary.totalPayoutsAllTime)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
