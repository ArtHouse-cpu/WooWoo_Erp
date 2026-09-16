import React, { useEffect, useMemo, useState } from "react";
import { X, Percent, IndianRupee, Pencil, Trash2 } from "lucide-react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import Swal from "sweetalert2";
import {
  handleGetMemberships,
  handleSetCommissionRule,
  handleGetCommissionRules,
  handleUpdateCommissionRule,
  handleDeleteCommissionRule,
  type MembershipPlanPayload,
  type CommissionRule,
} from "@/services/apiClient";

interface SetCommissionRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const SetCommissionRuleModal: React.FC<SetCommissionRuleModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [membershipType, setMembershipType] = useState("");
  const [commissionType, setCommissionType] = useState<"flat" | "percentage">(
    "percentage",
  );
  const [commissionValue, setCommissionValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [memberships, setMemberships] = useState<MembershipPlanPayload[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);

  const [loading, setLoading] = useState(false);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setMembershipType("");
    setCommissionType("percentage");
    setCommissionValue("");
    setEditingId(null);
    setError("");
  };

  const loadRules = async (signal?: AbortSignal) => {
    try {
      setRulesLoading(true);
      const res = await handleGetCommissionRules(signal);
      setRules(Array.isArray(res?.commission) ? res.commission : []);
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
      console.error("Commission rules Error:", err);
      setRules([]);
    } finally {
      setRulesLoading(false);
    }
  };

  const getMembershipType = async (signal?: AbortSignal) => {
    try {
      setMembershipLoading(true);
      setError("");
      const response = await handleGetMemberships({ status: "Active" }, signal);
      setMemberships(
        Array.isArray(response?.memberships) ? response.memberships : [],
      );
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
      console.error("Membership Error:", err);
      setError(
        err?.response?.data?.message || "Failed to fetch membership types",
      );
      setMemberships([]);
    } finally {
      setMembershipLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const ac = new AbortController();
    resetForm();
    void getMembershipType(ac.signal);
    void loadRules(ac.signal);
    return () => ac.abort();
  }, [isOpen]);

  const handleEdit = (rule: CommissionRule) => {
    setEditingId(rule._id);
    setMembershipType(String(rule.membershipType || "").toLowerCase());
    setCommissionType(rule.commissionType === "flat" ? "flat" : "percentage");
    setCommissionValue(String(rule.commissionValue ?? ""));
    setError("");
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleDelete = async (rule: CommissionRule) => {
    const result = await Swal.fire({
      title: "Delete rule?",
      text: `Remove commission for "${rule.membershipType}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;

    try {
      const res = await handleDeleteCommissionRule(rule._id);
      if (!res.success) {
        await Swal.fire(
          "Error",
          res.message || "Failed to delete commission rule",
          "error",
        );
        return;
      }
      if (editingId === rule._id) resetForm();
      await loadRules();
      await Swal.fire("Deleted", "Commission rule removed.", "success");
    } catch (err: any) {
      console.error("Delete commission Error:", err);
      await Swal.fire(
        "Error",
        err?.response?.data?.message || "Failed to delete commission rule",
        "error",
      );
    }
  };

  const columns = useMemo<MRT_ColumnDef<CommissionRule>[]>(
    () => [
      {
        accessorKey: "membershipType",
        header: "Membership",
        Cell: ({ cell }) => (
          <span className="font-semibold text-gray-900 capitalize">
            {cell.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "commissionType",
        header: "Type",
        Cell: ({ cell }) => {
          const type = cell.getValue<"flat" | "percentage">();
          return (
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${
                type === "percentage"
                  ? "bg-blue-50 text-blue-700 border-blue-100"
                  : "bg-amber-50 text-amber-700 border-amber-100"
              }`}
            >
              {type === "percentage" ? "Percentage" : "Flat"}
            </span>
          );
        },
      },
      {
        accessorKey: "commissionValue",
        header: "Value",
        Cell: ({ row }) => {
          const { commissionType: type, commissionValue: value } = row.original;
          return (
            <span className="font-bold text-emerald-700">
              {type === "percentage"
                ? `${value}%`
                : `₹${Number(value || 0).toLocaleString("en-IN")}`}
            </span>
          );
        },
      },
      {
        accessorKey: "isActive",
        header: "Status",
        Cell: ({ cell }) => {
          const active = cell.getValue<boolean>() !== false;
          return (
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${
                active
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-gray-100 text-gray-500 border-gray-200"
              }`}
            >
              {active ? "Active" : "Inactive"}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        Cell: ({ cell }) => (
          <span className="text-xs text-gray-500">
            {formatDate(cell.getValue<string>())}
          </span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        Cell: ({ cell }) => (
          <span className="text-xs text-gray-500">
            {formatDate(cell.getValue<string>())}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Action",
        size: 120,
        enableSorting: false,
        Cell: ({ row }) => {
          const rule = row.original;
          const isEditing = editingId === rule._id;
          return (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                title="Edit"
                onClick={() => handleEdit(rule)}
                className={`inline-flex items-center justify-center rounded-md border p-1.5 transition ${
                  isEditing
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                }`}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                title="Delete"
                onClick={() => void handleDelete(rule)}
                className="inline-flex items-center justify-center rounded-md border border-gray-200 p-1.5 text-gray-600 transition hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        },
      },
    ],
    [editingId],
  );

  const rulesTable = useMaterialReactTable({
    columns,
    data: rules,
    enableSorting: true,
    enablePagination: true,
    enableColumnFilters: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableHiding: false,
    state: { isLoading: rulesLoading },
    initialState: {
      pagination: { pageSize: 5, pageIndex: 0 },
      density: "compact",
    },
    muiTablePaperProps: {
      elevation: 0,
      sx: { border: "1px solid #e5e7eb", borderRadius: "12px" },
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!membershipType) {
      setError("Please select membership type");
      return;
    }
    if (!commissionValue) {
      setError("Please enter commission value");
      return;
    }

    const value = Number(commissionValue);
    if (value < 0) {
      setError("Commission value cannot be negative");
      return;
    }
    if (commissionType === "percentage" && value > 100) {
      setError("Percentage commission cannot be greater than 100");
      return;
    }

    try {
      setLoading(true);

      if (editingId) {
        const response = await handleUpdateCommissionRule({
          id: editingId,
          membershipType,
          commissionType,
          commissionValue: value,
        });
        if (!response.success) {
          setError(response.message || "Failed to update commission rule");
          return;
        }
      } else {
        const response = await handleSetCommissionRule({
          membershipType,
          commissionType,
          commissionValue: value,
        });
        if (!response.success) {
          setError(response.message || "Failed to create commission rule");
          return;
        }
      }

      resetForm();
      await loadRules();
    } catch (err: any) {
      console.error("Commission Error:", err);
      setError(
        err?.response?.data?.message ||
          (editingId
            ? "Failed to update commission rule"
            : "Failed to create commission rule"),
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? "Edit Commission Rule" : "Set Commission Rule"}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Configure commission based on membership type.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-5 py-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Membership Type
              </label>
              <select
                value={membershipType}
                onChange={(e) => setMembershipType(e.target.value)}
                disabled={membershipLoading}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              >
                <option value="">
                  {membershipLoading
                    ? "Loading memberships..."
                    : "Select membership type"}
                </option>
                {memberships.map((membership) => {
                  const planId = String(
                    membership.planId || membership._id || "",
                  ).toLowerCase();
                  return (
                    <option
                      key={membership._id || membership.planId}
                      value={planId}
                    >
                      {membership.displayName || membership.planId}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Commission Type
                </label>
                <div className="inline-flex w-full rounded-lg border border-gray-200 bg-gray-50 p-1">
                  <button
                    type="button"
                    onClick={() => setCommissionType("percentage")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition ${
                      commissionType === "percentage"
                        ? "bg-white text-blue-700 shadow-sm border border-blue-100"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Percent size={14} />
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommissionType("flat")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition ${
                      commissionType === "flat"
                        ? "bg-white text-blue-700 shadow-sm border border-blue-100"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <IndianRupee size={14} />
                    Flat
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Commission Value
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={commissionType === "percentage" ? 100 : undefined}
                    step="0.01"
                    value={commissionValue}
                    onChange={(e) => setCommissionValue(e.target.value)}
                    placeholder={
                      commissionType === "percentage"
                        ? "Enter percentage"
                        : "Enter flat amount"
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    {commissionType === "percentage" ? "%" : "₹"}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
            {editingId ? (
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={loading}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel Edit
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading || membershipLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? editingId
                  ? "Updating..."
                  : "Saving..."
                : editingId
                  ? "Update Rule"
                  : "Save Rule"}
            </button>
          </div>
        </form>

        <div className="border-t border-gray-200 px-5 py-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Saved commission rules
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Edit or delete rules from the Action column
            </p>
          </div>
          <MaterialReactTable table={rulesTable} />
        </div>
      </div>
    </div>
  );
};

export default SetCommissionRuleModal;
