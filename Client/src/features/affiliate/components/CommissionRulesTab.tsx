import React, { useState } from 'react';
import { Users, Gift, Calendar, Activity, HelpCircle } from 'lucide-react';
import { AffiliateToggle, SimpleModal } from '../components/affiliateShared';

const CATEGORIES = [
  { key: 'membership', label: 'Membership', icon: Users },
  { key: 'product', label: 'Store Supplies', icon: Gift },
  { key: 'space', label: 'Space Booking', icon: Calendar },
  { key: 'service', label: 'Services', icon: Activity },
  { key: 'food', label: 'Food Orders', icon: Gift },
];

type Props = {
  settings: any;
  handleSave: (payload: any) => Promise<void>;
};

export default function CommissionRulesTab({ settings, handleSave }: Props) {
  const rules = settings?.rules || [];
  const [editingRule, setEditingRule] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<any>({});

  const getRule = (category: string) => rules.find((r: any) => r.category === category) || {};

  const saveRules = async (nextRules: any[]) => {
    await handleSave({ rules: nextRules });
  };

  const toggleRule = async (category: string) => {
    const rule = getRule(category);
    const next = rules.map((r: any) =>
      r.category === category ? { ...r, enabled: !rule.enabled } : r,
    );
    if (!rules.find((r: any) => r.category === category)) {
      next.push({ category, enabled: true, commissionType: 'percentage', commissionValue: 0, minOrderAmount: 0 });
    }
    await saveRules(next);
  };

  const openEdit = (category: string) => {
    const rule = getRule(category);
    setDraft({
      category,
      label: rule.label || category,
      enabled: rule.enabled ?? true,
      commissionType: rule.commissionType || 'percentage',
      commissionValue: rule.commissionValue ?? 0,
      minOrderAmount: rule.minOrderAmount ?? 0,
      maxCommissionAmount: rule.maxCommissionAmount ?? '',
    });
    setEditingRule(category);
  };

  const submitEdit = async () => {
    const updated = {
      ...draft,
      maxCommissionAmount: draft.maxCommissionAmount === '' ? null : Number(draft.maxCommissionAmount),
      commissionValue: Number(draft.commissionValue),
      minOrderAmount: Number(draft.minOrderAmount),
    };
    const exists = rules.some((r: any) => r.category === draft.category);
    const next = exists
      ? rules.map((r: any) => (r.category === draft.category ? { ...r, ...updated } : r))
      : [...rules, updated];
    await saveRules(next);
    setEditingRule(null);
    setShowAdd(false);
  };

  const deleteRule = async (category: string) => {
    if (!window.confirm('Remove this commission rule?')) return;
    await saveRules(rules.filter((r: any) => r.category !== category));
  };

const CARD_STYLES: Record<string, { border: string; bg: string; iconBg: string; iconText: string; toggle: string }> = {
  membership: { border: 'border-indigo-100', bg: 'bg-indigo-50/30', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600', toggle: 'bg-indigo-600' },
  product: { border: 'border-green-100', bg: 'bg-green-50/30', iconBg: 'bg-green-100', iconText: 'text-green-600', toggle: 'bg-green-600' },
  space: { border: 'border-orange-100', bg: 'bg-orange-50/30', iconBg: 'bg-orange-100', iconText: 'text-orange-600', toggle: 'bg-orange-600' },
  service: { border: 'border-blue-100', bg: 'bg-blue-50/30', iconBg: 'bg-blue-100', iconText: 'text-blue-600', toggle: 'bg-blue-600' },
  food: { border: 'border-red-100', bg: 'bg-red-50/30', iconBg: 'bg-red-100', iconText: 'text-red-600', toggle: 'bg-red-600' },
};

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            Commission Rules (Segment Wise)
            <HelpCircle size={16} className="text-gray-400" />
          </h3>
          <p className="text-sm text-gray-500">Set commission percentage or fixed amount for each segment.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDraft({ category: 'other', label: '', enabled: true, commissionType: 'percentage', commissionValue: 0, minOrderAmount: 0, maxCommissionAmount: '' });
            setShowAdd(true);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 font-medium hover:bg-indigo-700"
        >
          <span className="text-xl leading-none">+</span> Add New Rule
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {CATEGORIES.map(({ key, label, icon: Icon }) => {
          const rule = getRule(key);
          const style = CARD_STYLES[key];
          return (
            <div key={key} className={`border ${style.border} ${style.bg} rounded-xl p-4`}>
              <div className="flex gap-3 mb-4">
                <div className={`w-10 h-10 ${style.iconBg} rounded-lg flex items-center justify-center ${style.iconText}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">{label}</h4>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {rule.commissionType === 'fixed' ? '₹' : ''}
                {rule.commissionValue || 0}
                {rule.commissionType === 'percentage' ? '%' : ''}
              </h2>
              <div className="flex justify-between items-center mt-auto">
                <div className="flex items-center gap-2">
                  <AffiliateToggle enabled={!!rule.enabled} onChange={() => toggleRule(key)} color={style.toggle} />
                  <span className="text-sm font-medium text-gray-700">{rule.enabled ? 'Active' : 'Inactive'}</span>
                </div>
                <button type="button" onClick={() => openEdit(key)} className="text-indigo-600 text-sm font-medium">
                  Edit Rule
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
            <tr>
              <th className="py-3 px-5">Segment</th>
              <th className="py-3 px-5">Min. Order (₹)</th>
              <th className="py-3 px-5">Max. Commission (₹)</th>
              <th className="py-3 px-5">Status</th>
              <th className="py-3 px-5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {rules.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-500">No commission rules configured.</td></tr>
            ) : rules.map((rule: any) => (
              <tr key={rule.category} className="hover:bg-gray-50">
                <td className="py-3 px-5 capitalize">{rule.category}</td>
                <td className="py-3 px-5">{rule.minOrderAmount || 0}</td>
                <td className="py-3 px-5">{rule.maxCommissionAmount ?? 'No Limit'}</td>
                <td className={`py-3 px-5 font-medium ${rule.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                  {rule.enabled ? 'Active' : 'Inactive'}
                </td>
                <td className="py-3 px-5 flex gap-2">
                  <button type="button" onClick={() => openEdit(rule.category)} className="text-indigo-600 hover:underline">Edit</button>
                  <button type="button" onClick={() => deleteRule(rule.category)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SimpleModal open={!!editingRule || showAdd} title={showAdd ? 'Add Rule' : 'Edit Rule'} onClose={() => { setEditingRule(null); setShowAdd(false); }}>
        <div className="space-y-3">
          {showAdd && (
            <input className="w-full border rounded-lg p-2 text-sm" placeholder="Category (e.g. other)" value={draft.category || ''} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
          )}
          <input className="w-full border rounded-lg p-2 text-sm" placeholder="Label" value={draft.label || ''} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          <select className="w-full border rounded-lg p-2 text-sm" value={draft.commissionType || 'percentage'} onChange={(e) => setDraft({ ...draft, commissionType: e.target.value })}>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed Amount</option>
          </select>
          <input type="number" className="w-full border rounded-lg p-2 text-sm" placeholder="Commission value" value={draft.commissionValue ?? ''} onChange={(e) => setDraft({ ...draft, commissionValue: e.target.value })} />
          <input type="number" className="w-full border rounded-lg p-2 text-sm" placeholder="Min order amount" value={draft.minOrderAmount ?? ''} onChange={(e) => setDraft({ ...draft, minOrderAmount: e.target.value })} />
          <input type="number" className="w-full border rounded-lg p-2 text-sm" placeholder="Max commission (empty = no limit)" value={draft.maxCommissionAmount ?? ''} onChange={(e) => setDraft({ ...draft, maxCommissionAmount: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
            Active
          </label>
          <button type="button" onClick={submitEdit} className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium">Save Rule</button>
        </div>
      </SimpleModal>
    </div>
  );
}
