import { X } from "lucide-react";
import React from "react";

export default function CreateVendorModal({ onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6 relative animate-fadeIn overflow-y-auto max-h-[90vh]">
        {/* Title */}
        <h2 className="text-xl font-semibold mb-4">Create New Vendor</h2>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition cursor-pointer"
        >
          <X size={22} />
        </button>

        <section className="mb-6">
          <h3 className="font-semibold text-lg mb-3">Basic Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Name
              </label>
              <input
                type="text"
                placeholder="Enter name"
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Mobile
              </label>
              <input
                type="text"
                placeholder="Enter mobile"
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-700 font-medium mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="Enter email"
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none"
              />
            </div>
          </div>
        </section>

        {/* =============================== */}
        {/* COMPANY DETAILS */}
        {/* =============================== */}
        <section className="mb-6">
          <h3 className="font-semibold text-lg mb-3">Company Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Company Name
              </label>
              <input
                type="text"
                placeholder="Enter company name"
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">
                GSTIN
              </label>
              <input
                type="text"
                placeholder="Enter GSTIN"
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none"
              />
            </div>
          </div>
        </section>

        {/* =============================== */}
        {/* BILLING ADDRESS */}
        {/* =============================== */}
        <section className="mb-6">
          <h3 className="font-semibold text-lg mb-3">Billing Address</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-gray-700 font-medium mb-1">
                Address Line 1
              </label>
              <input
                type="text"
                placeholder="Enter address line 1"
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-700 font-medium mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                placeholder="Enter address line 2"
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Pincode
              </label>
              <input
                type="text"
                placeholder="Enter pincode"
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">
                State
              </label>
              <input
                type="text"
                placeholder="Enter state"
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">
                City
              </label>
              <input
                type="text"
                placeholder="Enter city"
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Country
              </label>
              <input
                type="text"
                placeholder="Enter country"
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none"
              />
            </div>
          </div>
        </section>

        {/* =============================== */}
        {/* BANK DETAILS */}
        {/* =============================== */}
        <section className="mb-6">
          <h3 className="font-semibold text-lg mb-3">Bank Details</h3>

          <div className="space-y-4">
            <button className="px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-100 transition w-full text-left cursor-pointer">
              Open Bank Details Modal
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Optional Details
                </label>
                <input
                  type="text"
                  placeholder="Optional details"
                  className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Opening Balance
                </label>
                <input
                  type="number"
                  placeholder="Enter opening balance"
                  className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Debit
                </label>
                <input
                  type="number"
                  placeholder="Enter debit amount"
                  className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  TDS
                </label>
                <input
                  type="number"
                  placeholder="Enter TDS"
                  className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <div className="flex justify-between gap-3 mt-6 w-full">
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-lg border border-gray-300 hover:bg-gray-100 transition w-full cursor-pointer font-semibold text-[15px]"
          >
            Cancel
          </button>

          <button className="px-5 py-3 rounded-lg bg-black text-white hover:bg-gray-800 transition w-full cursor-pointer font-semibold text-[15px]">
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
