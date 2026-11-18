import { useState, useEffect } from "react";
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Eye,
  Save,
  Send,
  Sparkles,
  Info,
  Ticket,
  FormInput,
  Settings,
  QrCode,
  Mail,
  Shield,
  CreditCard,
  Layers,
} from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import type { EventItem } from "../../types/eventTypes";
import { useEventStore } from "../../store/eventStore";
import { createBlankEvent } from "../../utils/eventHelpers";
import { Step1General } from "./Step1General";
import { Step2Tickets } from "./Step2Tickets";
import { Step3CheckoutForm } from "./Step3CheckoutForm";
import { Step4Registration } from "./Step4Registration";
import { Step5TicketDesign } from "./Step5TicketDesign";
import { Step6Emails } from "./Step6Emails";
import { Step7Policies } from "./Step7Policies";
import { Step8Invoices } from "./Step8Invoices";
import { Step9Features } from "./Step9Features";
import { EventPreviewModal } from "../EventPreviewModal";

interface CreateEventWizardProps {
  isOpen: boolean;
  onClose: () => void;
  initialEvent?: EventItem | null;
}

interface StepItem {
  id: number;
  title: string;
  subtitle: string;
  icon: typeof Info;
}

const STEPS: StepItem[] = [
  { id: 1, title: "General Information", subtitle: "Name, date, time & venue", icon: Info },
  { id: 2, title: "Tickets & Seating Map", subtitle: "Pricing, tiers & seats", icon: Ticket },
  { id: 3, title: "Checkout Form", subtitle: "Custom registration fields", icon: FormInput },
  { id: 4, title: "Registration Settings", subtitle: "Capacity & approvals", icon: Settings },
  { id: 5, title: "Ticket Settings", subtitle: "Pass design & QR codes", icon: QrCode },
  { id: 6, title: "Emails & Notifications", subtitle: "Guest emails & alerts", icon: Mail },
  { id: 7, title: "Event Policies", subtitle: "Refunds, entry & rules", icon: Shield },
  { id: 8, title: "Invoices & Payment", subtitle: "Razorpay, GST & terms", icon: CreditCard },
  { id: 9, title: "Event Features", subtitle: "Agenda, social & promos", icon: Layers },
];

export const CreateEventWizard = ({
  isOpen,
  onClose,
  initialEvent,
}: CreateEventWizardProps) => {
  const { addEvent, updateEvent } = useEventStore();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [eventData, setEventData] = useState<EventItem>(() => initialEvent || createBlankEvent());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [autosaveTime, setAutosaveTime] = useState<string>("Draft saved");

  // Re-sync if initialEvent changes
  useEffect(() => {
    if (initialEvent) {
      setEventData(initialEvent);
    } else {
      setEventData(createBlankEvent());
    }
    setCurrentStep(1);
  }, [initialEvent, isOpen]);

  // Autosave simulator
  useEffect(() => {
    const timer = setTimeout(() => {
      setAutosaveTime(`Autosaved at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    }, 1500);
    return () => clearTimeout(timer);
  }, [eventData]);

  if (!isOpen) return null;

  const handleUpdate = (updates: Partial<EventItem>) => {
    setEventData((prev) => ({ ...prev, ...updates }));
  };

  const handleSaveDraft = () => {
    if (!eventData.name.trim()) {
      toast.error("Please enter an event name before saving.");
      setCurrentStep(1);
      return;
    }

    const payload: EventItem = {
      ...eventData,
      status: "Draft",
      updatedAt: new Date().toISOString(),
    };

    if (initialEvent) {
      updateEvent(payload.id, payload);
    } else {
      addEvent(payload);
    }

    Swal.fire({
      icon: "success",
      title: "Draft Saved",
      text: `"${payload.name}" has been saved as draft. You can continue editing anytime.`,
      timer: 1500,
      showConfirmButton: false,
    });
    onClose();
  };

  const handlePublish = () => {
    if (!eventData.name.trim()) {
      toast.error("Event Name is required before publishing.");
      setCurrentStep(1);
      return;
    }

    const payload: EventItem = {
      ...eventData,
      status: "Published",
      updatedAt: new Date().toISOString(),
    };

    if (initialEvent) {
      updateEvent(payload.id, payload);
    } else {
      addEvent(payload);
    }

    Swal.fire({
      icon: "success",
      title: "Event Published!",
      text: `"${payload.name}" is now live and accepting registrations.`,
      timer: 2000,
      showConfirmButton: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-2 backdrop-blur-xs sm:p-4">
      <div className="flex h-[95dvh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-[#F7F8FA] shadow-2xl dark:bg-[#0f1318]">
        {/* TOP HEADER */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white shadow-xs">
              <Sparkles size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {initialEvent ? "Edit Event Configuration" : "Create New Event"}
                </h2>
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                  Step {currentStep} of {STEPS.length}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {autosaveTime}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 hover:text-black dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
            >
              <Eye size={14} className="text-orange-600" />
              <span className="hidden sm:inline">Live Preview</span>
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 hover:text-black dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
            >
              <Save size={14} />
              <span className="hidden sm:inline">Save Draft</span>
            </button>

            <button
              type="button"
              onClick={handlePublish}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-orange-700"
            >
              <Send size={14} />
              <span>Publish Event</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* MAIN BODY: 2-COLUMN WIZARD */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* LEFT-SIDE STEP NAVIGATION (260px) */}
          <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:flex">
            <div className="mb-3 px-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Setup Progress
              </span>
              {/* Progress bar */}
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                <div
                  className="h-full bg-orange-600 transition-all duration-300"
                  style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
              {STEPS.map((s) => {
                const Icon = s.icon;
                const isCurrent = currentStep === s.id;
                const isCompleted = currentStep > s.id;

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCurrentStep(s.id)}
                    className={`flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition ${
                      isCurrent
                        ? "border-l-4 border-orange-600 bg-orange-50 text-orange-900 shadow-2xs dark:bg-orange-950/40 dark:text-orange-200"
                        : "text-gray-600 hover:bg-gray-50 hover:text-black dark:text-gray-400 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        isCompleted
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : isCurrent
                          ? "bg-orange-600 text-white"
                          : "bg-gray-100 text-gray-500 dark:bg-slate-800"
                      }`}
                    >
                      {isCompleted ? <Check size={14} /> : s.id}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-bold truncate ${
                          isCurrent
                            ? "text-orange-900 dark:text-orange-200"
                            : "text-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {s.title}
                      </p>
                      <p className="truncate text-[10px] text-gray-400">
                        {s.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* RIGHT-SIDE CONFIGURATION PANEL */}
          <main className="flex min-w-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
            {/* Step header label for mobile */}
            <div className="mb-4 flex items-center justify-between md:hidden">
              <span className="text-xs font-bold text-orange-600">
                Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.title}
              </span>
              <span className="text-[11px] text-gray-400">
                {Math.round((currentStep / STEPS.length) * 100)}%
              </span>
            </div>

            {/* Render Active Step */}
            <div className="flex-1">
              {currentStep === 1 && (
                <Step1General event={eventData} onChange={handleUpdate} />
              )}
              {currentStep === 2 && (
                <Step2Tickets event={eventData} onChange={handleUpdate} />
              )}
              {currentStep === 3 && (
                <Step3CheckoutForm event={eventData} onChange={handleUpdate} />
              )}
              {currentStep === 4 && (
                <Step4Registration event={eventData} onChange={handleUpdate} />
              )}
              {currentStep === 5 && (
                <Step5TicketDesign event={eventData} onChange={handleUpdate} />
              )}
              {currentStep === 6 && (
                <Step6Emails event={eventData} onChange={handleUpdate} />
              )}
              {currentStep === 7 && (
                <Step7Policies event={eventData} onChange={handleUpdate} />
              )}
              {currentStep === 8 && (
                <Step8Invoices event={eventData} onChange={handleUpdate} />
              )}
              {currentStep === 9 && (
                <Step9Features event={eventData} onChange={handleUpdate} />
              )}
            </div>

            {/* STICKY BOTTOM NAVIGATION BAR */}
            <div className="sticky -bottom-4 sm:-bottom-6 lg:-bottom-8 -mx-4 sm:-mx-6 lg:-mx-8 mt-8 flex items-center justify-between border-t border-gray-200 bg-white/95 px-6 py-3.5 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95">
              <button
                type="button"
                disabled={currentStep === 1}
                onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
              >
                <ChevronLeft size={16} /> Previous
              </button>

              <div className="flex items-center gap-2">
                {currentStep < STEPS.length ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((s) => Math.min(STEPS.length, s + 1))}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-orange-700"
                  >
                    Next Step <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePublish}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-6 py-2 text-xs font-bold text-white shadow-xs hover:bg-orange-700"
                  >
                    Publish Event <Send size={15} />
                  </button>
                )}
              </div>
            </div>
          </main>
        </div>

        {/* Live Preview Modal Overlay */}
        {previewOpen && (
          <EventPreviewModal
            event={eventData}
            isOpen={previewOpen}
            onClose={() => setPreviewOpen(false)}
          />
        )}
      </div>
    </div>
  );
};
