import { useState } from "react";
import {
  Mail,
  Send,
  Eye,
  CheckCircle2,
  Copy,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { toast } from "react-toastify";
import type { EventItem, NotificationSettings } from "../../types/eventTypes";

interface Step6EmailsProps {
  event: EventItem;
  onChange: (updates: Partial<EventItem>) => void;
}

const DYNAMIC_VARIABLES = [
  { tag: "{{attendee_name}}", desc: "Attendee Full Name" },
  { tag: "{{event_name}}", desc: "Event Title" },
  { tag: "{{event_date}}", desc: "Event Date(s)" },
  { tag: "{{venue}}", desc: "Venue & Address" },
  { tag: "{{ticket_type}}", desc: "Category e.g. VIP Pass" },
  { tag: "{{pass_code}}", desc: "Unique Pass ID e.g. EVT-9824" },
  { tag: "{{ticket_url}}", desc: "Direct Digital Pass Link" },
];

export const Step6Emails = ({ event, onChange }: Step6EmailsProps) => {
  const notifs = event.notifications;
  const [activeTab, setActiveTab] = useState<"guest" | "admin" | "messages">("guest");
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleUpdate = (updates: Partial<NotificationSettings>) => {
    onChange({
      notifications: {
        ...notifs,
        ...updates,
      },
    });
  };

  const copyVariable = (tag: string) => {
    navigator.clipboard.writeText(tag);
    toast.success(`Copied ${tag} to clipboard`);
  };

  // Preview rendered text
  const renderedTicketBody = notifs.ticketEmailTemplate
    .replace(/{{attendee_name}}/g, "Rahul Sharma")
    .replace(/{{event_name}}/g, event.name || "TechSummit 2026")
    .replace(/{{event_date}}/g, event.startDate || "10 Dec 2026")
    .replace(/{{venue}}/g, event.venueName || "Convention Hall, Mumbai")
    .replace(/{{ticket_type}}/g, event.tickets[0]?.name || "VIP Pass")
    .replace(/{{pass_code}}/g, "TSH-9821")
    .replace(/{{ticket_url}}/g, "https://woowoo.co.in/tickets/TSH-9821");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Emails, Reminders & System Messages
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Configure automated notifications for event guests, internal admin alerts, and on-screen messages.
            </p>
          </div>

          {/* Subtabs */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-slate-800 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("guest")}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                activeTab === "guest"
                  ? "bg-white text-orange-600 shadow-xs dark:bg-slate-700 dark:text-orange-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Guest Emails
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                activeTab === "admin"
                  ? "bg-white text-orange-600 shadow-xs dark:bg-slate-700 dark:text-orange-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Admin Alerts
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("messages")}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                activeTab === "messages"
                  ? "bg-white text-orange-600 shadow-xs dark:bg-slate-700 dark:text-orange-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Screen Messages
            </button>
          </div>
        </div>

        {/* Dynamic variables quick-copy strip */}
        <div className="mt-4 rounded-lg bg-orange-50/70 p-3 text-xs dark:bg-orange-950/30">
          <span className="font-bold text-orange-800 dark:text-orange-300">
            Dynamic Variable Tags (Click to copy):
          </span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {DYNAMIC_VARIABLES.map((v) => (
              <button
                key={v.tag}
                type="button"
                onClick={() => copyVariable(v.tag)}
                className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-orange-700 shadow-2xs hover:bg-orange-100 dark:bg-slate-800 dark:text-orange-300"
                title={v.desc}
              >
                <Copy size={11} />
                {v.tag}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: GUEST EMAILS */}
        {activeTab === "guest" && (
          <div className="mt-5 space-y-5 text-xs">
            {/* Confirmation Email */}
            <div className="rounded-xl border border-gray-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-orange-600" />
                  <span className="font-bold text-gray-900 dark:text-white">
                    1. Ticket & Confirmation Email
                  </span>
                </div>
                <label className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifs.guestSendTicketConfirmation}
                    onChange={(e) =>
                      handleUpdate({ guestSendTicketConfirmation: e.target.checked })
                    }
                  />
                  Send Automatically
                </label>
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={notifs.ticketEmailSubject}
                  onChange={(e) => handleUpdate({ ticketEmailSubject: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div className="mt-3">
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Email Body Template
                </label>
                <textarea
                  rows={5}
                  value={notifs.ticketEmailTemplate}
                  onChange={(e) => handleUpdate({ ticketEmailTemplate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 font-mono text-xs dark:bg-slate-800"
                />
              </div>

              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(!previewOpen)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline"
                >
                  <Eye size={13} /> {previewOpen ? "Hide Preview" : "Preview Live Email"}
                </button>
              </div>

              {previewOpen && (
                <div className="mt-3 rounded-lg border border-gray-300 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/80">
                  <p className="font-bold text-gray-800 dark:text-gray-200 mb-1">
                    Subject: {notifs.ticketEmailSubject.replace(/{{event_name}}/g, event.name || "TechSummit 2026")}
                  </p>
                  <hr className="my-2 border-gray-200 dark:border-slate-700" />
                  <pre className="whitespace-pre-wrap font-sans text-xs text-gray-700 dark:text-gray-300">
                    {renderedTicketBody}
                  </pre>
                </div>
              )}
            </div>

            {/* Reminder Email */}
            <div className="rounded-xl border border-gray-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-orange-600" />
                  <span className="font-bold text-gray-900 dark:text-white">
                    2. Event Reminder Email
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500">Send:</span>
                  <input
                    type="number"
                    value={notifs.guestReminderHoursBefore}
                    onChange={(e) =>
                      handleUpdate({
                        guestReminderHoursBefore: parseInt(e.target.value) || 24,
                      })
                    }
                    className="w-14 rounded border border-gray-200 p-1 text-center font-bold dark:bg-slate-800"
                  />
                  <span className="text-[11px] text-gray-500">hours before kickoff</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Reminder Subject
                </label>
                <input
                  type="text"
                  value={notifs.reminderEmailSubject}
                  onChange={(e) => handleUpdate({ reminderEmailSubject: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div className="mt-3">
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Reminder Body
                </label>
                <textarea
                  rows={3}
                  value={notifs.reminderEmailTemplate}
                  onChange={(e) =>
                    handleUpdate({ reminderEmailTemplate: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 font-mono text-xs dark:bg-slate-800"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ADMIN NOTIFICATIONS */}
        {activeTab === "admin" && (
          <div className="mt-5 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300">
                Admin Notification Email Address
              </label>
              <input
                type="email"
                value={notifs.adminEmail}
                onChange={(e) => handleUpdate({ adminEmail: e.target.value })}
                className="mt-1 w-full max-w-md rounded-lg border border-gray-200 p-2 dark:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 cursor-pointer dark:border-slate-800">
                <input
                  type="checkbox"
                  checked={notifs.adminNotifyOnRegistration}
                  onChange={(e) =>
                    handleUpdate({ adminNotifyOnRegistration: e.target.checked })
                  }
                />
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  Email me on each New Registration
                </span>
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 cursor-pointer dark:border-slate-800">
                <input
                  type="checkbox"
                  checked={notifs.adminNotifyOnPayment}
                  onChange={(e) =>
                    handleUpdate({ adminNotifyOnPayment: e.target.checked })
                  }
                />
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  Email me on Successful Payment Capture
                </span>
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 cursor-pointer dark:border-slate-800">
                <input
                  type="checkbox"
                  checked={notifs.adminNotifyOnCancellation}
                  onChange={(e) =>
                    handleUpdate({ adminNotifyOnCancellation: e.target.checked })
                  }
                />
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  Email me on Attendee Cancellation Request
                </span>
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 cursor-pointer dark:border-slate-800">
                <input
                  type="checkbox"
                  checked={notifs.adminDailySummary}
                  onChange={(e) =>
                    handleUpdate({ adminDailySummary: e.target.checked })
                  }
                />
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  Daily Morning Digest & Ticket Sales Summary
                </span>
              </label>
            </div>
          </div>
        )}

        {/* TAB 3: SCREEN MESSAGES */}
        {activeTab === "messages" && (
          <div className="mt-5 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300">
                Tickets Unavailable / Sold Out Message
              </label>
              <input
                type="text"
                value={notifs.msgTicketsUnavailable}
                onChange={(e) =>
                  handleUpdate({ msgTicketsUnavailable: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300">
                Registration Closed Message
              </label>
              <input
                type="text"
                value={notifs.msgRegistrationClosed}
                onChange={(e) =>
                  handleUpdate({ msgRegistrationClosed: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300">
                Registration Successful Message
              </label>
              <input
                type="text"
                value={notifs.msgRegistrationSuccess}
                onChange={(e) =>
                  handleUpdate({ msgRegistrationSuccess: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300">
                Payment Failed Message
              </label>
              <input
                type="text"
                value={notifs.msgPaymentFailed}
                onChange={(e) => handleUpdate({ msgPaymentFailed: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
