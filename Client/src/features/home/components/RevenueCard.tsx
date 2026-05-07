import React from "react";
import { CalendarRange } from "lucide-react";

export default function RevenueCard({
  title = "Revenue",
  amount = "₹0.00",
  date = "",
  stats = {},
}) {
  return (
    <div
      className="bg-white rounded-2xl shadow-md p-6 w-full border border-gray-100 
      transition-all duration-300 hover:shadow-sm hover:-translate-y-1 cursor-pointer"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <CalendarRange className="w-6 h-6 text-gray-700" />
      </div>

      {/* Amount */}
      <div className="text-black rounded-xl mb-4 shadow-sm border border-gray-100 p-4">
        <p className="text-sm opacity-80">Total Balance</p>
        <h3 className="text-4xl font-bold mt-1">{amount}</h3>
        <p className="text-xs opacity-70 mt-1">{date}</p>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 gap-4">
        {Object.keys(stats).map((key, index) => (
          <div
            key={index}
            className="bg-gray-50 rounded-xl p-4 border border-gray-100"
          >
            <p className="text-sm text-gray-500">{key}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{stats[key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
