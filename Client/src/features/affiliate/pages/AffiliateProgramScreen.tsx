import React, { useEffect, useState } from 'react';
import {
  Users, Wallet, Settings, Gift, Trophy, CreditCard,
} from 'lucide-react';
import {
  handleGetAffiliateSettings,
  handleUpdateAffiliateSettings,
} from '@/services/apiClient';
import { AffiliateToggle, notifyAffiliate, runAffiliateAction } from '../components/affiliateShared';

const DEFAULT_SETTINGS = {
  isEnabled: true,
  rules: [],
  withdrawal: { minAmount: 2000, maxAmount: 50000, processingFeePercentage: 0, methods: ['bank', 'upi', 'instant_upi'] },
  payoutSettings: { frequency: 'weekly', payoutDay: 'Monday', payoutTime: '10:00 AM', timezone: 'Asia/Kolkata', autoApproval: false, holdCommissionDays: 15, cancelCommissionOnRefund: true },
  milestones: [],
  milestoneSettings: { autoCreditReward: true, includeCancelledOrders: false, achievementWindow: 'lifetime' },
  notifications: {},
  registrationSettings: { autoVerifyAffiliates: true, requireBankDetails: true, allowedTypes: ['customer', 'partner', 'vendor'] },
  programControls: {},
};
import CommissionRulesTab from '../components/CommissionRulesTab';
import WalletSettingsTab from '../components/WalletSettingsTab';
import MilestoneRewardsTab from '../components/MilestoneRewardsTab';
import AffiliatesTab from '../components/AffiliatesTab';
import PayoutsTab from '../components/PayoutsTab';
import SettingsTab from '../components/SettingsTab';
import OverviewTab from '../components/OverviewTab';
import LeaderboardTab from '../components/LeaderboardTab';

export default function AffiliateProgramScreen() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await handleGetAffiliateSettings();
      setSettings(data);
    } catch (error: any) {
      console.error(error);
      setLoadError(error?.response?.data?.message || 'Failed to load affiliate settings');
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (updatedSettings: any) => {
    await runAffiliateAction(
      async () => {
        const data = await handleUpdateAffiliateSettings(updatedSettings);
        setSettings(data);
      },
      'Settings saved successfully',
      'Are you sure you want to save these changes?'
    );
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const tabs = [
    { name: 'Overview', icon: <Users size={16} /> },
    { name: 'Affiliates', icon: <Users size={16} /> },
    { name: 'Leaderboard', icon: <Trophy size={16} /> },
    { name: 'Commission Rules', icon: <Settings size={16} /> },
    { name: 'Wallet Settings', icon: <Wallet size={16} /> },
    { name: 'Milestone Rewards', icon: <Gift size={16} /> },
    { name: 'Payouts', icon: <CreditCard size={16} /> },
    { name: 'Settings', icon: <Settings size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 font-sans">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Affiliate Program</h1>
          <p className="text-sm text-gray-500">Manage affiliates, commission, rewards & wallet settings</p>
          {loadError && (
            <p className="text-sm text-orange-600 mt-1">Using defaults — {loadError}. Check login/API connection.</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Program Status</span>
          <div className="flex items-center gap-2">
            <AffiliateToggle
              enabled={settings?.isEnabled !== false}
              onChange={(v) => handleSave({ isEnabled: v })}
            />
            <span className="text-sm font-medium text-gray-900">
              {settings?.isEnabled !== false ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6 flex overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            type="button"
            onClick={() => setActiveTab(tab.name)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.name
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            {tab.name}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'Overview' && <OverviewTab />}
        {activeTab === 'Affiliates' && <AffiliatesTab />}
        {activeTab === 'Leaderboard' && <LeaderboardTab />}
        {activeTab === 'Commission Rules' && (
          <CommissionRulesTab settings={settings} handleSave={handleSave} />
        )}
        {activeTab === 'Wallet Settings' && (
          <WalletSettingsTab settings={settings} handleSave={handleSave} />
        )}
        {activeTab === 'Milestone Rewards' && (
          <MilestoneRewardsTab settings={settings} handleSave={handleSave} />
        )}
        {activeTab === 'Payouts' && (
          <PayoutsTab onOpenSettings={() => setActiveTab('Wallet Settings')} />
        )}
        {activeTab === 'Settings' && (
          <SettingsTab settings={settings} handleSave={handleSave} />
        )}
      </div>
    </div>
  );
}
