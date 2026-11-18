import { useState } from "react";
import {
  Save,
  Building,
  CreditCard,
  Receipt,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  ScanLine,
} from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useEventStore } from "../store/eventStore";
import type { InvoicePaymentSettings } from "../types/eventTypes";

export const EventSettingsPage = () => {
  const { globalSettings, updateGlobalSettings, resetToDefaultSeed } = useEventStore();
  const [formData, setFormData] = useState<InvoicePaymentSettings>({ ...globalSettings });

  const handleSave = () => {
    updateGlobalSettings(formData);
    Swal.fire({
      icon: "success",
      title: "Settings Saved",
      text: "Global Event Management settings have been saved successfully.",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const handleResetDemo = () => {
    Swal.fire({
      title: "Reset All Event Data to Seed?",
      text: "This will restore original demo events, sample orders, attendees, and settings.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ea580c",
      confirmButtonText: "Yes, Reset Demo",
    }).then((res) => {
      if (res.isConfirmed) {
        resetToDefaultSeed();
        setFormData({ ...globalSettings });
        toast.success("Event Management data restored to demo defaults.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            Event Management Settings
          </h1>
          <p className="text-xs text-gray-500">
            Configure global organizer defaults, payment gateways, invoice numbering, and entry scanner preferences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDemo}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-200"
          >
            <RotateCcw size={14} /> Reset Demo Data
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-orange-700 transition"
          >
            <Save size={15} /> Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 text-xs">
        {/* Organizer Business Profile */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 text-orange-600 dark:border-slate-800">
            <Building size={18} />
            <h3 className="font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Organizer Legal Profile
            </h3>
          </div>

          <div className="mt-4 space-y-3.5">
            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">
                Registered Business Name
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">
                Business Address (printed on Invoices)
              </label>
              <input
                type="text"
                value={formData.businessAddress}
                onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  GSTIN Number
                </label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 font-mono uppercase dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Company PAN
                </label>
                <input
                  type="text"
                  value={formData.businessPan || ""}
                  onChange={(e) => setFormData({ ...formData, businessPan: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 font-mono uppercase dark:bg-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Payment Gateway Settings */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 text-orange-600 dark:border-slate-800">
            <CreditCard size={18} />
            <h3 className="font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Razorpay Gateway Credentials
            </h3>
          </div>

          <div className="mt-4 space-y-3.5">
            <div className="flex items-center justify-between rounded-lg bg-orange-50/60 p-3 dark:bg-orange-950/30">
              <div>
                <p className="font-bold text-gray-900 dark:text-white">
                  Razorpay Sandbox (Test Mode)
                </p>
                <p className="text-[11px] text-gray-500">
                  Enable for testing checkouts with simulated test cards/UPI
                </p>
              </div>

              <input
                type="checkbox"
                checked={formData.isTestMode}
                onChange={(e) => setFormData({ ...formData, isTestMode: e.target.checked })}
                className="h-4 w-4 rounded text-orange-600"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">
                Razorpay Key ID
              </label>
              <input
                type="text"
                value={formData.razorpayKeyId}
                onChange={(e) => setFormData({ ...formData, razorpayKeyId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 font-mono dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 dark:text-gray-300">
                Razorpay Key Secret
              </label>
              <input
                type="password"
                value={formData.razorpayKeySecret || "••••••••••••••••"}
                onChange={(e) => setFormData({ ...formData, razorpayKeySecret: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 font-mono dark:bg-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Invoice & GST Settings */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 text-orange-600 dark:border-slate-800">
            <Receipt size={18} />
            <h3 className="font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Automated Invoicing & Tax Slabs
            </h3>
          </div>

          <div className="mt-4 space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Invoice Number Prefix
                </label>
                <input
                  type="text"
                  value={formData.invoicePrefix}
                  onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 font-mono dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Default GST Slab (%)
                </label>
                <input
                  type="number"
                  value={formData.gstRatePercent}
                  onChange={(e) =>
                    setFormData({ ...formData, gstRatePercent: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 font-bold dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Convenience Fee (₹)
                </label>
                <input
                  type="number"
                  value={formData.convenienceFeeAmount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      convenienceFeeAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Default Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 dark:bg-slate-800"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Gate Scanner Preferences */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 text-orange-600 dark:border-slate-800">
            <ScanLine size={18} />
            <h3 className="font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Gate Scanner & Entry Preferences
            </h3>
          </div>

          <div className="mt-4 space-y-3.5">
            <div className="rounded-xl border border-gray-200 p-3 space-y-2.5 dark:border-slate-800">
              <label className="flex items-center justify-between cursor-pointer">
                <span>Play Sound Chime on Successful Scan</span>
                <input type="checkbox" defaultChecked className="rounded text-orange-600" />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span>Prevent Cross-Gate Duplicate Scans within 10s</span>
                <input type="checkbox" defaultChecked className="rounded text-orange-600" />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span>Auto-Focus Camera on Viewfinder Open</span>
                <input type="checkbox" defaultChecked className="rounded text-orange-600" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
