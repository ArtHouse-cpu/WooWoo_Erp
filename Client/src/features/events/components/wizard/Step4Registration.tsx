import {
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  UserX,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import type { EventItem, RegistrationSettings } from "../../types/eventTypes";

interface Step4RegistrationProps {
  event: EventItem;
  onChange: (updates: Partial<EventItem>) => void;
}

export const Step4Registration = ({ event, onChange }: Step4RegistrationProps) => {
  const settings = event.registrationSettings;

  const handleUpdate = (updates: Partial<RegistrationSettings>) => {
    onChange({
      registrationSettings: {
        ...settings,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
          Registration Lifecycle & Capacity Settings
        </h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Control when ticket bookings start and stop, capacity thresholds, approval queues, and cancellation rules.
        </p>

        {/* Master Registration Toggle */}
        <div className="mt-5 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white">
              Enable Ticket Registrations
            </h4>
            <p className="text-[11px] text-gray-500">
              When disabled, attendees see "Registrations are currently paused or closed".
            </p>
          </div>

          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => handleUpdate({ enabled: e.target.checked })}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-orange-600 peer-focus:outline-hidden after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full dark:bg-slate-700" />
          </label>
        </div>

        {/* Date Cutoffs */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Registration Opening Date
            </label>
            <input
              type="date"
              value={settings.openingDate}
              onChange={(e) => handleUpdate({ openingDate: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Registration Closing Date
            </label>
            <input
              type="date"
              value={settings.closingDate}
              onChange={(e) => handleUpdate({ closingDate: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Maximum Overall Registrations (Cap)
            </label>
            <input
              type="number"
              value={settings.maxRegistrations}
              onChange={(e) =>
                handleUpdate({ maxRegistrations: parseInt(e.target.value) || 0 })
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Max Tickets Per Order
            </label>
            <input
              type="number"
              value={settings.maxTicketsPerOrder}
              onChange={(e) =>
                handleUpdate({ maxTicketsPerOrder: parseInt(e.target.value) || 1 })
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>

        {/* Registration Flags Grid */}
        <div className="mt-6 border-t border-gray-100 pt-5 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3">
            Policy & Workflow Rules
          </h4>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Guest Registration */}
            <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-slate-800">
              <input
                type="checkbox"
                id="guest_reg"
                checked={settings.allowGuestRegistration}
                onChange={(e) =>
                  handleUpdate({ allowGuestRegistration: e.target.checked })
                }
                className="mt-0.5 rounded text-orange-600"
              />
              <label htmlFor="guest_reg" className="text-xs cursor-pointer">
                <span className="font-bold text-gray-900 dark:text-white block">
                  Allow Guest Registration
                </span>
                <span className="text-gray-500 text-[11px]">
                  Attendees can complete checkout without needing an account login first.
                </span>
              </label>
            </div>

            {/* Approval Required */}
            <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-slate-800">
              <input
                type="checkbox"
                id="approval_req"
                checked={settings.approvalRequired}
                onChange={(e) =>
                  handleUpdate({ approvalRequired: e.target.checked })
                }
                className="mt-0.5 rounded text-orange-600"
              />
              <label htmlFor="approval_req" className="text-xs cursor-pointer">
                <span className="font-bold text-gray-900 dark:text-white block">
                  Registration Approval Required
                </span>
                <span className="text-gray-500 text-[11px]">
                  Admins must manually approve each registration before ticket pass is generated.
                </span>
              </label>
            </div>

            {/* Waitlist */}
            <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-slate-800">
              <input
                type="checkbox"
                id="waitlist_enable"
                checked={settings.enableWaitlist}
                onChange={(e) =>
                  handleUpdate({ enableWaitlist: e.target.checked })
                }
                className="mt-0.5 rounded text-orange-600"
              />
              <label htmlFor="waitlist_enable" className="text-xs cursor-pointer">
                <span className="font-bold text-gray-900 dark:text-white block">
                  Automatic Waiting List
                </span>
                <span className="text-gray-500 text-[11px]">
                  Allow customers to join a waiting list once ticket capacity is reached.
                </span>
              </label>
            </div>

            {/* Duplicate Prevention */}
            <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-slate-800">
              <input
                type="checkbox"
                id="duplicate_prev"
                checked={settings.preventDuplicateByEmail}
                onChange={(e) =>
                  handleUpdate({
                    preventDuplicateByEmail: e.target.checked,
                    preventDuplicateByPhone: e.target.checked,
                  })
                }
                className="mt-0.5 rounded text-orange-600"
              />
              <label htmlFor="duplicate_prev" className="text-xs cursor-pointer">
                <span className="font-bold text-gray-900 dark:text-white block">
                  Prevent Duplicate Registrations
                </span>
                <span className="text-gray-500 text-[11px]">
                  Block multiple bookings under the exact same email or mobile number.
                </span>
              </label>
            </div>

            {/* Cancellation allowed & deadline */}
            <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 sm:col-span-2 dark:border-slate-800">
              <input
                type="checkbox"
                id="allow_cancel"
                checked={settings.allowCancellation}
                onChange={(e) =>
                  handleUpdate({ allowCancellation: e.target.checked })
                }
                className="mt-0.5 rounded text-orange-600"
              />
              <div className="flex-1">
                <label htmlFor="allow_cancel" className="text-xs cursor-pointer">
                  <span className="font-bold text-gray-900 dark:text-white block">
                    Allow Attendee Self-Service Cancellation
                  </span>
                  <span className="text-gray-500 text-[11px]">
                    Attendees can request cancellation from their confirmation email.
                  </span>
                </label>

                {settings.allowCancellation && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="text-gray-600 dark:text-gray-400">
                      Cancellation Deadline:
                    </span>
                    <input
                      type="number"
                      value={settings.cancellationDeadlineHours}
                      onChange={(e) =>
                        handleUpdate({
                          cancellationDeadlineHours: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-20 rounded border border-gray-200 p-1 text-xs dark:bg-slate-800 font-bold"
                    />
                    <span className="text-gray-500">hours before event starts</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
