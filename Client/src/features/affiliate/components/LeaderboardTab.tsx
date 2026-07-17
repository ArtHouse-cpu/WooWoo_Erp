import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { handleGetAffiliateLeaderboard } from '@/services/apiClient';
import { formatCurrency } from './affiliateShared';

export default function LeaderboardTab() {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    handleGetAffiliateLeaderboard()
      .then(setLeaders)
      .catch(() => setLeaders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-20 text-center text-gray-500">Loading leaderboard...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="text-indigo-600" /> Leaderboard</h2>
        <p className="text-sm text-gray-500">Top affiliates by commission earned</p>
      </div>
      <div className="border rounded-xl bg-white overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Affiliate</th>
              <th className="py-3 px-4">Referral Code</th>
              <th className="py-3 px-4">Revenue</th>
              <th className="py-3 px-4">Commission</th>
              <th className="py-3 px-4">Balance</th>
            </tr>
          </thead>
          <tbody>
            {leaders.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-500">No affiliates on the leaderboard yet.</td></tr>
            ) : leaders.map((a, i) => (
              <tr key={a._id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 font-bold text-indigo-600">#{i + 1}</td>
                <td className="py-3 px-4">
                  <div className="font-medium">{a.name || '—'}</div>
                  <div className="text-xs text-gray-500">{a.email}</div>
                </td>
                <td className="py-3 px-4">{a.referralCode || '—'}</td>
                <td className="py-3 px-4">{formatCurrency(a.totalRevenueGenerated)}</td>
                <td className="py-3 px-4 font-medium text-green-600">{formatCurrency(a.totalCommissionEarned)}</td>
                <td className="py-3 px-4">{formatCurrency(a.affiliateBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
