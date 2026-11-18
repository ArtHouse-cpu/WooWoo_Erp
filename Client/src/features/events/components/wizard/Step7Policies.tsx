import { Shield, FileText, AlertTriangle, UserCheck } from "lucide-react";
import type { EventItem, EventPolicies } from "../../types/eventTypes";

interface Step7PoliciesProps {
  event: EventItem;
  onChange: (updates: Partial<EventItem>) => void;
}

export const Step7Policies = ({ event, onChange }: Step7PoliciesProps) => {
  const policies = event.policies;

  const handleUpdate = (updates: Partial<EventPolicies>) => {
    onChange({
      policies: {
        ...policies,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
          Event Governance, Entry & Legal Policies
        </h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Ensure transparency with clear refund thresholds, entry eligibility, age limits, and venue rules.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 text-xs">
          {/* Refund Policy */}
          <div className="sm:col-span-2 rounded-xl border border-gray-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-gray-900 dark:text-white">
                Refund Policy Details
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">Standard Refund:</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={policies.refundPercentage}
                  onChange={(e) =>
                    handleUpdate({ refundPercentage: parseInt(e.target.value) || 0 })
                  }
                  className="w-14 rounded border border-gray-200 p-1 text-center font-bold dark:bg-slate-800"
                />
                <span className="font-bold">%</span>
              </div>
            </div>
            <textarea
              rows={3}
              value={policies.refundPolicy}
              onChange={(e) => handleUpdate({ refundPolicy: e.target.value })}
              className="w-full rounded-lg border border-gray-200 p-2.5 dark:bg-slate-800"
            />
          </div>

          {/* Cancellation Policy */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300">
              Cancellation Policy
            </label>
            <textarea
              rows={3}
              value={policies.cancellationPolicy}
              onChange={(e) => handleUpdate({ cancellationPolicy: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 dark:bg-slate-800"
            />
          </div>

          {/* Transfer Ticket Policy */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300">
              Ticket Transferability Policy
            </label>
            <textarea
              rows={3}
              value={policies.transferPolicy}
              onChange={(e) => handleUpdate({ transferPolicy: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 dark:bg-slate-800"
            />
          </div>

          {/* Age Restrictions */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300">
              Age Restrictions
            </label>
            <select
              value={policies.ageRestriction}
              onChange={(e) => handleUpdate({ ageRestriction: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800"
            >
              <option value="All Ages Welcome">All Ages Welcome</option>
              <option value="18+ Only (Government ID Required)">18+ Only</option>
              <option value="21+ Only (Age-restricted event)">21+ Only</option>
              <option value="Kids under 12 free with adult">Kids under 12 free</option>
            </select>
          </div>

          {/* Rescheduling Policy */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300">
              Rescheduling & Force Majeure Policy
            </label>
            <input
              type="text"
              value={policies.reschedulingPolicy}
              onChange={(e) => handleUpdate({ reschedulingPolicy: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800"
            />
          </div>

          {/* Entry Rules */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300">
              Gate Entry & Security Rules
            </label>
            <textarea
              rows={3}
              value={policies.entryRules}
              onChange={(e) => handleUpdate({ entryRules: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 dark:bg-slate-800"
              placeholder="e.g. Valid government photo ID mandatory. Outside food & beverages not permitted."
            />
          </div>

          {/* Check-in Rules */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300">
              Check-in & Re-entry Rules
            </label>
            <textarea
              rows={3}
              value={policies.checkInRules}
              onChange={(e) => handleUpdate({ checkInRules: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 dark:bg-slate-800"
              placeholder="e.g. Re-entry allowed only with valid RFID / QR wristband issued at main gate."
            />
          </div>

          {/* Terms and Conditions */}
          <div className="sm:col-span-2">
            <label className="block font-semibold text-gray-700 dark:text-gray-300">
              Full Terms & Conditions
            </label>
            <textarea
              rows={4}
              value={policies.termsAndConditions}
              onChange={(e) => handleUpdate({ termsAndConditions: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 dark:bg-slate-800"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
