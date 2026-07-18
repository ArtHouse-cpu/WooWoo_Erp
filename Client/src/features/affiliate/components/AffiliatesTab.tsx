import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, Wallet, Activity, Search, Trophy, MoreVertical } from 'lucide-react';
import { handleGetAffiliatesList, handleGetAffiliateById } from '@/services/apiClient';
import { AffiliateSelect, DATE_RANGE_OPTIONS, getDateRangeParams, formatCurrency, formatDate, MEMBERSHIP_TYPE_OPTIONS } from './affiliateShared';

export default function AffiliatesTab() {
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [membershipType, setMembershipType] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);

  const fetchAffiliates = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { sortBy };
      if (status !== 'all') params.status = status;
      if (membershipType !== 'all') params.membershipType = membershipType;
      if (search) params.search = search;
      Object.assign(params, getDateRangeParams(dateRange));
      const data = await handleGetAffiliatesList(params);
      setAffiliates(data || []);
    } catch {
      setAffiliates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchAffiliates, 300);
    return () => clearTimeout(t);
  }, [status, membershipType, dateRange, sortBy, search]);

  const selectAffiliate = async (affiliate: any) => {
    setSelected(affiliate);
    try {
      const data = await handleGetAffiliateById(affiliate._id);
      setDetail(data);
    } catch {
      setDetail(affiliate);
    }
  };

  const exportCsv = () => {
    const header = 'Name,Email,Status,Membership,Customers,Revenue,Commission,Balance,Joined\n';
    const rows = affiliates.map((a) =>
      `"${a.name}","${a.email}",${a.status || 'active'},${a.membershipType},${a.totalCustomersReferred || 0},${a.totalRevenueGenerated || 0},${a.totalCommissionEarned || 0},${a.affiliateBalance || 0},${formatDate(a.createdAt)}`,
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'affiliates.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6">
        <div className="flex justify-between items-center">
          <div><h2 className="text-xl font-bold">Affiliates</h2><p className="text-sm text-gray-500">Manage affiliates and performance</p></div>
          <button type="button" onClick={exportCsv} className="border rounded-lg px-4 py-2 text-sm">Export CSV</button>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <AffiliateSelect className="w-32" value={status} onChange={setStatus} options={[
            { value: 'all', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' },
          ]} />
          <AffiliateSelect className="w-36" value={membershipType} onChange={setMembershipType} options={MEMBERSHIP_TYPE_OPTIONS} />
          <AffiliateSelect className="w-36" value={dateRange} onChange={setDateRange} options={DATE_RANGE_OPTIONS} />
          <AffiliateSelect className="w-40" value={sortBy} onChange={setSortBy} options={[
            { value: 'latest', label: 'Latest Joined' }, { value: 'oldest', label: 'Oldest Joined' },
            { value: 'revenue', label: 'Top Revenue' }, { value: 'commission', label: 'Top Commission' },
          ]} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="border rounded-xl p-4"><Users size={16} className="text-indigo-600 mb-2" /><h2 className="text-2xl font-bold">{affiliates.length}</h2><p className="text-xs text-gray-500">Total affiliates</p></div>
          <div className="border rounded-xl p-4"><TrendingUp size={16} className="text-green-600 mb-2" /><h2 className="text-2xl font-bold">{formatCurrency(affiliates.reduce((a, x) => a + (x.totalRevenueGenerated || 0), 0))}</h2><p className="text-xs text-gray-500">Total revenue</p></div>
          <div className="border rounded-xl p-4"><Wallet size={16} className="text-blue-600 mb-2" /><h2 className="text-2xl font-bold">{formatCurrency(affiliates.reduce((a, x) => a + (x.totalCommissionEarned || 0), 0))}</h2><p className="text-xs text-gray-500">Total commissions</p></div>
        </div>

        <div className="border rounded-xl bg-white overflow-hidden">
          <div className="p-4 text-sm text-gray-500">Showing {affiliates.length} affiliate{affiliates.length !== 1 ? 's' : ''}</div>
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="py-3 px-4">Affiliate</th><th className="py-3 px-4">Status</th><th className="py-3 px-4">Membership</th>
              <th className="py-3 px-4">Customers</th><th className="py-3 px-4">Revenue</th><th className="py-3 px-4">Commission</th>
              <th className="py-3 px-4">Balance</th><th className="py-3 px-4">Joined</th><th className="py-3 px-4"></th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-8 text-center text-gray-500">Loading...</td></tr>
              ) : affiliates.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-gray-500">No affiliates found</td></tr>
              ) : affiliates.map((a) => (
                <tr key={a._id} className={`border-b hover:bg-gray-50 cursor-pointer ${selected?._id === a._id ? 'bg-indigo-50' : ''}`} onClick={() => selectAffiliate(a)}>
                  <td className="py-3 px-4">
                    <div className="font-medium">{a.name || '—'}</div>
                    <div className="text-xs text-gray-500">{a.email}</div>
                  </td>
                  <td className="py-3 px-4 capitalize">{a.status || 'active'}</td>
                  <td className="py-3 px-4 capitalize">{a.membershipType}</td>
                  <td className="py-3 px-4">{a.totalCustomersReferred || 0}</td>
                  <td className="py-3 px-4">{formatCurrency(a.totalRevenueGenerated)}</td>
                  <td className="py-3 px-4 text-green-600">{formatCurrency(a.totalCommissionEarned)}</td>
                  <td className="py-3 px-4">{formatCurrency(a.affiliateBalance)}</td>
                  <td className="py-3 px-4">{formatDate(a.createdAt)}</td>
                  <td className="py-3 px-4"><MoreVertical size={16} className="text-gray-400" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="w-96 border-l pl-6">
        {!selected ? (
          <div className="text-center text-gray-500 py-20">Select an affiliate to view details</div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-lg">{detail?.name || selected.name}</h3>
              <p className="text-xs text-gray-500">ID: {detail?.customerId || selected.customerId || selected._id}</p>
              <p className="text-sm text-gray-600">{detail?.email || selected.email}</p>
              <p className="text-sm text-gray-600">{detail?.mobile || selected.mobile || '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="border rounded-lg p-3"><div className="text-xs text-gray-500">Revenue</div><div className="font-bold">{formatCurrency(detail?.totalRevenueGenerated)}</div></div>
              <div className="border rounded-lg p-3"><div className="text-xs text-gray-500">Commission</div><div className="font-bold">{formatCurrency(detail?.totalCommissionEarned)}</div></div>
              <div className="border rounded-lg p-3"><div className="text-xs text-gray-500">Balance</div><div className="font-bold">{formatCurrency(detail?.affiliateBalance)}</div></div>
              <div className="border rounded-lg p-3"><div className="text-xs text-gray-500">Referrals</div><div className="font-bold">{detail?.totalCustomersReferred || 0}</div></div>
            </div>
            {detail?.revenueBreakdown?.length > 0 ? (
              <div>
                <h4 className="font-semibold text-sm mb-2">Revenue Breakdown</h4>
                {detail.revenueBreakdown.map((b: any) => (
                  <div key={b._id} className="flex justify-between text-sm py-1">
                    <span>{b._id || 'Other'}</span>
                    <span>{formatCurrency(b.revenue)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No revenue breakdown yet.</p>
            )}
            <div className="flex items-center gap-1 text-indigo-600 text-sm"><Trophy size={14} /> Milestone data not tracked yet</div>
          </div>
        )}
      </div>
    </div>
  );
}
