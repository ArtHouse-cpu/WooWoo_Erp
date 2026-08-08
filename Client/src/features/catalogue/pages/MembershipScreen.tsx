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
    <div className="p-1">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold ">Membership List</h1>
        <Can permission={PERMISSIONS.MEMBERSHIP_PLAN_MANAGE}>
          <Link
            className="w-[165px] bg-black text-white py-2 px-3 rounded  text-[14px] font-semibold transition text-center border-radius-[50px]"
            to="/create-new-membership"
          >
            Create Membership
          </Link>
        </Can>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-3">
        {cards.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-gray-200 p-4  hover:shadow-sm transition duration-300 cursor-pointer"
          >
            <div className="flex items-center gap-2 text-gray-600">
              {item.icon}
              <span className="font-medium">{item.title}</span>
            </div>

            <div className="mt-3 text-2xl font-semibold">{item.value}</div>
          </div>
        ))}
      </div>
      <MaterialReactTable table={table} />
    </div>
  );
}
