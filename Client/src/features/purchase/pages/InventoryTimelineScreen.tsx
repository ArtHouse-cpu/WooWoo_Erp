import { useEffect, useMemo, useState } from "react";
import { 
  handleGetInvoices, 
  handleGetPurchases
} from "@/services/apiClient";
import { 
  Package, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Calendar, 
  User,
  Hash,
  ShoppingBag,
  History,
  Tag
} from "lucide-react";
import Swal from "sweetalert2";

type TimelineEntry = {
  id: string;
  date: Date;
  type: "IN" | "OUT";
  productName: string;
  qty: number;
  amount: number;
  invoiceNo: string;
  createdBy: string;
  entityName: string; 
  category?: string;
};

const InventoryTimelineScreen = () => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [dateRange, setDateRange] = useState({
    start: "",
    end: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, purRes] = await Promise.all([
        handleGetInvoices(),
        handleGetPurchases()
      ]);

      if (invRes.success) setInvoices(invRes.invoices);
      if (purRes.success) setPurchases(purRes.purchases);
    } catch (error) {
      console.error("Error fetching timeline data:", error);
      Swal.fire("Error", "Failed to load inventory history", "error");
    } finally {
      setLoading(false);
    }
  };

  const timelineData = useMemo(() => {
    const data: TimelineEntry[] = [];

    // Process Sales (OUT)
    invoices.forEach((inv) => {
      if (inv.status === "cancelled") return;
      inv.items.forEach((item: any, idx: number) => {
        data.push({
          id: `sale-${inv._id}-${idx}`,
          date: new Date(inv.invoiceDate || inv.createdAt),
          type: "OUT",
          productName: item.productName || "Unknown Product",
          qty: item.qty,
          amount: item.unitPrice,
          invoiceNo: inv.invoiceCode || inv.invoiceNumber || "N/A",
          createdBy: inv.createdBy?.m_staff_name || "System",
          entityName: inv.customerName || "Walk-in Customer",
          category: item.category
        });
      });
    });

    // Process Purchases (IN)
    purchases.forEach((pur) => {
      if (pur.status === "cancelled") return;
      (pur.items || []).forEach((item: any, idx: number) => {
        data.push({
          id: `pur-${pur._id}-${idx}`,
          date: new Date(pur.invoiceDate || pur.createdAt),
          type: "IN",
          productName: item.productName || "Unknown Product",
          qty: item.qty,
          amount: item.unitPrice,
          invoiceNo: pur.invoiceNumber || "N/A",
          createdBy: pur.purchaser || "System",
          entityName: pur.supplierName || "Direct Purchase",
          category: "Purchase"
        });
      });
    });

    // Sort by date descending
    return data.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [invoices, purchases]);

  const filteredData = useMemo(() => {
    return timelineData.filter((item) => {
      const matchesSearch = 
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.entityName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === "ALL" || item.type === typeFilter;
      
      const itemDate = item.date.toISOString().split("T")[0];
      const matchesDate = 
        (!dateRange.start || itemDate >= dateRange.start) &&
        (!dateRange.end || itemDate <= dateRange.end);

      return matchesSearch && matchesType && matchesDate;
    });
  }, [timelineData, searchTerm, typeFilter, dateRange]);

  const stats = useMemo(() => {
    return filteredData.reduce((acc, curr) => {
      if (curr.type === "IN") {
        acc.totalIn += curr.qty;
        acc.valIn += curr.qty * curr.amount;
      } else {
        acc.totalOut += curr.qty;
        acc.valOut += curr.qty * curr.amount;
      }
      return acc;
    }, { totalIn: 0, totalOut: 0, valIn: 0, valOut: 0 });
  }, [filteredData]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-gray-500">Loading timeline data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History className="text-blue-600" />
            Inventory Timeline
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track every stock movement across your store</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Stock In (Qty)" 
          value={stats.totalIn} 
          icon={<ArrowDownLeft className="text-emerald-600" />} 
          color="emerald"
          label={`Value: ₹${stats.valIn.toLocaleString()}`}
        />
        <StatCard 
          title="Stock Out (Qty)" 
          value={stats.totalOut} 
          icon={<ArrowUpRight className="text-rose-600" />} 
          color="rose"
          label={`Value: ₹${stats.valOut.toLocaleString()}`}
        />
        <StatCard 
          title="Total Transactions" 
          value={filteredData.length} 
          icon={<Package className="text-blue-600" />} 
          color="blue"
          label="Recent movements"
        />
        <StatCard 
          title="Net Movement" 
          value={stats.totalIn - stats.totalOut} 
          icon={<Tag className="text-indigo-600" />} 
          color="indigo"
          label="Inventory Delta"
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search product, invoice, or entity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition"
            />
          </div>

          <div className="md:col-span-3">
            <div className="flex p-1 bg-gray-100 rounded-lg">
              <button 
                onClick={() => setTypeFilter("ALL")}
                className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition ${typeFilter === "ALL" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              >
                ALL
              </button>
              <button 
                onClick={() => setTypeFilter("IN")}
                className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition ${typeFilter === "IN" ? "bg-white shadow-sm text-emerald-600" : "text-gray-500 hover:text-gray-700"}`}
              >
                STOCK IN
              </button>
              <button 
                onClick={() => setTypeFilter("OUT")}
                className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition ${typeFilter === "OUT" ? "bg-white shadow-sm text-rose-600" : "text-gray-500 hover:text-gray-700"}`}
              >
                STOCK OUT
              </button>
            </div>
          </div>

          <div className="md:col-span-4 flex gap-2">
            <div className="flex-1 relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full pl-9 pr-2 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1 relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full pl-9 pr-2 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Qty</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rate</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Transaction Info</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">
                          {item.date.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium uppercase">
                          {item.date.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        item.type === "IN" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                          : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}>
                        {item.type === "IN" ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                        {item.type === "IN" ? "Stock In" : "Stock Out"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800">{item.productName}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{item.category || "General"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-bold ${item.type === "IN" ? "text-emerald-600" : "text-rose-600"}`}>
                        {item.type === "IN" ? "+" : "-"}{item.qty}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-900">₹ {item.amount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <Hash size={12} className="text-gray-400" />
                          <span className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">{item.invoiceNo}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.type === "IN" ? <ShoppingBag size={12} className="text-gray-400" /> : <User size={12} className="text-gray-400" />}
                          <span className="text-[11px] text-gray-500 font-medium">{item.entityName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center">
                           <User size={12} className="text-slate-500" />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{item.createdBy}</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-50 rounded-full">
                        <Search size={32} className="text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-medium">No matching inventory movements found</p>
                      <button 
                        onClick={() => {
                          setSearchTerm("");
                          setTypeFilter("ALL");
                          setDateRange({ start: "", end: "" });
                        }}
                        className="text-sm font-bold text-blue-600 hover:underline"
                      >
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, label }: { title: string, value: number, icon: React.ReactNode, color: string, label: string }) => {
  const colorMap: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm transition hover:shadow-md hover:border-gray-300">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</span>
        <span className="text-[11px] text-gray-400 font-medium mt-1">{label}</span>
      </div>
    </div>
  );
};

export default InventoryTimelineScreen;
