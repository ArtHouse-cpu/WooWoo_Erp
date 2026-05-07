import React, { useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
export default function CreateNewMembershipScreen() {
  const [imagesPreview, setImagesPreview] = useState<string[]>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const previews = files.map((file) => URL.createObjectURL(file));
    setImagesPreview((prev) => [...prev, ...previews]);
  };

  return (
    <div className="w-full px-2">
      <div className="bg-white shadow-base rounded-2xl p-6 border border-gray-200">
        {/* HEADER */}
        <h2 className="text-xl font-semibold text-gray-800 mb-5">
          Create New Plan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 ">
          <div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">
                Plan Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 
                focus:ring-black focus:border-transparent outline-none transition"
                placeholder="Enter plan name"
              />
            </div>
            <div className="h-full">
              <label className="block font-medium text-gray-700 mt-3 mb-1">
                Description
              </label>
              <textarea
                rows={8}
                className="w-full  p-3 rounded-lg border border-gray-300 
                focus:ring-2 focus:ring-black outline-none transition"
                placeholder="Write plan details here..."
              />
            </div>
          </div>
          <div className="flex flex-col">
            <label className="block font-medium text-gray-700 mb-1">
              Plan Images <span className="text-red-500">*</span>
            </label>
            <label
              htmlFor="imageInput"
              className="flex-1 border-2 border-dashed border-gray-300 
              rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer 
              hover:bg-gray-50 hover:border-gray-400 transition"
            >
              <ImagePlus className="w-12 h-12 text-black mb-3" />
              <p className="text-gray-700 font-medium">
                Click to upload plan images
              </p>
              <p className="text-sm text-gray-500 mt-1">
                PNG, JPG, JPEG up to 5MB
              </p>

              <input
                id="imageInput"
                type="file"
                multiple
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>
          </div>
        </div>

        {/* Optional Section */}
        <h2 className="text-[18px] font-semibold text-gray-800 mt-4 mb-1">
          Tell customers what the main features are (optional)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* LEFT SIDE */}
          <section>
            <label className="block font-medium text-gray-700 mb-2">
              Pricing strategy
            </label>

            <div className="space-y-3">
              {/* Free */}
              <label
                className="flex items-center gap-3 p-4 rounded-lg cursor-pointer 
        border border-gray-300 hover:border-black transition"
              >
                <input type="radio" name="pricing" className="h-5 w-5" />
                <div>
                  <p className="font-medium">Free</p>
                  <p className="text-gray-500 text-sm">
                    Offer this plan free of charge.
                  </p>
                </div>
              </label>

              {/* One-time */}
              <label
                className="flex items-center gap-3 p-4 rounded-lg cursor-pointer 
        border border-gray-300 hover:border-black transition"
              >
                <input type="radio" name="pricing" className="h-5 w-5" />
                <div>
                  <p className="font-medium">One-time Payment</p>
                  <p className="text-gray-500 text-sm">
                    Charge a single upfront fee.
                  </p>
                </div>
              </label>

              {/* Recurring */}
              <label
                className="flex items-center gap-3 p-4 rounded-lg cursor-pointer 
        border border-gray-300 hover:border-black transition w-full"
              >
                <input
                  type="radio"
                  name="pricing"
                  defaultChecked
                  className="h-5 w-5"
                />
                <div>
                  <p className="font-medium">Recurring Payments</p>
                  <p className="text-gray-500 text-sm">
                    Set a price and choose how often a customer is charged.
                  </p>
                </div>
              </label>
            </div>
          </section>

          {/* RIGHT SIDE */}
          <section>
            {/* Recurring fields */}
            <div className=" grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="font-medium">Price *</label>
                <input
                  type="number"
                  placeholder="₹ 0"
                  className="w-full p-3 mt-2 rounded-lg border border-gray-300 
          focus:ring-2 focus:ring-black outline-none"
                />
              </div>

              <div>
                <label className="font-medium">Payment frequency *</label>
                <select
                  className="w-full p-3 mt-2 rounded-lg border border-gray-300 
          focus:ring-2 focus:ring-black outline-none"
                >
                  <option>Custom</option>
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>

              <div>
                <label className="font-medium">Repeat every *</label>
                <div className="flex gap-2 mt-2">
                  <input
                    type="number"
                    defaultValue={1}
                    className="w-20 p-3 rounded-lg border border-gray-300 
            focus:ring-2 focus:ring-black outline-none"
                  />
                  <select
                    className="flex-1 p-3 rounded-lg border border-gray-300 
            focus:ring-2 focus:ring-black outline-none"
                  >
                    <option>Select</option>
                    <option>Days</option>
                    <option>Weeks</option>
                    <option>Months</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mt-5">
              <div>
                <label className="font-medium">Length of plan *</label>
                <select
                  className="w-full p-3 mt-2 rounded-lg border border-gray-300 
          focus:ring-2 focus:ring-black outline-none"
                >
                  <option>Custom</option>
                  <option>1 Month</option>
                  <option>3 Months</option>
                  <option>6 Months</option>
                </select>
              </div>

              <div>
                <label className="font-medium">
                  How many billing cycles? *
                </label>
                <input
                  type="number"
                  defaultValue={2}
                  className="w-full p-3 mt-2 rounded-lg border border-gray-300 
          focus:ring-2 focus:ring-black outline-none"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-10">
          {/* Left 40% */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-[50%] ">
            <button className="flex-1 bg-white text-black py-3.5 rounded-xl font-semibold border border-gray-300 hover:bg-gray-100 transition cursor-pointer">
              Cancel
            </button>
          </div>

          {/* Right 60% */}
          <button className="w-full sm:w-[50%] bg-black text-white py-3.5 rounded-xl font-semibold hover:bg-gray-900 transition cursor-pointer">
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
