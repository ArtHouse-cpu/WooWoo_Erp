import { X } from "lucide-react";
import React from "react";

export default function StockOutModal({ onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6 relative animate-fadeIn overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-semibold mb-4">Stock Out</h2>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition cursor-pointer"
        >
          <X size={22} />
        </button>
        <div className="space-y-2">
          <div className="text-[16px] font-semibold text-gray-700">
            Quantity Information
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="Enter Quantity"
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none"
              />
            </div>

            {/* Record Date */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Record Date
              </label>
              <input
                type="date"
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Select Category
            </label>
            <select className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none">
              <option value="">Choose category</option>
              <option value="electronics">Electronics</option>
              <option value="grocery">Grocery</option>
              <option value="clothes">Clothes</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Remarks
            </label>
            <textarea
              rows={2}
              placeholder="Enter Remarks"
              className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none resize-none"
            ></textarea>
          </div>
          <div className="text-[16px] font-semibold text-gray-700">
            Price Details (Optional)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Purchase Price */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Purchase Price
              </label>
              <input
                type="number"
                placeholder="Enter purchase price"
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none"
              />
            </div>

            {/* Stock In Value */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Stock In Value
              </label>
              <input
                type="number"
                placeholder="Enter stock in value"
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none"
              />
            </div>
          </div>
        </div>

        {/* Button Group */}
        <div className="flex justify-between gap-3 mt-5 w-full">
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-lg border border-gray-300 hover:bg-gray-100 transition w-full cursor-pointer font-semibold text-[15px]"
          >
            Cancel
          </button>

          <button className="px-5 py-3 rounded-lg bg-black text-white hover:bg-gray-800 transition w-full cursor-pointer font-semibold text-[15px]">
            Remove Quantity
          </button>
        </div>
      </div>
    </div>
  );
}
