import { useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import Swal from "sweetalert2";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import {
  handleEnrollCsp,
  handleGetAllCustomers,
  handleGetCspEnrollments,
  handleUpdateCsp,
  type CspEnrollment,
} from "@/services/apiClient";

type CustomerOption = {
  _id: string;
  name?: string;
  mobile?: string;
  email?: string;
  membershipType?: string;
};

export default function CspScreen() {
  const [rows, setRows] = useState<CspEnrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">(
    "active",
  );

  const fetchRows = async () => {
    try {
      setLoading(true);
      const res = await handleGetCspEnrollments({ status: statusFilter });
      const list = Array.isArray(res?.enrollments)
        ? res.enrollments
        : Array.isArray(res?.csps)
          ? res.csps
          : [];
      setRows(list);
    } catch (error) {
      console.error("Failed to load CSP:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [statusFilter]);

  useEffect(() => {
    if (!showEnroll) return;
    (async () => {
      try {
        const res = await handleGetAllCustomers();
        const list = Array.isArray(res?.customers) ? res.customers : [];
        setCustomers(
          list
            .filter(
              (c: any) =>
                String(c.membershipType || "")
                  .trim()
                  .toLowerCase() === "premium",
            )
            .map((c: any) => ({
              _id: String(c._id),
              name: c.name,
              mobile: c.mobile,
              email: c.email,
              membershipType: c.membershipType,
            })),
        );
      } catch (error) {
        console.error("Failed to load customers:", error);
        setCustomers([]);
      }
    })();
  }, [showEnroll]);

  const handleEnroll = async () => {
    if (!selectedCustomerId) {
      Swal.fire("Customer required", "Select a customer to enroll.", "warning");
      return;
    }
    try {
      setEnrolling(true);
      const res = await handleEnrollCsp({ customerId: selectedCustomerId });
      if (!res?.success) {
        throw new Error(res?.message || "Enrollment failed");
      }
      Swal.fire(
        "Enrolled",
        res.message || "CSP seller enrolled (Customer + Vendor linked).",
        "success",
      );
      setShowEnroll(false);
      setSelectedCustomerId("");
      await fetchRows();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to enroll CSP seller.";
      Swal.fire("Error", msg, "error");
    } finally {
      setEnrolling(false);
    }
  };

  const toggleStatus = async (row: CspEnrollment) => {
    const next = row.status === "active" ? "inactive" : "active";
    try {
      await handleUpdateCsp(row._id, { status: next });
      await fetchRows();
    } catch (error: any) {
      Swal.fire(
        "Error",
        error?.response?.data?.message || "Failed to update status.",
        "error",
      );
    }
  };

  const columns = useMemo<MRT_ColumnDef<CspEnrollment>[]>(
    () => [
      {
        accessorKey: "label",
        header: "CSP Label",
        Cell: ({ row }) => (
          <span className="font-semibold text-slate-800">
            {row.original.label ||
              `CSP · ${row.original.displayName || row.original.customer?.name || "Seller"}`}
          </span>
        ),
      },
      {
        accessorKey: "mobile",
        header: "Mobile",
        Cell: ({ row }) =>
          row.original.mobile ||
          row.original.customer?.mobile ||
          row.original.vendor?.mobile ||
          "—",
      },
      {
        id: "customer",
        header: "Customer",
        Cell: ({ row }) => row.original.customer?.name || row.original.displayName || "—",
      },
      {
        id: "vendor",
        header: "Linked Vendor",
        Cell: ({ row }) => row.original.vendor?.name || "—",
      },
      {
        accessorKey: "sailorSharePercent",
        header: "Seller %",
        Cell: ({ cell }) => `${Number(cell.getValue() ?? 70)}%`,
      },
      {
        accessorKey: "status",
        header: "Status",
        Cell: ({ cell }) => {
          const status = String(cell.getValue() || "active");
          return (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {status}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        Cell: ({ row }) => (
          <Can anyOf={[PERMISSIONS.CSP_WRITE, PERMISSIONS.CUSTOMER_UPDATE]}>
            <button
              type="button"
              onClick={() => toggleStatus(row.original)}
              className="rounded bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
            >
              {row.original.status === "active" ? "Deactivate" : "Activate"}
            </button>
          </Can>
        ),
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: rows,
    state: { isLoading: loading },
    enableColumnActions: false,
    enableDensityToggle: false,
    initialState: { density: "compact" },
  });

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Customer Seller Program (CSP)
          </h1>
          <p className="text-sm text-slate-500">
            Enroll Premium customers as sellers. A vendor record is linked
            automatically. CSP products credit 70% to the seller wallet on invoice.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "active" | "inactive" | "all")
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
          <Can
            anyOf={[PERMISSIONS.CSP_WRITE, PERMISSIONS.CUSTOMER_CREATE]}
          >
            <button
              type="button"
              onClick={() => setShowEnroll(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Enroll Seller
            </button>
          </Can>
        </div>
      </div>

      <MaterialReactTable table={table} />

      {showEnroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Enroll CSP Seller</h2>
            <p className="mt-1 text-sm text-slate-500">
              Only <span className="font-medium text-slate-700">Premium</span> members
              can become CSP sellers. A vendor record is linked automatically.
            </p>
            <label className="mt-4 mb-1 block text-sm font-medium text-slate-700">
              Premium Customer *
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            >
              <option value="">Select Premium customer</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.mobile ? `(${c.mobile})` : ""} · Premium
                </option>
              ))}
            </select>
            {customers.length === 0 && (
              <p className="mt-2 text-xs text-amber-600">
                No Premium customers found. Activate Premium membership first, then enroll.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowEnroll(false);
                  setSelectedCustomerId("");
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                disabled={enrolling}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEnroll}
                disabled={enrolling}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {enrolling ? "Enrolling…" : "Enroll"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
