import React from 'react';
import { ChevronDown } from 'lucide-react';
import Swal from 'sweetalert2';

export const formatCurrency = (value: number) =>
  `₹${(value || 0).toLocaleString('en-IN')}`;

export const formatDate = (value?: string | Date) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN');
};

type ToggleProps = {
  enabled: boolean;
  onChange: (value: boolean) => void;
  color?: string;
};

export const AffiliateToggle = ({ enabled, onChange, color = 'bg-indigo-600' }: ToggleProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    onClick={() => onChange(!enabled)}
    className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${enabled ? color : 'bg-gray-300'}`}
  >
    <div
      className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${
        enabled ? 'right-0.5' : 'left-0.5'
      }`}
    />
  </button>
);

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
};

export const AffiliateSelect = ({ value, onChange, options, className = '' }: SelectProps) => (
  <div className={`border border-gray-300 rounded-lg p-2 flex justify-between items-center text-sm ${className}`}>
    <select
      className="w-full bg-transparent outline-none cursor-pointer"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    <ChevronDown size={16} className="text-gray-400 pointer-events-none -ml-4" />
  </div>
);

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export const SimpleModal = ({ open, title, onClose, children }: ModalProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

export const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'year', label: 'This Year' },
];

export const getDateRangeParams = (range: string) => {
  if (range === 'all') return {};
  const now = new Date();
  const from = new Date();
  if (range === '7d') from.setDate(now.getDate() - 7);
  else if (range === '30d') from.setDate(now.getDate() - 30);
  else if (range === '90d') from.setDate(now.getDate() - 90);
  else if (range === 'year') from.setMonth(0, 1);
  return {
    dateFrom: from.toISOString().split('T')[0],
    dateTo: now.toISOString().split('T')[0],
  };
};

export const PAYOUT_DAYS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
].map((d) => ({ value: d, label: d }));

export const PAYOUT_TIMES = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM',
].map((t) => ({ value: t, label: t }));

export const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
];

export const COOKIE_DURATION_OPTIONS = [
  { value: '7', label: '7 Days' },
  { value: '14', label: '14 Days' },
  { value: '30', label: '30 Days' },
  { value: '60', label: '60 Days' },
  { value: '90', label: '90 Days' },
];

export const MEMBERSHIP_TYPE_OPTIONS = [
  { value: 'all', label: 'All Membership' },
  { value: 'pro', label: 'Pro' },
  { value: 'premium', label: 'Premium' },
  { value: 'special', label: 'Special' },
  { value: 'junior', label: 'Junior' },
  { value: 'general', label: 'General' },
];

export const notifyAffiliate = (message: string, type: 'success' | 'error' = 'success') => {
  if (type === 'error') {
    console.error(message);
    Swal.fire({
      title: 'Error',
      text: message,
      icon: 'error'
    });
  } else {
    Swal.fire({
      title: 'Success',
      text: message,
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
  }
};

export const runAffiliateAction = async (action: () => Promise<void>, successMessage?: string, confirmMessage?: string) => {
  if (confirmMessage) {
    const result = await Swal.fire({
      title: 'Confirm',
      text: confirmMessage,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes'
    });
    if (!result.isConfirmed) return;
  }
  try {
    await action();
    if (successMessage) notifyAffiliate(successMessage, 'success');
  } catch (error: any) {
    const message = error?.response?.data?.message || error?.message || 'Something went wrong';
    notifyAffiliate(message, 'error');
    throw error;
  }
};
