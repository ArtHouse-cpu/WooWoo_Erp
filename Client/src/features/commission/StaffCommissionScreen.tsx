
import { useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import {
  Eye,
  Award,
  CircleDollarSign,
  TrendingUp,
  Sparkles,
  Receipt,
  Calendar,
} from "lucide-react";
import CommissionLedgerModal, {
  type Staff,
} from "./Modal/CommissionLedgerModal";
import {
  type DatePreset,
  DATE_PRESET_OPTIONS,
  rangeForPreset,
} from "../../utils/datePresets";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INITIAL_STAFF_DATA: Staff[] = [
  {
    id: "staff-1",
    staffName: "Rahul Sharma",
    role: "Store Manager",
    phone: "9876543210",
    email: "rahul@gmail.com",
    totalOrders: 14,
    totalSales: 85000,
    rate: 6,
    commission: 5100,
    invoices: [
      {
        id: "inv-101",
        invoiceCode: "INVVWAH-101",
        date: "14 Sep 2026, 04:30 PM",
        customerName: "Anurag Tiwari",
        customerPhone: "9876123450",
        category: "Studio Booking",
        invoiceAmount: 12000,
        commissionRate: 6,
        commissionAmount: 720,
        paymentMode: "UPI",
        status: "Credited",
      },
      {
        id: "inv-102",
        invoiceCode: "INVVWAH-106",
        date: "13 Sep 2026, 01:15 PM",
        customerName: "Pooja Hegde",
        customerPhone: "9823456781",
        category: "Membership Plan",
        invoiceAmount: 25000,
        commissionRate: 6,
        commissionAmount: 1500,
        paymentMode: "Card",
        status: "Credited",
      },
      {
        id: "inv-103",
        invoiceCode: "INVVWAH-114",
        date: "11 Sep 2026, 06:45 PM",
        customerName: "Gaurav Sen",
        customerPhone: "9819876543",
        category: "Retail Products",
        invoiceAmount: 18000,
        commissionRate: 6,
        commissionAmount: 1080,
        paymentMode: "UPI",
        status: "Credited",
      },
      {
        id: "inv-104",
        invoiceCode: "INVVWAH-122",
        date: "09 Sep 2026, 11:20 AM",
        customerName: "Nisha Patel",
        customerPhone: "9845012345",
        category: "Studio Booking",
        invoiceAmount: 30000,
        commissionRate: 6,
        commissionAmount: 1800,
        paymentMode: "Bank Transfer",
        status: "Paid",
      },
    ],
  },
  {
    id: "staff-2",
    staffName: "Priya Singh",
    role: "Senior Stylist",
    phone: "9876543211",
    email: "priya@gmail.com",
    totalOrders: 22,
    totalSales: 110000,
    rate: 10,
    commission: 11000,
    invoices: [
      {
        id: "inv-201",
        invoiceCode: "INVVWAH-103",
        date: "15 Sep 2026, 02:00 PM",
        customerName: "Rohan Kapoor",
        customerPhone: "9811122233",
        category: "Hair Styling & Spa",
        invoiceAmount: 4500,
        commissionRate: 10,
        commissionAmount: 450,
        paymentMode: "UPI",
        status: "Credited",
      },
      {
        id: "inv-202",
        invoiceCode: "INVVWAH-109",
        date: "14 Sep 2026, 12:45 PM",
        customerName: "Kavita Reddy",
        customerPhone: "9822233344",
        category: "Hair Coloring & Treatment",
        invoiceAmount: 14000,
        commissionRate: 10,
        commissionAmount: 1400,
        paymentMode: "Card",
        status: "Credited",
      },
      {
        id: "inv-203",
        invoiceCode: "INVVWAH-116",
        date: "12 Sep 2026, 05:10 PM",
        customerName: "Meera Joshi",
        customerPhone: "9833344455",
        category: "Bridal Package",
        invoiceAmount: 45000,
        commissionRate: 10,
        commissionAmount: 4500,
        paymentMode: "UPI",
        status: "Credited",
      },
      {
        id: "inv-204",
        invoiceCode: "INVVWAH-125",
        date: "10 Sep 2026, 03:20 PM",
        customerName: "Tanya Sen",
        customerPhone: "9844455566",
        category: "Keratin Therapy",
        invoiceAmount: 18500,
        commissionRate: 10,
        commissionAmount: 1850,
        paymentMode: "Card",
        status: "Paid",
      },
      {
        id: "inv-205",
        invoiceCode: "INVVWAH-131",
        date: "08 Sep 2026, 04:00 PM",
        customerName: "Deepika Rao",
        customerPhone: "9855566677",
        category: "Hair Styling & Spa",
        invoiceAmount: 28000,
        commissionRate: 10,
        commissionAmount: 2800,
        paymentMode: "UPI",
        status: "Pending",
      },
    ],
  },
  {
    id: "staff-3",
    staffName: "Sneha Patel",
    role: "Nail Artist & Spa Lead",
    phone: "9876543213",
    email: "sneha@gmail.com",
    totalOrders: 28,
    totalSales: 118000,
    rate: 12,
    commission: 14160,
    invoices: [
      {
        id: "inv-301",
        invoiceCode: "INVVWAH-104",
        date: "15 Sep 2026, 01:10 PM",
        customerName: "Alia Merchant",
        customerPhone: "9866677788",
        category: "Nail Art & Extension",
        invoiceAmount: 6500,
        commissionRate: 12,
        commissionAmount: 780,
        paymentMode: "UPI",
        status: "Credited",
      },
      {
        id: "inv-302",
        invoiceCode: "INVVWAH-111",
        date: "13 Sep 2026, 06:30 PM",
        customerName: "Sunita Roy",
        customerPhone: "9877788899",
        category: "Luxury Spa Pedicure",
        invoiceAmount: 8500,
        commissionRate: 12,
        commissionAmount: 1020,
        paymentMode: "Cash",
        status: "Credited",
      },
      {
        id: "inv-303",
        invoiceCode: "INVVWAH-118",
        date: "12 Sep 2026, 02:40 PM",
        customerName: "Riya Kapoor",
        customerPhone: "9888899900",
        category: "Gel Nail Art & Polish",
        invoiceAmount: 22000,
        commissionRate: 12,
        commissionAmount: 2640,
        paymentMode: "Card",
        status: "Credited",
      },
      {
        id: "inv-304",
        invoiceCode: "INVVWAH-127",
        date: "10 Sep 2026, 07:15 PM",
        customerName: "Kiran Bedi",
        customerPhone: "9899900011",
        category: "Full Body Spa Package",
        invoiceAmount: 48000,
        commissionRate: 12,
        commissionAmount: 5760,
        paymentMode: "UPI",
        status: "Credited",
      },
      {
        id: "inv-305",
        invoiceCode: "INVVWAH-135",
        date: "07 Sep 2026, 12:00 PM",
        customerName: "Sanya Mirza",
        customerPhone: "9812309876",
        category: "Nail Extensions & Refills",
        invoiceAmount: 33000,
        commissionRate: 12,
        commissionAmount: 3960,
        paymentMode: "UPI",
        status: "Paid",
      },
    ],
  },
  {
    id: "staff-4",
    staffName: "Aman Verma",
    role: "Barista & Cafe Lead",
    phone: "9876543212",
    email: "aman@gmail.com",
    totalOrders: 42,
    totalSales: 64000,
    rate: 8,
    commission: 5120,
    invoices: [
      {
        id: "inv-401",
        invoiceCode: "INVVWAH-105",
        date: "15 Sep 2026, 11:45 AM",
        customerName: "Kunal Shah",
        customerPhone: "9823412345",
        category: "Artisanal Coffee & Meals",
        invoiceAmount: 3200,
        commissionRate: 8,
        commissionAmount: 256,
        paymentMode: "UPI",
        status: "Credited",
      },
      {
        id: "inv-402",
        invoiceCode: "INVVWAH-112",
        date: "14 Sep 2026, 07:00 PM",
        customerName: "Cafe Event Group",
        customerPhone: "9834523456",
        category: "Event Catering & Beverages",
        invoiceAmount: 26000,
        commissionRate: 8,
        commissionAmount: 2080,
        paymentMode: "UPI",
        status: "Credited",
      },
      {
        id: "inv-403",
        invoiceCode: "INVVWAH-120",
        date: "11 Sep 2026, 04:15 PM",
        customerName: "Rohit Shetty",
        customerPhone: "9845634567",
        category: "Specialty Brews",
        invoiceAmount: 14800,
        commissionRate: 8,
        commissionAmount: 1184,
        paymentMode: "Card",
        status: "Credited",
      },
      {
        id: "inv-404",
        invoiceCode: "INVVWAH-128",
        date: "09 Sep 2026, 05:30 PM",
        customerName: "Meeting Lounge",
        customerPhone: "9856745678",
        category: "Coffee & Pastries",
        invoiceAmount: 20000,
        commissionRate: 8,
        commissionAmount: 1600,
        paymentMode: "UPI",
        status: "Paid",
      },
    ],
  },
  {
    id: "staff-5",
    staffName: "Vikram Rao",
    role: "Sales Executive",
    phone: "9876543214",
    email: "vikram@gmail.com",
    totalOrders: 16,
    totalSales: 92000,
    rate: 7,
    commission: 6440,
    invoices: [
      {
        id: "inv-501",
        invoiceCode: "INVVWAH-107",
        date: "15 Sep 2026, 10:20 AM",
        customerName: "Rajiv Bajaj",
        customerPhone: "9867856789",
        category: "Annual Corporate Membership",
        invoiceAmount: 40000,
        commissionRate: 7,
        commissionAmount: 2800,
        paymentMode: "Bank Transfer",
        status: "Credited",
      },
      {
        id: "inv-502",
        invoiceCode: "INVVWAH-117",
        date: "13 Sep 2026, 03:40 PM",
        customerName: "Simran Kaur",
        customerPhone: "9878967890",
        category: "Art Exhibition Booking",
        invoiceAmount: 32000,
        commissionRate: 7,
        commissionAmount: 2240,
        paymentMode: "UPI",
        status: "Credited",
      },
      {
        id: "inv-503",
        invoiceCode: "INVVWAH-129",
        date: "09 Sep 2026, 01:50 PM",
        customerName: "Aakash Varma",
        customerPhone: "9889078901",
        category: "Studio Pass Bundle",
        invoiceAmount: 20000,
        commissionRate: 7,
        commissionAmount: 1400,
        paymentMode: "Card",
        status: "Paid",
      },
    ],
  },
  {
    id: "staff-6",
    staffName: "Anjali Mehta",
    role: "Billing Cashier",
    phone: "9876543215",
    email: "anjali@gmail.com",
    totalOrders: 35,
    totalSales: 52000,
    rate: 5,
    commission: 2600,
    invoices: [
      {
        id: "inv-601",
        invoiceCode: "INVVWAH-108",
        date: "15 Sep 2026, 09:40 AM",
        customerName: "Manish Goel",
        customerPhone: "9890189012",
        category: "POS Quick Billing",
        invoiceAmount: 8500,
        commissionRate: 5,
        commissionAmount: 425,
        paymentMode: "UPI",
        status: "Credited",
      },
      {
        id: "inv-602",
        invoiceCode: "INVVWAH-119",
        date: "12 Sep 2026, 01:10 PM",
        customerName: "Tanvi Saxena",
        customerPhone: "9801290123",
        category: "Merchandise & Art Supplies",
        invoiceAmount: 15500,
        commissionRate: 5,
        commissionAmount: 775,
        paymentMode: "Cash",
        status: "Credited",
      },
      {
        id: "inv-603",
        invoiceCode: "INVVWAH-133",
        date: "08 Sep 2026, 06:15 PM",
        customerName: "Deepak Chawla",
        customerPhone: "9812301234",
        category: "Gift Vouchers & Retail",
        invoiceAmount: 28000,
        commissionRate: 5,
        commissionAmount: 1400,
        paymentMode: "Card",
        status: "Credited",
      },
    ],
  },
];

// // Helper to color-code roles
// function getRoleBadgeStyle(role: string): string {
//   switch (role) {
//     case "Store Manager":
//       return "bg-blue-100 text-blue-800 border-blue-200";
//     case "Senior Stylist":
//       return "bg-purple-100 text-purple-800 border-purple-200";
//     case "Nail Artist & Spa Lead":
//       return "bg-pink-100 text-pink-800 border-pink-200";
//     case "Barista & Cafe Lead":
//       return "bg-amber-100 text-amber-800 border-amber-200";
//     case "Sales Executive":
//       return "bg-emerald-100 text-emerald-800 border-emerald-200";
//     case "Billing Cashier":
//       return "bg-cyan-100 text-cyan-800 border-cyan-200";
//     default:
//       return "bg-gray-100 text-gray-800 border-gray-200";
//   }
// }

// ─── Main Component ───────────────────────────────────────────────────────────

const StaffCommissionScreen = () => {
  const [data] = useState<Staff[]>(INITIAL_STAFF_DATA);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Filter staff invoices and recalculate metrics by date range
  const filteredData = useMemo(() => {
    if (!fromDate && !toDate) {
      return data;
    }

    const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : -Infinity;
    const toTime = toDate ? new Date(`${toDate}T23:59:59`).getTime() : Infinity;

    return data.map((staff) => {
      const filteredInvoices = (staff.invoices || []).filter((inv) => {
        if (!inv.date) return true;
        const invTime = new Date(inv.date).getTime();
        if (isNaN(invTime)) return true;
        return invTime >= fromTime && invTime <= toTime;
      });

      const totalSales = filteredInvoices.reduce(
        (sum, inv) => sum + (inv.invoiceAmount || 0),
        0
      );
      const commission = filteredInvoices.reduce(
        (sum, inv) => sum + (inv.commissionAmount || 0),
        0
      );

      return {
        ...staff,
        totalOrders: filteredInvoices.length,
        totalSales,
        commission,
        invoices: filteredInvoices,
      };
    });
  }, [data, fromDate, toDate]);

  // Top Commission earner calculation
  const topEarner = useMemo(() => {
    if (!filteredData.length) return null;
    const sorted = [...filteredData].sort((a, b) => b.commission - a.commission);
    return sorted[0].commission > 0 ? sorted[0] : null;
  }, [filteredData]);

  // Total Commission calculation
  const totalCommission = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + (item.commission || 0), 0);
  }, [filteredData]);

  // Total Sales calculation
  const totalSales = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + (item.totalSales || 0), 0);
  }, [filteredData]);

  // Total Orders calculation
  const totalOrders = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + (item.totalOrders || 0), 0);
  }, [filteredData]);

  // Columns definition with Role
  const columns = useMemo<MRT_ColumnDef<Staff>[]>(
    () => [
      // Staff Name
      {
        accessorKey: "staffName",
        header: "Staff Name",
        Cell: ({ row }) => {
          const isTop = topEarner?.id === row.original.id;

          return (
            <div className="py-1">
              <p className="font-semibold text-gray-900 flex items-center gap-1.5 text-sm">
                {row.original.staffName}
                {isTop && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                    ★ Top
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-400">{row.original.email}</p>
            </div>
          );
        },
      },

      // Role Column
      // {
      //   accessorKey: "role",
      //   header: "Role",
      //   Cell: ({ cell }) => {
      //     const roleValue = cell.getValue<string>();
      //     return (
      //       <span
      //         className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeStyle(
      //           roleValue
      //         )}`}
      //       >
      //         {roleValue}
      //       </span>
      //     );
      //   },
      // },

      // Phone
      {
        accessorKey: "phone",
        header: "Phone No.",
        Cell: ({ cell }) => (
          <span className="text-gray-700 font-medium">
            {cell.getValue<string>()}
          </span>
        ),
      },

      // Email
      {
        accessorKey: "email",
        header: "Email ID",
        Cell: ({ cell }) => (
          <span className="text-gray-600 text-xs">
            {cell.getValue<string>()}
          </span>
        ),
      },

      // Orders Billed
      {
        accessorKey: "totalOrders",
        header: "Orders",
        Cell: ({ row }) => (
          <span className="font-semibold text-gray-800">
            {row.original.totalOrders || row.original.invoices?.length || 0}
          </span>
        ),
      },

      // Total Sales
      {
        accessorKey: "totalSales",
        header: "Total Sales",
        Cell: ({ row }) => (
          <span className="font-medium text-gray-900">
            ₹{Number(row.original.totalSales || 0).toLocaleString("en-IN")}
          </span>
        ),
      },

      // Rate %
      {
        accessorKey: "rate",
        header: "Rate (%)",
        Cell: ({ row }) => (
          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-xs border border-indigo-100">
            {row.original.rate || 5}%
          </span>
        ),
      },

      // Commission Amount
      {
        accessorKey: "commission",
        header: "Commission Amount",
        Cell: ({ cell }) => (
          <span className="font-bold text-emerald-600 text-sm">
            ₹{cell.getValue<number>().toLocaleString("en-IN")}
          </span>
        ),
      },

      // Laser / Ledger Action
      {
        id: "laser",
        header: "Ledger",
        Cell: ({ row }) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedStaff(row.original);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-semibold transition"
            title="View Commission Ledger & Invoices"
          >
            <Eye size={14} />
            <span>Ledger</span>
          </button>
        ),
      },
    ],
    [topEarner]
  );

  // Material React Table Setup
  const table = useMaterialReactTable({
    columns,
    data: filteredData,
    enableSorting: true,
    enablePagination: true,
    enableColumnFilters: true,
    initialState: {
      pagination: {
        pageSize: 10,
        pageIndex: 0,
      },
    },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      {/* ─── Top Header & Date Filter ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <CircleDollarSign className="text-indigo-600" size={28} />
            Staff Commission & Performance
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Review staff commissions, performance metrics, and invoice-level ledger breakdowns.
          </p>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200/80 text-xs">
            <Calendar size={14} className="text-gray-400 shrink-0" />
            <span className="text-gray-500 font-medium">Period:</span>
            <select
              value={datePreset}
              onChange={(e) => {
                const preset = e.target.value as DatePreset;
                setDatePreset(preset);
                if (preset === "all") {
                  setFromDate("");
                  setToDate("");
                } else if (preset === "custom") {
                  // Keep current inputs or allow picking
                } else {
                  const range = rangeForPreset(preset);
                  setFromDate(range.from);
                  setToDate(range.to);
                }
              }}
              className="text-xs font-semibold text-gray-800 bg-transparent outline-none cursor-pointer pr-1"
            >
              {DATE_PRESET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {datePreset === "custom" && (
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-gray-200/80 text-xs">
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-gray-700 outline-none text-xs"
              />
              <span className="text-gray-400 font-medium">to</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-gray-700 outline-none text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* ─── Top KPI Cards (Minimal Design) ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Top Commission (Top Earner) */}
        <div className="bg-white rounded-xl p-4 border border-gray-200/80 flex flex-col justify-between hover:border-gray-300 transition-colors">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Top Commission
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60">
                  <Sparkles size={10} /> Top
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mt-1 truncate" title={topEarner?.staffName}>
                {topEarner ? topEarner.staffName : "—"}
              </h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50/80 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <Award size={16} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-400 font-medium">Earned</span>
            <span className="text-sm font-semibold text-gray-900">
              ₹{topEarner ? topEarner.commission.toLocaleString("en-IN") : "0"}
            </span>
          </div>
        </div>

        {/* 2. Total Commission */}
        <div className="bg-white rounded-xl p-4 border border-gray-200/80 flex flex-col justify-between hover:border-gray-300 transition-colors">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Total Commission
              </p>
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1 tracking-tight">
                ₹{totalCommission.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50/80 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <CircleDollarSign size={16} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-medium">
            <span>Active Staff</span>
            <span className="text-gray-700 font-semibold">{filteredData.length} members</span>
          </div>
        </div>

        {/* 3. Total Billed Sales */}
        <div className="bg-white rounded-xl p-4 border border-gray-200/80 flex flex-col justify-between hover:border-gray-300 transition-colors">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Total Sales
              </p>
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1 tracking-tight">
                ₹{totalSales.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50/80 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-medium">
            <span>Period</span>
            <span className="text-gray-700 font-semibold truncate max-w-[140px]">
              {datePreset === "custom" && fromDate && toDate
                ? `${fromDate} - ${toDate}`
                : DATE_PRESET_OPTIONS.find((p) => p.value === datePreset)?.label || "All Dates"}
            </span>
          </div>
        </div>

        {/* 4. Total Invoices */}
        <div className="bg-white rounded-xl p-4 border border-gray-200/80 flex flex-col justify-between hover:border-gray-300 transition-colors">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Total Invoices
              </p>
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1 tracking-tight">
                {totalOrders}
              </h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-50/80 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <Receipt size={16} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-medium">
            <span>Avg / Bill</span>
            <span className="text-gray-700 font-semibold">
              ₹{totalOrders > 0 ? Math.round(totalSales / totalOrders).toLocaleString("en-IN") : 0}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Main Material React Table ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden p-1">
        <MaterialReactTable table={table} />
      </div>

      {/* ─── Commission Ledger Modal ───────────────────────────────────────── */}
      <CommissionLedgerModal
        isOpen={Boolean(selectedStaff)}
        staff={selectedStaff}
        onClose={() => setSelectedStaff(null)}
      />
    </div>
  );
};

export default StaffCommissionScreen;


