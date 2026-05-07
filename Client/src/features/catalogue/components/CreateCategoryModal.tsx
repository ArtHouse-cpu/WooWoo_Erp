import { X, ImagePlus } from "lucide-react";
import React, { useState } from "react";

export default function CreateCategoryModal({ onClose }: any) {
  const [preview, setPreview] = useState<string | null>(null);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 relative animate-fadeIn">
        <h2 className="text-xl font-semibold mb-4">Create New Category</h2>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition cursor-pointer"
        >
          <X size={22} />
        </button>

        {/* Form */}
        <div className="space-y-2">
          {/* Category Name */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Category Name
            </label>
            <input
              type="text"
              placeholder="Enter Category Name"
              className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Enter category description"
              className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none resize-none"
            ></textarea>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Category Image
            </label>

            <div className="border border-dashed border-gray-400 rounded-lg p-4 w-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition">
              {preview ? (
                <img
                  src={preview}
                  alt="preview"
                  className="w-32 h-32 object-cover rounded-lg"
                />
              ) : (
                <>
                  <ImagePlus size={40} className="text-gray-500 mb-2" />
                  <p className="text-gray-500 text-sm">
                    Click to upload category image
                  </p>
                </>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleImage}
                className="hidden"
                id="category-image"
              />
            </div>
          </div>
        </div>

        {/* Button Group */}
        <div className="flex justify-between gap-3 mt-4 w-full">
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
