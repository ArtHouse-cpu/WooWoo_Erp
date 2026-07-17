import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, Wallet, Activity } from 'lucide-react';
import { handleGetAffiliateOverview } from '@/services/apiClient';
import { formatCurrency } from './affiliateShared';

export default function OverviewTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    handleGetAffiliateOverview()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-20 text-center text-gray-500">Loading overview...</div>;

  const overview = data || {
    totalAffiliates: 0,
    totalRevenue: 0,
    totalCommissions: 0,
    totalReferrals: 0,
    topAffiliates: [],
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Overview</h2>
        <p className="text-sm text-gray-500">Affiliate program performance at a glance</p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="border rounded-xl p-5 bg-white">
          <Users size={20} className="text-indigo-600 mb-2" />
          <h2 className="text-3xl font-bold">{overview.totalAffiliates}</h2>
          <p className="text-sm text-gray-500">Total Affiliates</p>
        </div>
        <div className="border rounded-xl p-5 bg-white">
          <TrendingUp size={20} className="text-green-600 mb-2" />
          <h2 className="text-3xl font-bold">{formatCurrency(overview.totalRevenue)}</h2>
          <p className="text-sm text-gray-500">Total Revenue</p>
        </div>
        <div className="border rounded-xl p-5 bg-white">
          <Wallet size={20} className="text-blue-600 mb-2" />
          <h2 className="text-3xl font-bold">{formatCurrency(overview.totalCommissions)}</h2>
          <p className="text-sm text-gray-500">Total Commissions</p>
        </div>
        <div className="border rounded-xl p-5 bg-white">
          <Activity size={20} className="text-orange-600 mb-2" />
          <h2 className="text-3xl font-bold">{overview.totalReferrals}</h2>
          <p className="text-sm text-gray-500">Total Referrals</p>
        </div>
      </div>
      <div className="border rounded-xl bg-white overflow-hidden">
        <div className="p-4 border-b font-semibold">Top Affiliates</div>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Revenue</th>
              <th className="py-3 px-4">Commission</th>
              <th className="py-3 px-4">Balance</th>
            </tr>
          </thead>
          <tbody>
            {(overview.topAffiliates || []).length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-gray-500">No affiliate data yet.</td></tr>
            ) : overview.topAffiliates.map((a: any) => (
              <tr key={a._id} className="border-b">
                <td className="py-3 px-4">{a.name}</td>
                <td className="py-3 px-4">{formatCurrency(a.totalRevenueGenerated)}</td>
                <td className="py-3 px-4">{formatCurrency(a.totalCommissionEarned)}</td>
                <td className="py-3 px-4">{formatCurrency(a.affiliateBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
