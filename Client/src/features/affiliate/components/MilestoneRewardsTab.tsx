import React, { useState } from 'react';
import { Trophy, Gift, Wallet, Users, Activity } from 'lucide-react';
import { AffiliateToggle, AffiliateSelect, SimpleModal, formatCurrency } from './affiliateShared';

type Props = {
  settings: any;
  handleSave: (payload: any) => Promise<void>;
};

export default function MilestoneRewardsTab({ settings, handleSave }: Props) {
  const milestones = settings?.milestones || [];
  const milestoneSettings = settings?.milestoneSettings || {};
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<any>({});

  const filtered = milestones.filter((m: any) => {
    if (filter === 'active') return m.status === 'active';
    if (filter === 'inactive') return m.status !== 'active';
    return true;
  });

  const saveMilestones = async (next: any[]) => {
    await handleSave({ milestones: next });
  };

  const saveMilestoneSettings = async (patch: any) => {
    await handleSave({ milestoneSettings: { ...milestoneSettings, ...patch } });
  };

  const openAdd = () => {
    setEditIndex(null);
    setDraft({ revenueAmount: 0, rewardAmount: 0, rewardType: 'cash', additionalBenefits: [], status: 'active' });
    setModalOpen(true);
  };

  const openEdit = (index: number) => {
    setEditIndex(index);
    setDraft({ ...milestones[index], additionalBenefits: milestones[index].additionalBenefits?.join(', ') || '' });
    setModalOpen(true);
  };

  const submit = async () => {
    const item = {
      ...draft,
      revenueAmount: Number(draft.revenueAmount),
      rewardAmount: Number(draft.rewardAmount),
      additionalBenefits: typeof draft.additionalBenefits === 'string'
        ? draft.additionalBenefits.split(',').map((s: string) => s.trim()).filter(Boolean)
        : draft.additionalBenefits || [],
    };
    const next = [...milestones];
    if (editIndex !== null) next[editIndex] = item;
    else next.push(item);
    await saveMilestones(next);
    setModalOpen(false);
  };

  const remove = async (index: number) => {
    if (!window.confirm('Delete this milestone?')) return;
    await saveMilestones(milestones.filter((_: any, i: number) => i !== index));
  };

  const exportCsv = () => {
    const header = 'Revenue,Reward,Type,Status\n';
    const rows = milestones.map((m: any) => `${m.revenueAmount},${m.rewardAmount},${m.rewardType},${m.status}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'milestones.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Milestone Rewards</h3>
          <p className="text-sm text-gray-500">Set milestone based rewards for affiliates.</p>
        </div>
        <button type="button" onClick={openAdd} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium">+ Add Milestone</button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="border rounded-xl p-4 bg-indigo-50/30"><Trophy size={16} className="text-indigo-600 mb-2" /><h2 className="text-2xl font-bold">{milestones.length}</h2><p className="text-xs text-gray-500">Total milestones</p></div>
        <div className="border rounded-xl p-4 bg-green-50/30"><Gift size={16} className="text-green-600 mb-2" /><h2 className="text-2xl font-bold">{formatCurrency(milestones.reduce((a: number, m: any) => a + (m.rewardAmount || 0), 0))}</h2><p className="text-xs text-gray-500">Rewards budget</p></div>
        <div className="border rounded-xl p-4"><Wallet size={16} className="text-purple-600 mb-2" /><h2 className="text-2xl font-bold">{formatCurrency(0)}</h2><p className="text-xs text-gray-500">Distributed</p></div>
        <div className="border rounded-xl p-4"><Users size={16} className="text-blue-600 mb-2" /><h2 className="text-2xl font-bold">0</h2><p className="text-xs text-gray-500">Affiliates achieved</p></div>
        <div className="border rounded-xl p-4"><Activity size={16} className="text-orange-600 mb-2" /><h2 className="text-2xl font-bold">{formatCurrency(0)}</h2><p className="text-xs text-gray-500">Next payout</p></div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 border rounded-xl bg-white overflow-hidden">
          <div className="flex justify-between p-4 border-b">
            <div className="flex gap-4 text-sm font-medium">
              {(['all', 'active', 'inactive'] as const).map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} className={filter === f ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1 capitalize' : 'text-gray-500 capitalize'}>
                  {f} ({f === 'all' ? milestones.length : milestones.filter((m: any) => (f === 'active' ? m.status === 'active' : m.status !== 'active')).length})
                </button>
              ))}
            </div>
            <button type="button" onClick={exportCsv} className="text-sm border rounded-lg px-3 py-1">Export CSV</button>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="py-3 px-4">Revenue (₹)</th><th className="py-3 px-4">Reward (₹)</th><th className="py-3 px-4">Type</th><th className="py-3 px-4">Status</th><th className="py-3 px-4">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-gray-500">No milestones found.</td></tr>
              ) : filtered.map((m: any, i: number) => {
                const realIndex = milestones.indexOf(m);
                return (
                  <tr key={realIndex} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{m.revenueAmount}</td>
                    <td className="py-3 px-4">{m.rewardAmount}</td>
                    <td className="py-3 px-4 capitalize">{m.rewardType}</td>
                    <td className="py-3 px-4 capitalize">{m.status}</td>
                    <td className="py-3 px-4 flex gap-2">
                      <button type="button" onClick={() => openEdit(realIndex)} className="text-indigo-600">Edit</button>
                      <button type="button" onClick={() => remove(realIndex)} className="text-red-600">Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="w-80 border rounded-xl bg-white p-5 space-y-4">
          <h3 className="font-semibold">Milestone Settings</h3>
          <div className="flex justify-between items-center">
            <span className="text-sm">Auto Credit Reward</span>
            <AffiliateToggle enabled={milestoneSettings.autoCreditReward !== false} onChange={(v) => saveMilestoneSettings({ autoCreditReward: v })} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Include Cancelled Orders</span>
            <AffiliateToggle enabled={!!milestoneSettings.includeCancelledOrders} onChange={(v) => saveMilestoneSettings({ includeCancelledOrders: v })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Achievement Window</label>
            <AffiliateSelect
              value={milestoneSettings.achievementWindow || 'lifetime'}
              onChange={(v) => saveMilestoneSettings({ achievementWindow: v })}
              options={[
                { value: 'lifetime', label: 'Lifetime' },
                { value: 'yearly', label: 'Yearly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
            />
          </div>
        </div>
      </div>

      <SimpleModal open={modalOpen} title={editIndex !== null ? 'Edit Milestone' : 'Add Milestone'} onClose={() => setModalOpen(false)}>
        <div className="space-y-3">
          <input type="number" className="w-full border rounded-lg p-2 text-sm" placeholder="Revenue amount" value={draft.revenueAmount ?? ''} onChange={(e) => setDraft({ ...draft, revenueAmount: e.target.value })} />
          <input type="number" className="w-full border rounded-lg p-2 text-sm" placeholder="Reward amount" value={draft.rewardAmount ?? ''} onChange={(e) => setDraft({ ...draft, rewardAmount: e.target.value })} />
          <select className="w-full border rounded-lg p-2 text-sm" value={draft.rewardType || 'cash'} onChange={(e) => setDraft({ ...draft, rewardType: e.target.value })}>
            <option value="cash">Cash</option><option value="credit">Credit</option>
          </select>
          <input className="w-full border rounded-lg p-2 text-sm" placeholder="Benefits (comma separated)" value={draft.additionalBenefits ?? ''} onChange={(e) => setDraft({ ...draft, additionalBenefits: e.target.value })} />
          <select className="w-full border rounded-lg p-2 text-sm" value={draft.status || 'active'} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
            <option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
          <button type="button" onClick={submit} className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm">Save</button>
        </div>
      </SimpleModal>
    </div>
  );
}
