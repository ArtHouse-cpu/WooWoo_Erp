import { useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { Link } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  LayoutList,
  ShoppingBasket,
  SquarePen,
  Trash2,
  Wallet,
  Search,
  X,
  Loader2,
} from "lucide-react";
import { handleGetCustomers, handleGetWallets, handleGetMemberships } from "@/services/apiClient";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";

export default function MembershipScreen() {
  const [walletTotal, setWalletTotal] = useState(0);
  const [walletCustomers, setWalletCustomers] = useState(0);

  useEffect(() => {
    const loadWalletSummary = async () => {
      try {
        const [walletResponse, customerResponse] = await Promise.allSettled([
          handleGetWallets(),
          handleGetCustomers(),
        ]);

        const walletItems =
          walletResponse.status === "fulfilled"
            ? Array.isArray(walletResponse.value?.wallets)
              ? walletResponse.value.wallets
              : Array.isArray(walletResponse.value?.data)
                ? walletResponse.value.data
                : Array.isArray(walletResponse.value)
                  ? walletResponse.value
                  : []
            : [];

        if (walletItems.length > 0) {
          const total = walletItems.reduce((sum: number, wallet: any) => {
            const amountCandidates = [
              wallet?.walletAmount,
              wallet?.balance,
              wallet?.currentBalance,
              wallet?.availableBalance,
            ];
            const amount =
              amountCandidates.find((value) => Number.isFinite(Number(value))) ?? 0;
            return sum + Number(amount);
          }, 0);
          setWalletTotal(total);
          setWalletCustomers(walletItems.length);
          return;
        }

        const customers =
          customerResponse.status === "fulfilled" &&
          Array.isArray(customerResponse.value?.customers)
            ? customerResponse.value.customers
            : [];
        const total = customers.reduce(
          (sum: number, customer: any) =>
            sum + Number(customer?.walletAmount ?? customer?.closingBalance ?? 0),
          0,
        );
        setWalletTotal(total);
        setWalletCustomers(
          customers.filter(
            (customer: any) =>
              Number(customer?.walletAmount ?? customer?.closingBalance ?? 0) > 0,
          ).length,
        );
      } catch {
        setWalletTotal(0);
        setWalletCustomers(0);
      }
    };

    void loadWalletSummary();
  }, []);

  const columns = useMemo(
    () => [
      { accessorKey: "id", header: "ID", size: 20 },
      { accessorKey: "membership_name", header: "Membership Name", size: 80 },
      { accessorKey: "description", header: "Description", size: 300 },
      { accessorKey: "price", header: "Price" },
      { accessorKey: "validity", header: "Validity" },
      { accessorKey: "plan_images", header: "Plan Images" },

      {
        header: "Actions",
        accessorKey: "actions",
        Cell: ({ row }: { row: any }) => (
          <div className="flex items-center gap-2">
            <Can permission={PERMISSIONS.MEMBERSHIP_PLAN_MANAGE}>
              <button
                onClick={() => console.log("Edit:", row.original)}
                className="px-3 py-2 text-sm bg-green-100 text-white rounded hover:bg-green-200 cursor-pointer"
              >
                <SquarePen color="green" size={18} />
              </button>
            </Can>

            <Can permission={PERMISSIONS.MEMBERSHIP_PLAN_MANAGE}>
              <button
                onClick={() => console.log("Delete:", row.original)}
                className="px-3 py-2 text-sm bg-red-100 rounded hover:bg-red-200 cursor-pointer"
              >
                <Trash2 color="red" size={18} />
              </button>
            </Can>
          </div>
        ),
      },
    ],
    []
  );

  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewPlan, setViewPlan] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (item) =>
        (item.membership_name || "").toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q) ||
        (item.validity || "").toLowerCase().includes(q) ||
        String(item.id || "").toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  useEffect(() => {
    const fetchMemberships = async () => {
      try {
        setIsLoading(true);
        // Assuming handleGetMemberships is available in apiClient
        const res = await handleGetMemberships();
        const memberships = Array.isArray(res?.memberships) ? res.memberships : [];
        
        const mappedData = memberships.map((m: any, index: number) => ({
          id: m.planId || m._id || (index + 1),
          membership_name: m.displayName || "Unknown Plan",
          description: m.description || "No description provided.",
          price: m.pricing?.amount?.toString() || "0",
          validity: m.pricing?.period || "N/A",
          plan_images: 0, // Placeholder as backend doesn't store plan images yet
        }));
        
        setData(mappedData);
      } catch (error) {
        console.error("Failed to fetch memberships:", error);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchMemberships();
  }, []);

  const table = useMaterialReactTable({
    columns,
    data,
    muiTablePaperProps: {
      elevation: 0,
      style: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
      },
    },
    muiTableContainerProps: {
      sx: {
        maxWidth: "100%",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      },
    },
  });

  const cards = [
    {
      title: "Total Members",
      value: 100,
      icon: <ShoppingBasket size={22} className="text-gray-500" />,
    },
    {
      title: "Active Members",
      value: "50",
      icon: <Boxes size={22} className="text-gray-500" />,
    },
    {
      title: "New Members",
      value: "5",
      icon: <LayoutList size={22} className="text-gray-500" />,
    },

    {
      title: "Old Members",
      value: 50,
      icon: <ArrowDownCircle size={22} className="text-gray-500" />,
    },
    {
      title: "Pending Renewals",
      value: 50,
      icon: <ArrowUpCircle size={22} className="text-gray-500" />,
    },
    {
      title: "Wallet Balance",
      value: `₹ ${walletTotal.toLocaleString("en-IN")}`,
      icon: <Wallet size={22} className="text-gray-500" />,
    },
    {
      title: "Wallet Customers",
      value: walletCustomers,
      icon: <ShoppingBasket size={22} className="text-gray-500" />,
    },
  ];
  return (
    <div className="min-w-0 p-1">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Membership List</h1>
        <Can permission={PERMISSIONS.MEMBERSHIP_PLAN_MANAGE}>
          <Link
            className="w-full rounded bg-black px-3 py-2 text-center text-[14px] font-semibold text-white transition sm:w-auto"
            to="/create-new-membership"
          >
            Create Membership
          </Link>
        </Can>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
        {cards.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 hover:shadow-sm transition duration-300"
          >
            <div className="flex items-center gap-2 text-gray-600">
              {item.icon}
              <span className="text-xs sm:text-sm font-medium">{item.title}</span>
            </div>

            <div className="mt-2 sm:mt-3 text-lg sm:text-2xl font-semibold">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Mobile Search */}
      <div className="relative mb-3 block md:hidden">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search membership plans..."
          className="w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-9 pr-8 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-2xs outline-none transition focus:border-slate-400"
        />
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <MaterialReactTable table={table} />
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-2.5">
        {isLoading && data.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-8 text-center text-slate-400">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-orange-500" />
            <p className="mt-2 text-xs font-medium">Loading memberships...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            {searchQuery ? "No memberships match your search." : "No memberships found."}
          </div>
        ) : (
          filteredData.map((plan: any, idx: number) => {
            const price = Number(plan.price || 0);

            return (
              <div
                key={plan.id || idx}
                onClick={() => setViewPlan(plan)}
                className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition hover:border-slate-300 active:bg-slate-50/70"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-slate-900">
                        {plan.membership_name}
                      </span>
                      {plan.validity && plan.validity !== "N/A" && (
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
                          {plan.validity}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {plan.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block text-sm font-bold text-slate-900">
                      ₹{price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      #{plan.id}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <span className="text-[11px] font-medium text-slate-400">
                    Tap to view details
                  </span>

                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Can permission={PERMISSIONS.MEMBERSHIP_PLAN_MANAGE}>
                      <button
                        type="button"
                        onClick={() => console.log("Edit:", plan)}
                        className="cursor-pointer rounded-lg bg-green-50 p-1.5 text-green-700 hover:bg-green-100 transition"
                        title="Edit plan"
                      >
                        <SquarePen size={15} />
                      </button>
                    </Can>
                    <Can permission={PERMISSIONS.MEMBERSHIP_PLAN_MANAGE}>
                      <button
                        type="button"
                        onClick={() => console.log("Delete:", plan)}
                        className="cursor-pointer rounded-lg bg-red-50 p-1.5 text-red-700 hover:bg-red-100 transition"
                        title="Delete plan"
                      >
                        <Trash2 size={15} />
                      </button>
                    </Can>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Plan View Details Modal */}
      {viewPlan && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setViewPlan(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Membership Plan Details
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  ID: {viewPlan.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewPlan(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4">
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-lg font-bold text-slate-900">
                    {viewPlan.membership_name}
                  </h4>
                  {viewPlan.validity && viewPlan.validity !== "N/A" && (
                    <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                      {viewPlan.validity}
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-3 text-center">
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Price
                    </span>
                    <span className="text-base font-bold text-slate-900">
                      ₹{Number(viewPlan.price || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Validity
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {viewPlan.validity || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {viewPlan.description && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
                  <span className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Plan Description
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {viewPlan.description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setViewPlan(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
