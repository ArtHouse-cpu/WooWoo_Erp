import { useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import { Eye, Minus, Plus, Settings2, Wallet } from "lucide-react";
import Swal from "sweetalert2";
import {
  handleBulkWalletUpdate,
  handleCreateWallet,
  handleGetWallets,
  handleUpdateWallet,
} from "@/services/apiClient";
import { useAppSelector } from "@/store/hooks";

type WalletRow = {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  walletAmount: number;
  lastActivity?: string;
  raw?: any;
};

type WalletInstruction = {
  minimumBalance: number;
};

type InstructionAction = "set_minimum" | "credit_all" | "debit_all";

function toAmount(...values: unknown[]) {
  for (const value of values) {
    const amount = Number(value);
    if (Number.isFinite(amount)) return amount;
  }
  return 0;
}

function getWalletRecordId(row: WalletRow) {
  const candidate = String(row.raw?._id ?? row.raw?.id ?? "").trim();
  return candidate.length > 0 ? candidate : "";
}

function hasExistingWalletRecord(row: WalletRow) {
  return getWalletRecordId(row).length > 0;
}

function toWalletRow(entry: any): WalletRow {
  const customer = entry?.customer ?? {};
  return {
    id: String(
      entry?._id ??
        entry?.id ??
        entry?.walletId ??
        customer?._id ??
        customer?.id ??
        customer?.mobile ??
        crypto.randomUUID(),
    ),
    customerId: String(
      entry?.customerId ?? customer?._id ?? customer?.id ?? "",
    ).trim(),
    customerName: String(
      entry?.customerName ?? customer?.name ?? entry?.name ?? "Unknown Customer",
    ).trim(),
    customerPhone: String(
      entry?.customerPhone ?? customer?.mobile ?? entry?.mobile ?? "-",
    ).trim(),
    walletAmount: toAmount(
      entry?.walletAmount,
      entry?.balance,
      entry?.currentBalance,
      entry?.availableBalance,
      customer?.walletAmount,
    ),
    lastActivity: String(entry?.updatedAt ?? entry?.createdAt ?? "").trim(),
    raw: entry,
  };
}

export default function WalletScreen() {
  const [search, setSearch] = useState("");
  const [walletRows, setWalletRows] = useState<WalletRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [instruction, setInstruction] = useState<WalletInstruction>({
    minimumBalance: 0,
  });
  const staff = useAppSelector((state) => state.user);

  const fetchWalletRows = async () => {
    try {
      setLoading(true);
      const walletResponse = await handleGetWallets({ search });
      const walletItems = Array.isArray(walletResponse?.wallets)
        ? walletResponse.wallets
        : Array.isArray(walletResponse?.data)
          ? walletResponse.data
          : Array.isArray(walletResponse)
            ? walletResponse
            : [];

      setWalletRows(walletItems.map(toWalletRow));
    } catch {
      setWalletRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchWalletRows();
  }, [search]);

  const handleSetInstruction = async () => {
    const result = await Swal.fire({
      title:
        '<h2 class="text-xl font-bold text-slate-800">Wallet Instructions</h2>',
      html: `
        <div class="mt-2 flex flex-col gap-4 text-left">
          <p class="text-sm text-slate-500">Set a global minimum wallet balance. Debit actions cannot reduce below this amount.</p>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Action</label>
            <select id="instruction-action" class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
              <option value="set_minimum">Only set minimum balance</option>
              <option value="credit_all">Add wallet amount to all customers</option>
              <option value="debit_all">Deduct wallet amount from all customers</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Minimum Balance (₹)</label>
            <input id="minimum-balance" type="number" min="0" step="1" value="${instruction.minimumBalance}" class="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="Enter minimum balance..." />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Bulk Amount (₹)</label>
            <input id="bulk-amount" type="number" min="0" step="1" class="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="Required only for add/deduct all..." />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Note</label>
            <input id="bulk-note" type="text" class="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="Optional remark for bulk action..." />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Save",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#64748b",
      customClass: {
        popup: "rounded-2xl",
        confirmButton: "px-6 py-2.5 rounded-lg font-semibold",
        cancelButton: "px-6 py-2.5 rounded-lg font-semibold",
      },
      preConfirm: () => {
        const actionInput = document.getElementById(
          "instruction-action",
        ) as HTMLSelectElement | null;
        const input = document.getElementById(
          "minimum-balance",
        ) as HTMLInputElement | null;
        const bulkAmountInput = document.getElementById(
          "bulk-amount",
        ) as HTMLInputElement | null;
        const noteInput = document.getElementById("bulk-note") as HTMLInputElement | null;
        const action = String(actionInput?.value ?? "set_minimum") as InstructionAction;
        const value = Number(input?.value ?? 0);
        const bulkAmount = Number(bulkAmountInput?.value ?? 0);
        const note = String(noteInput?.value ?? "").trim();

        if (!Number.isFinite(value) || value < 0) {
          Swal.showValidationMessage(
            "Minimum balance must be zero or a positive number.",
          );
          return undefined;
        }
        if (action !== "set_minimum" && (!Number.isFinite(bulkAmount) || bulkAmount <= 0)) {
          Swal.showValidationMessage("Enter a valid bulk amount for add/deduct all.");
          return undefined;
        }
        return { action, minimumBalance: value, bulkAmount, note };
      },
    });

    if (!result.isConfirmed || !result.value) return;

    const { action, minimumBalance, bulkAmount, note } = result.value;
   setInstruction({ minimumBalance });

if (action === "set_minimum") {
  try {
    await handleBulkWalletUpdate({
      type: "set_minimum",
      amount: bulkAmount,
        note,
        minimumBalance,
        createdBy: {
          m_staff_id: staff.m_staff_id,
          m_staff_name: staff.m_staff_name,
          m_staff_email: staff.m_staff_email,
        },
    });
// console.log("minimumBalance", minimumBalance); 
    await fetchWalletRows();

    await Swal.fire(
      "Instruction Saved",
      `Minimum balance set to ₹ ${minimumBalance.toLocaleString("en-IN")}.`,
      "success",
    );
  } catch (error: any) {
    await Swal.fire(
      "Update failed",
      error?.response?.data?.message ??
        "Could not update minimum balance.",
      "error",
    );
  }

  return;
}

    try {
      await handleBulkWalletUpdate({
        type: action === "credit_all" ? "credit" : "debit",
        amount: bulkAmount,
        note,
        minimumBalance,
        createdBy: {
          m_staff_id: staff.m_staff_id,
          m_staff_name: staff.m_staff_name,
          m_staff_email: staff.m_staff_email,
        },
      });
      await fetchWalletRows();
      await Swal.fire(
        "Bulk Update Complete",
        `Wallet amount ${action === "credit_all" ? "added to" : "deducted from"} all customers successfully.`,
        "success",
      );
    } catch (error: any) {
      await Swal.fire(
        "Bulk update failed",
        error?.response?.data?.message ?? "Could not apply bulk wallet update.",
        "error",
      );
    }
  };

  const handleWalletAction = async (row: WalletRow, type: "credit" | "debit") => {
    const actionLabel = type === "credit" ? "Add" : "Deduct";
    const existingRecord = hasExistingWalletRecord(row);

    if (type === "debit" && !existingRecord) {
      await Swal.fire(
        "Cannot deduct",
        "No wallet record exists for this customer yet. Please add amount first.",
        "warning",
      );
      return;
    }

    const result = await Swal.fire({
      title: `<h2 class="text-xl font-bold text-slate-800">${actionLabel} Wallet Amount</h2>`,
      html: `
        <div class="flex flex-col gap-4 text-left mt-2">
          <div class="text-sm text-slate-500 mb-2">Customer: <strong class="text-slate-700">${row.customerName}</strong></div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Amount (₹) <span class="text-red-500">*</span></label>
            <input id="wallet-amount" type="number" min="0" class="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="Enter amount..." />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Note / Remark</label>
            <input id="wallet-note" type="text" class="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="E.g., Cash added, Service refund..." />
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: actionLabel,
      confirmButtonColor: type === "credit" ? "#16a34a" : "#dc2626",
      cancelButtonColor: "#64748b",
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'px-6 py-2.5 rounded-lg font-semibold',
        cancelButton: 'px-6 py-2.5 rounded-lg font-semibold'
      },
      preConfirm: () => {
        const amountInput = document.getElementById("wallet-amount") as HTMLInputElement | null;
        const noteInput = document.getElementById("wallet-note") as HTMLInputElement | null;
        const amount = Number(amountInput?.value ?? 0);
        const note = String(noteInput?.value ?? "").trim();

        if (!Number.isFinite(amount) || amount <= 0) {
          Swal.showValidationMessage("Enter a valid amount.");
          return undefined;
        }
        if (type === "debit" && amount > row.walletAmount) {
          Swal.showValidationMessage("Cannot deduct more than available wallet amount.");
          return undefined;
        }
        const remainingBalance =
          type === "debit" ? row.walletAmount - amount : row.walletAmount + amount;
        if (remainingBalance < instruction.minimumBalance) {
          Swal.showValidationMessage(
            `Final balance cannot be less than minimum balance ₹ ${instruction.minimumBalance.toLocaleString("en-IN")}.`,
          );
          return undefined;
        }
        return { amount, note };
      },
    });

    if (!result.isConfirmed || !result.value) return;

    const payload = {
      type,
      amount: result.value.amount,
      note: result.value.note,
      minimumBalance: instruction.minimumBalance,
      customerId: row.customerId,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      createdBy: {
        m_staff_id: staff.m_staff_id,
        m_staff_name: staff.m_staff_name,
        m_staff_email: staff.m_staff_email,
      },
    };

    try {
      const walletRecordId = getWalletRecordId(row);
      if (!walletRecordId && type === "credit") {
        await handleCreateWallet(payload);
      } else {
        await handleUpdateWallet(walletRecordId, payload);
      }
      await fetchWalletRows();
      await Swal.fire("Updated", `Wallet amount ${type === "credit" ? "added" : "deducted"} successfully.`, "success");
    } catch (error: any) {
      Swal.fire(
        "Wallet update failed",
        error?.response?.data?.message ?? "Could not update wallet. Please verify the backend wallet API.",
        "error",
      );
    }
  };

  const handleViewHistory = async (row: WalletRow) => {
    const rawTransactions = Array.isArray(row.raw?.transactions)
      ? row.raw.transactions
      : [];
    const historyHtml =
      rawTransactions.length > 0
        ? rawTransactions
            .map((entry: any) => {
              const amount = toAmount(entry?.amount, entry?.value);
              const type = String(entry?.type ?? entry?.mode ?? "entry").toUpperCase();
              const note = String(entry?.note ?? entry?.remark ?? "-");
              const staffName = entry?.createdBy?.m_staff_name ?? entry?.staffName ?? "System";
              const dateObj = entry?.createdAt || entry?.date ? new Date(entry.createdAt || entry.date) : null;
              const dateStr = dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleString('en-IN', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              }) : "";
              
              const isCredit = type === "CREDIT" || type === "ADD";
              const typeBadgeClass = isCredit 
                ? "bg-green-100 text-green-700" 
                : "bg-red-100 text-red-700";
              const amountColorClass = isCredit ? "text-green-600" : "text-red-600";
              const amountPrefix = isCredit ? "+" : "-";

              return `
                <div class="flex flex-col gap-2 p-3 mb-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-1 rounded text-[10px] font-bold ${typeBadgeClass}">${type}</span>
                      <span class="text-sm font-medium text-slate-700 truncate max-w-[150px] sm:max-w-[250px]">${note}</span>
                    </div>
                    <strong class="text-base whitespace-nowrap ${amountColorClass}">${amountPrefix}₹ ${amount.toLocaleString("en-IN")}</strong>
                  </div>
                  <div class="flex justify-between items-center text-xs text-slate-500">
                    <div class="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      <span class="font-medium text-slate-600">${staffName}</span>
                    </div>
                    ${dateStr ? `
                    <div class="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 16.3V14"/><circle cx="16" cy="16" r="6"/></svg>
                      <span>${dateStr}</span>
                    </div>
                    ` : ''}
                  </div>
                </div>
              `;
            })
            .join("")
        : "<div class='p-6 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200 shadow-sm'>No wallet history available from the current API response.</div>";

    await Swal.fire({
      title: `<div class="text-left"><span class="text-lg font-bold text-slate-800">${row.customerName}</span><div class="text-sm font-normal text-slate-500">Wallet History</div></div>`,
      html: `<div style="text-align:left;max-height:400px;overflow-y:auto;padding-right:4px;" class="custom-scrollbar mt-4">${historyHtml}</div>`,
      width: 600,
      showConfirmButton: true,
      confirmButtonText: 'Close',
      confirmButtonColor: '#3b82f6',
      customClass: {
        popup: 'rounded-2xl',
      }
    });
  };

  const data = useMemo(() => walletRows, [walletRows]);
  const totalWallet = useMemo(
    () => walletRows.reduce((sum, row) => sum + row.walletAmount, 0),
    [walletRows],
  );
  const activeWallets = useMemo(
    () => walletRows.filter((row) => row.walletAmount > 0).length,
    [walletRows],
  );

  const columns = useMemo<MRT_ColumnDef<WalletRow>[]>(
    () => [
      { header: "Customer", accessorKey: "customerName", size: 220 },
      { header: "Phone", accessorKey: "customerPhone", size: 140 },
      {
        header: "Wallet Amount",
        accessorKey: "walletAmount",
        Cell: ({ cell }) => (
          <span className="font-semibold tabular-nums">
            ₹ {Number(cell.getValue() ?? 0).toLocaleString("en-IN")}
          </span>
        ),
        size: 130,
      },
      {
        header: "Last Activity",
        accessorKey: "lastActivity",
        Cell: ({ cell }) => {
          const value = String(cell.getValue() ?? "").trim();
          if (!value) return <span className="text-slate-400">-</span>;
          const date = new Date(value);
          return Number.isNaN(date.getTime()) ? (
            <span>{value}</span>
          ) : (
            <span>{date.toLocaleString("en-IN")}</span>
          );
        },
        size: 180,
      },
      {
        header: "Actions",
        id: "actions",
        size: 150,
        Cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleWalletAction(row.original, "credit")}
              className="rounded-lg bg-green-100 p-2 text-green-700 hover:bg-green-200"
              title="Add amount"
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              onClick={() => void handleWalletAction(row.original, "debit")}
              className="rounded-lg bg-red-100 p-2 text-red-700 hover:bg-red-200"
              title="Deduct amount"
            >
              <Minus size={16} />
            </button>
            <button
              type="button"
              onClick={() => void handleViewHistory(row.original)}
              className="rounded-lg bg-blue-100 p-2 text-blue-700 hover:bg-blue-200"
              title="View history"
            >
              <Eye size={16} />
            </button>
          </div>
        ),
      },
    ],
    [walletRows],
  );

  const table = useMaterialReactTable<WalletRow>({
    columns,
    data,
    state: { isLoading: loading },
    muiTablePaperProps: {
      elevation: 0,
      style: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
      },
    },
  });

  return (
    <div className="p-1">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Customer Wallets</h1>
          <p className="text-sm text-slate-500">
            Track wallet balance, add amount, deduct amount, and review activity.
          </p>
        </div>
        <div className="flex w-full max-w-3xl flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => void handleSetInstruction()}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
          >
            <Settings2 size={16} />
            Set Instructions
          </button>
          <div className="w-full max-w-md">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer by name or mobile..."
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Wallet size={18} />
            <span className="text-sm font-medium">Total Wallet Balance</span>
          </div>
          <div className="mt-3 text-2xl font-semibold">
            ₹ {totalWallet.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Customers With Balance</div>
          <div className="mt-3 text-2xl font-semibold">{activeWallets}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Wallet Records</div>
          <div className="mt-3 text-2xl font-semibold">{walletRows.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Minimum Balance Rule</div>
          <div className="mt-3 text-2xl font-semibold">
            ₹ {instruction.minimumBalance.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      <MaterialReactTable table={table} />
    </div>
  );
}
