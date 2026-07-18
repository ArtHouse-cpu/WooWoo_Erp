import React, { useEffect, useState } from 'react';
import { Wallet, Clock, Activity, XCircle, CheckCircle2, Search, Eye, Plus } from 'lucide-react';
import {
  handleGetPayoutsList,
  handleCreateManualPayout,
  handleUpdatePayoutStatus,
  handleGetAffiliatesList,
} from '@/services/apiClient';
import { AffiliateSelect, DATE_RANGE_OPTIONS, getDateRangeParams, SimpleModal, formatCurrency, formatDate, runAffiliateAction, notifyAffiliate } from './affiliateShared';

export default function PayoutsTab({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [methodStats, setMethodStats] = useState<any[]>([]);
  const [failedRecent, setFailedRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tabStatus, setTabStatus] = useState('all');
  const [payoutMethod, setPayoutMethod] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [viewPayout, setViewPayout] = useState<any>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [manualForm, setManualForm] = useState({ affiliateId: '', amount: '', payoutMethod: 'Manual', markPending: false });

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      const effectiveStatus = tabStatus !== 'all' ? tabStatus : statusFilter;
      if (effectiveStatus !== 'all') params.status = effectiveStatus;
      if (payoutMethod !== 'all') params.payoutMethod = payoutMethod;
      if (search) params.search = search;
      Object.assign(params, getDateRangeParams(dateRange));
      const data = await handleGetPayoutsList(params);
      setPayouts(data.payouts || []);
      setStats(data.stats || {});
      setMethodStats(data.methodStats || []);
      setFailedRecent(data.failedRecent || []);
    } catch {
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchPayouts, 300);
    return () => clearTimeout(t);
  }, [statusFilter, tabStatus, payoutMethod, dateRange, search]);

  useEffect(() => {
    handleGetAffiliatesList().then(setAffiliates).catch(() => setAffiliates([]));
  }, []);

  const updateStatus = async (payout: any, status: string, extra: any = {}) => {
    await runAffiliateAction(async () => {
      await handleUpdatePayoutStatus(payout._id, { status, source: payout.source || 'payout', ...extra });
      await fetchPayouts();
      setViewPayout(null);
    }, 'Payout status updated');
  };

  const createManual = async () => {
    if (!manualForm.affiliateId || !manualForm.amount) {
      notifyAffiliate('Select affiliate and amount', 'error');
      return;
    }
    await runAffiliateAction(async () => {
      await handleCreateManualPayout({
        affiliateId: manualForm.affiliateId,
        amount: Number(manualForm.amount),
        payoutMethod: manualForm.payoutMethod,
        markPending: manualForm.markPending,
      });
      setManualOpen(false);
      setManualForm({ affiliateId: '', amount: '', payoutMethod: 'Manual', markPending: false });
      await fetchPayouts();
    }, manualForm.markPending ? 'Payout request created' : 'Manual payout created');
  };

  const exportCsv = () => {
    const header = 'Affiliate,Amount,Method,Status,Requested,Paid,TxnId\n';
    const rows = payouts.map((p) =>
      `"${p.affiliateId?.name}",${p.amount},${p.payoutMethod},${p.status},${formatDate(p.requestedAt)},${formatDate(p.processedAt)},${p.transactionId || ''}`,
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payouts.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalAll = (stats.pending?.total || 0) + (stats.inProcess?.total || 0) + (stats.paid?.total || 0) + (stats.failed?.total || 0);
  const methodTotal = methodStats.reduce((a, m) => a + (m.total || 0), 0);

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6">
        <div className="flex justify-between items-center">
          <div><h2 className="text-xl font-bold">Payouts</h2><p className="text-sm text-gray-500">Track affiliate payouts</p></div>
          {onOpenSettings && (
            <button type="button" onClick={onOpenSettings} className="text-indigo-600 border border-indigo-200 rounded-lg px-4 py-2 text-sm">Payout Settings</button>
          )}
        </div>

        <div className="grid grid-cols-5 gap-4">
          <div className="border rounded-xl p-4"><Wallet size={16} className="mb-2 text-indigo-600" /><h2 className="text-xl font-bold">{formatCurrency(totalAll)}</h2><p className="text-xs text-gray-500">Total</p></div>
          <div className="border rounded-xl p-4"><CheckCircle2 size={16} className="mb-2 text-green-600" /><h2 className="text-xl font-bold">{formatCurrency(stats.paid?.total)}</h2><p className="text-xs text-gray-500">{stats.paid?.count || 0} paid</p></div>
          <div className="border rounded-xl p-4"><Clock size={16} className="mb-2 text-orange-600" /><h2 className="text-xl font-bold">{formatCurrency(stats.pending?.total)}</h2><p className="text-xs text-gray-500">{stats.pending?.count || 0} pending</p></div>
          <div className="border rounded-xl p-4"><Activity size={16} className="mb-2 text-blue-600" /><h2 className="text-xl font-bold">{formatCurrency(stats.inProcess?.total)}</h2><p className="text-xs text-gray-500">{stats.inProcess?.count || 0} in process</p></div>
          <div className="border rounded-xl p-4"><XCircle size={16} className="mb-2 text-red-600" /><h2 className="text-xl font-bold">{formatCurrency(stats.failed?.total)}</h2><p className="text-xs text-gray-500">{stats.failed?.count || 0} failed</p></div>
        </div>

        <div className="border rounded-xl bg-white overflow-hidden">
          <div className="flex gap-4 px-4 border-b text-sm">
            {[
              { key: 'all', label: 'All', count: payouts.length },
              { key: 'Pending', label: 'Pending', count: stats.pending?.count },
              { key: 'In Process', label: 'In Process', count: stats.inProcess?.count },
              { key: 'Paid', label: 'Paid', count: stats.paid?.count },
              { key: 'Failed', label: 'Failed', count: stats.failed?.count },
            ].map((t) => (
              <button key={t.key} type="button" onClick={() => setTabStatus(t.key)} className={`py-3 ${tabStatus === t.key ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>
                {t.label} ({t.count || 0})
              </button>
            ))}
          </div>
          <div className="p-4 flex gap-3 flex-wrap">
            <div className="flex-1 relative min-w-[200px]">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <AffiliateSelect className="w-36" value={statusFilter} onChange={setStatusFilter} options={[
              { value: 'all', label: 'Status: All' }, { value: 'Pending', label: 'Pending' },
              { value: 'In Process', label: 'In Process' }, { value: 'Paid', label: 'Paid' }, { value: 'Failed', label: 'Failed' },
            ]} />
            <AffiliateSelect className="w-44" value={payoutMethod} onChange={setPayoutMethod} options={[
              { value: 'all', label: 'Method: All' }, { value: 'Bank Transfer', label: 'Bank Transfer' },
              { value: 'UPI', label: 'UPI' }, { value: 'Manual', label: 'Manual' },
            ]} />
            <AffiliateSelect className="w-36" value={dateRange} onChange={setDateRange} options={DATE_RANGE_OPTIONS} />
            <button type="button" onClick={exportCsv} className="border rounded-lg px-3 py-2 text-sm">Export CSV</button>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="py-3 px-4">Affiliate</th><th className="py-3 px-4">Txn ID</th><th className="py-3 px-4">Method</th>
              <th className="py-3 px-4">Amount</th><th className="py-3 px-4">Status</th><th className="py-3 px-4">Requested</th><th className="py-3 px-4">Paid</th><th className="py-3 px-4">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-500">Loading...</td></tr>
              ) : payouts.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-500">No payouts found</td></tr>
              ) : payouts.map((p) => (
                <tr key={p._id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{p.affiliateId?.name || 'Unknown'}</td>
                  <td className="py-3 px-4">{p.transactionId || '—'}</td>
                  <td className="py-3 px-4">{p.payoutMethod}</td>
                  <td className="py-3 px-4 font-medium">{formatCurrency(p.amount)}</td>
                  <td className="py-3 px-4">{p.status}</td>
                  <td className="py-3 px-4">{formatDate(p.requestedAt)}</td>
                  <td className="py-3 px-4">{formatDate(p.processedAt)}</td>
                  <td className="py-3 px-4">
                    <button type="button" onClick={() => setViewPayout(p)} className="text-indigo-600 border border-indigo-200 rounded px-2 py-1 text-xs flex items-center gap-1"><Eye size={12}/> View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="w-72 space-y-4">
        <div className="border rounded-xl p-5">
          <h3 className="font-semibold mb-3">Payout Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Total</span><span>{formatCurrency(totalAll)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Paid</span><span className="text-green-600">{formatCurrency(stats.paid?.total)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Pending</span><span className="text-orange-600">{formatCurrency(stats.pending?.total)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">In Process</span><span className="text-blue-600">{formatCurrency(stats.inProcess?.total)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Failed</span><span className="text-red-600">{formatCurrency(stats.failed?.total)}</span></div>
          </div>
        </div>
        <div className="border rounded-xl p-5">
          <h3 className="font-semibold mb-3">Payout Methods</h3>
          {methodStats.length === 0 ? (
            <p className="text-sm text-gray-500">No paid payouts yet.</p>
          ) : methodStats.map((m) => (
            <div key={m._id} className="flex justify-between text-sm py-1">
              <span>{m._id || 'Other'}</span>
              <span>{methodTotal ? ((m.total / methodTotal) * 100).toFixed(1) : 0}%</span>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setManualOpen(true)} className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm flex items-center justify-center gap-2"><Plus size={16}/> Create Manual Payout</button>
        <div className="border rounded-xl p-5">
          <h3 className="font-semibold mb-3">Recent Failed</h3>
          {failedRecent.length === 0 ? (
            <p className="text-sm text-gray-500">No failed payouts.</p>
          ) : failedRecent.map((p) => (
            <div key={p._id} className="flex justify-between text-sm border-b py-2 last:border-0">
              <div><div className="font-medium">{p.affiliateId?.name}</div><div className="text-xs text-red-500">{p.failureReason || 'Failed'}</div></div>
              <div className="font-bold">{formatCurrency(p.amount)}</div>
            </div>
          ))}
        </div>
      </div>

      <SimpleModal open={!!viewPayout} title="Payout Details" onClose={() => setViewPayout(null)}>
        {viewPayout && (
          <div className="space-y-3 text-sm">
            <p><strong>Affiliate:</strong> {viewPayout.affiliateId?.name}</p>
            <p><strong>Amount:</strong> {formatCurrency(viewPayout.amount)}</p>
            <p><strong>Status:</strong> {viewPayout.status}</p>
            <p><strong>Method:</strong> {viewPayout.payoutMethod}</p>
            <p><strong>Source:</strong> {viewPayout.source === 'withdrawal' ? 'Customer withdrawal' : 'Admin payout'}</p>
            {viewPayout.status === 'Pending' && (
              <div className="flex gap-2">
                <button type="button" onClick={() => updateStatus(viewPayout, 'In Process')} className="flex-1 border rounded-lg py-2">Mark In Process</button>
                <button type="button" onClick={() => updateStatus(viewPayout, 'Paid')} className="flex-1 bg-green-600 text-white rounded-lg py-2">Mark Paid</button>
              </div>
            )}
            {viewPayout.status === 'In Process' && (
              <button type="button" onClick={() => updateStatus(viewPayout, 'Paid')} className="w-full bg-green-600 text-white rounded-lg py-2">Mark Paid</button>
            )}
            {(viewPayout.status === 'Pending' || viewPayout.status === 'In Process') && (
              <button type="button" onClick={() => {
                const reason = window.prompt('Failure reason:') || 'Payment failed';
                updateStatus(viewPayout, 'Failed', { failureReason: reason });
              }} className="w-full border border-red-200 text-red-600 rounded-lg py-2">Mark Failed</button>
            )}
          </div>
        )}
      </SimpleModal>

      <SimpleModal open={manualOpen} title="Create Manual Payout" onClose={() => setManualOpen(false)}>
        <div className="space-y-3">
          <select className="w-full border rounded-lg p-2 text-sm" value={manualForm.affiliateId} onChange={(e) => setManualForm({ ...manualForm, affiliateId: e.target.value })}>
            <option value="">Select affiliate</option>
            {affiliates.map((a) => (
              <option key={a._id} value={a._id}>{a.name} ({formatCurrency(a.affiliateBalance)})</option>
            ))}
          </select>
          <input type="number" className="w-full border rounded-lg p-2 text-sm" placeholder="Amount" value={manualForm.amount} onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })} />
          <select className="w-full border rounded-lg p-2 text-sm" value={manualForm.payoutMethod} onChange={(e) => setManualForm({ ...manualForm, payoutMethod: e.target.value })}>
            <option value="Manual">Manual</option><option value="Bank Transfer">Bank Transfer</option><option value="UPI">UPI</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={manualForm.markPending} onChange={(e) => setManualForm({ ...manualForm, markPending: e.target.checked })} />
            Create as pending request (reserve balance)
          </label>
          <button type="button" onClick={createManual} className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm">Create Payout</button>
        </div>
      </SimpleModal>
    </div>
  );
}
