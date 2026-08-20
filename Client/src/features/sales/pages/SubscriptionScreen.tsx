import { useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import {
  Eye,
  Search,
  Edit,
  XCircle,
  Trash2,
  Download,
  Ellipsis,
  ArrowUpCircle,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  handleDeleteSubscription,
  handleGetMemberships,
  handleGetAllSubscriptions,
} from "@/services/apiClient";
import { downloadInvoicePdf, getInvoicePdfBlob } from "@/utils/pdfGenerator";
import {
  buildWoowooInvoiceWhatsAppMessage,
  normalizeIndianWhatsAppDigits,
  resolveHostedInvoiceLink,
} from "@/utils/whatsappInvoiceShare";
import CreateSubscriptionScreen from "./CreateSubscriptionScreen";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";

type SubscriptionStatus =
  | "active"
  | "completed"
  | "expired"
  | "error"
  | "cancelled"
  | "inactive";

type SubscriptionRow = {
  id: number;
  amount: number;
  subscriptionCode: string;
  customer: string;
  phone: string;
  period: string;
  repeatUnit: string;
  repeatEvery: string;
  invoiceCount: number;
  upcomingOn: string;
  upcomingTime: string;
  status: SubscriptionStatus;
  subscriptionType: string;
  _id: string;
  raw: any;
};

const tabs: Array<SubscriptionStatus | "all"> = [
  "all",
  "active",
  "inactive",
  "expired",
  "cancelled",
];

function paymentStatusForWhatsApp(
  raw: Record<string, unknown>,
  rowStatus: string,
): string {
  const paymentStatus = String(raw.paymentStatus ?? "").toLowerCase();
  if (paymentStatus === "full") return "Paid";
  if (paymentStatus === "partial") return "Partially Paid";
  return rowStatus;
}

export default function SubscriptionScreen() {
  const [activeTab, setActiveTab] = useState<SubscriptionStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [memberships, setMemberships] = useState<
    Array<{ planId: string; displayName: string; status: string }>
  >([]);
  const [subscriptionTypeFilter, setSubscriptionTypeFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [data, setData] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedActionRow, setSelectedActionRow] =
    useState<SubscriptionRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<
    "create" | "edit" | "view" | "upgrade" | "bulk"
  >("create");
  const [modalData, setModalData] = useState<any>(null);
  const [membershipPlans, setMembershipPlans] = useState<
    Array<{
      planId: string;
      displayName: string;
      priority: number;
      _id?: string;
    }>
  >([]);

  useEffect(() => {
    const fetchMemberships = async () => {
      try {
        const response = await handleGetMemberships({ status: "All" });
        const list = Array.isArray(response?.memberships)
          ? response.memberships
          : [];
        setMemberships(
          list
            .map((membership: any) => ({
              planId: String(membership?.planId ?? "")
                .trim()
                .toLowerCase(),
              displayName: String(membership?.displayName ?? "").trim(),
              status: String(membership?.status ?? "Active"),
            }))
            .filter((membership: { planId: string; displayName: string }) =>
              Boolean(membership.planId && membership.displayName),
            ),
        );
        setMembershipPlans(
          list.map((membership: any) => ({
            _id: String(membership?._id ?? ""),
            planId: String(membership?.planId ?? "")
              .trim()
              .toLowerCase(),
            displayName: String(membership?.displayName ?? "").trim(),
            priority: Math.max(0, Number(membership?.priority ?? 0) || 0),
          })),
        );
      } catch {
        setMemberships([]);
        setMembershipPlans([]);
      }
    };
    void fetchMemberships();
  }, []);

  const resolveRowPriority = (raw: any): number => {
    const stored = Number(raw?.priority ?? 0);
    if (Number.isFinite(stored) && stored > 0) return stored;
    const type = String(raw?.membershipType ?? raw?.membershipPlanId ?? "")
      .trim()
      .toLowerCase();
    if (!type || type.includes("junior") || type.includes("junoir")) return 0;
    const match = membershipPlans.find(
      (p) =>
        p.planId === type ||
        p.displayName.toLowerCase().includes(type) ||
        String(raw?.membershipId ?? "") === p._id,
    );
    return Math.max(0, Number(match?.priority ?? 0) || 0);
  };

  const handleAction = async (
    action: "view" | "edit" | "delete" | "upgrade",
  ) => {
    if (!selectedActionRow) return;
    const { _id, raw } = selectedActionRow;

    if (action === "view") {
      setModalMode("view");
      setModalData(raw);
      setIsModalOpen(true);
    } else if (action === "edit") {
      setModalMode("edit");
      setModalData(raw);
      setIsModalOpen(true);
    } else if (action === "upgrade") {
      if (selectedActionRow.status === "cancelled") {
        Swal.fire(
          "Cannot upgrade",
          "Cancelled subscriptions cannot be upgraded.",
          "warning",
        );
        return;
      }
      const currentPriority = resolveRowPriority(raw);
      setModalMode("upgrade");
      setModalData({
        ...raw,
        priority: currentPriority,
      });
      setIsModalOpen(true);
    } else if (action === "delete") {
      const confirm = await Swal.fire({
        title: "Delete Subscription?",
        text: "This action cannot be undone.",
        icon: "error",
        showCancelButton: true,
        confirmButtonText: "Yes, Delete",
      });
      if (confirm.isConfirmed) {
        try {
          await handleDeleteSubscription(_id);
          Swal.fire("Deleted", "Subscription deleted successfully.", "success");
          fetchSubscriptions();
        } catch {
          Swal.fire("Error", "Could not delete subscription.", "error");
        }
      }
    }
    setSelectedActionRow(null);
  };

  const formatDate = (value?: string | Date) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (value?: string | Date) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toStatus = (raw: unknown): SubscriptionStatus => {
    const v = String(raw ?? "").toLowerCase();
    if (v === "completed") return "completed";
    if (v === "expired") return "expired";
    if (v === "error") return "error";
    if (v === "cancelled") return "cancelled";
    return "active";
  };

  /** True when membership end date is before today (calendar day). */
  const isEndDatePassed = (raw: any): boolean => {
    const endDateRaw = raw?.endDate ?? raw?.dueDate;
    if (!endDateRaw) return false;
    const endDate = new Date(endDateRaw);
    if (Number.isNaN(endDate.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    return endDate.getTime() < today.getTime();
  };

  const resolveDisplayStatus = (
    subscription: any,
    matchedPlanStatus?: string,
  ): SubscriptionStatus => {
    let status = toStatus(subscription?.status);
    if (status === "cancelled" || status === "error") return status;
    if (matchedPlanStatus === "Inactive") return "inactive";
    // Past end date counts as expired even if DB status is still "active"
    if (status === "expired" || isEndDatePassed(subscription)) return "expired";
    return status;
  };

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const [response, membershipRes] = await Promise.all([
        handleGetAllSubscriptions(search.trim()),
        handleGetMemberships({ status: "All" }),
      ]);

      const membershipList = Array.isArray(membershipRes?.memberships)
        ? membershipRes.memberships.map((m: any) => ({
            planId: String(m?.planId ?? "")
              .trim()
              .toLowerCase(),
            status: String(m?.status ?? "Active"),
          }))
        : [];

      const subscriptions = Array.isArray(response?.subscriptions)
        ? response.subscriptions
        : [];

      const rows: SubscriptionRow[] = subscriptions.map(
        (subscription: any, index: number) => {
          const planId = String(
            subscription?.membershipPlanId ||
              subscription?.membershipType ||
              "",
          )
            .trim()
            .toLowerCase();
          const matchedPlan = membershipList.find(
            (m: any) => m.planId === planId,
          );

          const status = resolveDisplayStatus(
            subscription,
            matchedPlan?.status,
          );

          return {
            id: index + 1,
            amount: Number(
              subscription?.grandTotal ?? subscription?.amount ?? 0,
            ),
            subscriptionCode: String(
              subscription?.subscriptionCode ??
                `SUB-${subscription?.subscriptionNumber ?? index + 1001}`,
            ),
            customer: String(
              subscription?.customerName ?? subscription?.name ?? "",
            ),
            phone: String(
              subscription?.customerPhone ??
                subscription?.mobile ??
                subscription?.phone ??
                "",
            ),
            period: `${formatDate(subscription?.startDate ?? subscription?.invoiceDate ?? subscription?.createdAt)} - ${formatDate(subscription?.endDate ?? subscription?.dueDate ?? subscription?.createdAt)}`,
            repeatUnit: String(subscription?.repeatUnit ?? "1 year"),
            repeatEvery: String(subscription?.repeatEvery ?? "1"),
            invoiceCount: Number(
              subscription?.invoiceCount ?? subscription?.noOfInvoices ?? 0,
            ),
            upcomingOn: formatDate(
              subscription?.upcomingDate ??
                subscription?.nextInvoiceDate ??
                subscription?.createdAt,
            ),
            upcomingTime: formatDateTime(
              subscription?.upcomingDate ??
                subscription?.nextInvoiceDate ??
                subscription?.createdAt,
            ),
            status,
            subscriptionType: String(
              subscription?.membershipType ||
                subscription?.items?.[0]?.productName ||
                "general",
            ).toLowerCase(),
            _id: String(subscription?._id ?? ""),
            raw: subscription,
          };
        },
      );

      setData(rows);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void fetchSubscriptions();
  }, []);

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((row) => {
      const statusOk = activeTab === "all" || row.status === activeTab;
      const searchOk =
        !term ||
        row.subscriptionCode.toLowerCase().includes(term) ||
        row.customer.toLowerCase().includes(term) ||
        row.phone.toLowerCase().includes(term);

      const typeOk =
        subscriptionTypeFilter === "all" ||
        row.subscriptionType === subscriptionTypeFilter;

      const expiryOk = (() => {
        if (expiryFilter === "all") return true;

        // Explicit expired filter: past end date OR status already expired
        if (expiryFilter === "expired") {
          return row.status === "expired" || isEndDatePassed(row.raw);
        }

        const endDateRaw = row.raw?.endDate ?? row.raw?.dueDate;
        if (!endDateRaw) return false;

        const endDate = new Date(endDateRaw);
        if (Number.isNaN(endDate.getTime())) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil(
          (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Upcoming-expiry filters only show memberships that are still valid
        if (diffDays < 0) return false;

        if (expiryFilter === "day") return diffDays <= 1;
        if (expiryFilter === "week") return diffDays <= 7;
        if (expiryFilter === "month") return diffDays <= 30;
        if (expiryFilter === "year") return diffDays <= 365;

        return true;
      })();

      return statusOk && searchOk && typeOk && expiryOk;
    });
  }, [activeTab, data, search, subscriptionTypeFilter, expiryFilter]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "customer",
        header: "Customer",
        Cell: ({ row }: { row: { original: SubscriptionRow } }) => (
          <div>
            <div className="font-medium text-gray-800">
              {row.original.customer}
            </div>
            <div className="text-xs text-gray-500">{row.original.phone}</div>
          </div>
        ),
        size: 180,
      },
      {
        accessorKey: "amount",
        header: "Amount",
        Cell: ({ row }: { row: { original: SubscriptionRow } }) => (
          <span className="font-semibold text-gray-800">
            {`₹ ${row.original.amount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}`}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: "status",
        header: "Status",
        Cell: ({ cell }: { cell: { getValue: () => SubscriptionStatus } }) => {
          const value = cell.getValue();
          const badgeClass =
            value === "completed"
              ? "bg-yellow-100 text-yellow-700"
              : value === "active"
                ? "bg-green-100 text-green-700"
                : value === "inactive"
                  ? "bg-amber-100 text-amber-700 border border-amber-200"
                  : value === "expired"
                    ? "bg-slate-100 text-slate-700"
                    : value === "error"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700";
          return (
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-md ${badgeClass}`}
            >
              {value}
            </span>
          );
        },
        size: 120,
      },
      {
        accessorKey: "subscriptionType",
        header: "Subscription",
        Cell: ({ cell }: { cell: { getValue: () => string } }) => {
          const value = cell.getValue();

          const badgeClass =
            value === "premium"
              ? "bg-purple-100 text-purple-700"
              : value === "special"
                ? "bg-blue-100 text-blue-700"
                : value === "junior"
                  ? "bg-orange-100 text-orange-700"
                  : value === "general"
                    ? "bg-gray-100 text-gray-700"
                    : "bg-slate-100 text-slate-600";

          return (
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize tracking-wide ${badgeClass}`}
            >
              {value}
            </span>
          );
        },
        size: 140,
      },
      {
        accessorKey: "subscriptionCode",
        header: "Subscription Invoice",
        Cell: ({ row }: { row: { original: SubscriptionRow } }) => (
          <div>
            <div className="font-medium text-gray-800">
              {row.original.subscriptionCode}
            </div>
          </div>
        ),
        size: 160,
      },
      {
        accessorKey: "period",
        header: "Start Date - End Date",
        Cell: ({ row }: { row: { original: SubscriptionRow } }) => (
          <div>
            <div className="font-medium text-gray-800">
              {row.original.period}
            </div>
            <div className="text-xs text-gray-500">
              Repeats every {row.original.repeatEvery} {row.original.repeatUnit}
            </div>
          </div>
        ),
        size: 220,
      },
      {
        accessorKey: "actions",
        header: "Actions",
        Cell: ({ row }: { row: { original: SubscriptionRow } }) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedActionRow(row.original)}
              className="flex items-center gap-1 rounded-md bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-200"
            >
              <Ellipsis size={14} />
            </button>
          </div>
        ),
        size: 120,
      },
      {
        accessorKey: "shareInvoice",
        header: "Share Invoice PDF",
        size: 240,
        Cell: ({ row }: { row: { original: SubscriptionRow } }) => {
          const subscription = row.original;

          const handleWhatsAppShare = async () => {
            const raw = (subscription.raw ?? {}) as Record<string, unknown>;
            const customerName =
              String(
                subscription.customer || raw.customerName || "Customer",
              ).trim() || "Customer";

            const docCode = String(
              raw.subscriptionCode ??
                subscription.subscriptionCode ??
                subscription.id,
            );
            console.log("docCode", docCode);
            const docLabel = "Subscription Invoice";
            const totalVal = Number(raw.grandTotal ?? subscription.amount ?? 0);
            const totalFormatted = `₹ ${totalVal.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
            const paymentStatus = paymentStatusForWhatsApp(
              raw,
              String(subscription.status),
            );
            const hostedLink = resolveHostedInvoiceLink(raw);

            const message = buildWoowooInvoiceWhatsAppMessage({
              customerName,
              docLabel,
              docCode,
              totalFormatted,
              paymentStatus,
              externalLink: hostedLink || undefined,
            });

            Swal.fire({
              title: "Preparing...",
              text: "Generating invoice PDF for WhatsApp",
              allowOutsideClick: false,
              didOpen: () => Swal.showLoading(),
            });

            let blobPkg: { blob: Blob; filename: string } | null = null;
            try {
              blobPkg = await getInvoicePdfBlob(raw, "SUBSCRIPTION");
            } catch (error) {
              console.error(error);
            }
            Swal.close();

            const pdfFile =
              blobPkg &&
              new File([blobPkg.blob], blobPkg.filename, {
                type: "application/pdf",
              });

            const canSharePdf =
              typeof navigator !== "undefined" &&
              typeof navigator.share === "function" &&
              Boolean(pdfFile) &&
              typeof navigator.canShare === "function" &&
              navigator.canShare({ files: [pdfFile!] });

            if (canSharePdf && pdfFile) {
              try {
                await navigator.share({
                  text: message,
                  files: [pdfFile],
                });
                return;
              } catch (error) {
                const aborted =
                  error instanceof Error && error.name === "AbortError";
                if (aborted) return;
                console.warn(
                  "Share sheet failed, opening WhatsApp Web:",
                  error,
                );
              }
            }

            const digits = normalizeIndianWhatsAppDigits(
              String(subscription.phone || raw.customerPhone || ""),
            );
            const waBase = digits
              ? `https://wa.me/${digits}`
              : "https://wa.me/";
            window.open(
              `${waBase}?text=${encodeURIComponent(message)}`,
              "_blank",
            );

            if (blobPkg) {
              const url = URL.createObjectURL(blobPkg.blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = blobPkg.filename;
              a.rel = "noopener";
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);

              await Swal.fire({
                icon: "info",
                title: "PDF downloaded",
                text: "Attach the downloaded PDF to your WhatsApp message (WhatsApp Web cannot auto-attach files).",
              });
            } else if (!hostedLink) {
              await Swal.fire({
                icon: "warning",
                title: "PDF unavailable",
                text: "Could not generate the invoice PDF. Try Download or add a hosted link from your server.",
              });
            }
          };

          const handleDownloadInvoice = async () => {
            try {
              Swal.fire({
                title: "Generating PDF...",
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
              });
              await downloadInvoicePdf(subscription.raw, "SUBSCRIPTION");
              Swal.close();
            } catch {
              Swal.fire("Error", "Could not generate PDF.", "error");
            }
          };

          return (
            <div className="flex items-center gap-2">
              <button
                onClick={handleWhatsAppShare}
                className="flex items-center gap-1 rounded-md bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-200"
              >
                <img
                  src="https://cdn-icons-png.flaticon.com/512/733/733585.png"
                  alt="whatsapp"
                  className="h-4 w-4"
                />
              </button>
              <button
                onClick={handleDownloadInvoice}
                className="flex items-center gap-1 rounded-md bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-200"
              >
                <Download size={14} />
              </button>
            </div>
          );
        },
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: filteredData,
    state: {
      isLoading: loading,
    },
    enableTopToolbar: false,
    enableBottomToolbar: true,
    enablePagination: true,
    enableColumnActions: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableHiding: false,
    paginationDisplayMode: "pages",
    positionPagination: "bottom",
    initialState: {
      pagination: { pageIndex: 0, pageSize: 25 },
      density: "compact",
    },
    muiPaginationProps: {
      rowsPerPageOptions: [10, 25, 50, 100],
      showFirstButton: true,
      showLastButton: true,
      color: "primary",
      shape: "rounded",
      variant: "outlined",
      size: "small",
    },
    muiBottomToolbarProps: {
      sx: {
        backgroundColor: "#ffffff",
        borderTop: "1px solid #e5e7eb",
        minHeight: "56px",
      },
    },
    muiTableHeadCellProps: {
      sx: {
        fontWeight: 700,
        color: "#111827",
        fontSize: "12px",
        backgroundColor: "#f9fafb",
      },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: "13px",
      },
    },
    muiTablePaperProps: {
      elevation: 0,
      square: false,
      style: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        overflow: "hidden",
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

  const totalAmount = filteredData.reduce((sum, row) => sum + row.amount, 0);
  const activeAmount = filteredData
    .filter((row) => row.status === "active")
    .reduce((sum, row) => sum + row.amount, 0);
  const completedAmount = filteredData
    .filter((row) => row.status === "completed")
    .reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="min-w-0 space-y-4 p-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
            Subscriptions
          </h1>
          <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-medium text-pink-700">
            {filteredData.length}
          </span>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <Can permission={PERMISSIONS.SUBSCRIPTION_CREATE}>
            <button
              className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer sm:w-auto"
              onClick={() => {
                setModalMode("create");
                setModalData(null);
                setIsModalOpen(true);
              }}
            >
              + Create Subscription
            </button>
          </Can>
          <Can
            anyOf={[
              PERMISSIONS.SUBSCRIPTION_BULK_CREATE,
              PERMISSIONS.SUBSCRIPTION_CREATE,
            ]}
          >
            <button
              className="w-full rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 cursor-pointer sm:w-auto"
              onClick={() => {
                setModalMode("bulk");
                setModalData(null);
                setIsModalOpen(true);
              }}
            >
              + Bulk Create Subscription
            </button>
          </Can>
        </div>
      </div>

      <div className="hide-scrollbar flex items-center gap-4 overflow-x-auto border-b border-gray-200 pb-2 sm:gap-6">
        <button
          onClick={() => setActiveTab("all")}
          className={`shrink-0 text-sm font-medium ${activeTab === "all" ? "border-b-2 border-blue-600 pb-1 text-blue-700" : "text-gray-500"}`}
        >
          All{" "}
          <span className="text-xs text-gray-400">{filteredData.length}</span>
        </button>
        {tabs.map(
          (tab) =>
            tab !== "all" && (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 text-sm font-medium ${activeTab === tab ? "border-b-2 border-blue-600 pb-1 text-blue-700" : "text-gray-500"}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ),
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <div className="relative min-w-0 w-full flex-1 sm:min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by transaction, customer, invoice etc..."
            className="h-10 w-full rounded-md border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
          />
        </div>
        <select
          value={subscriptionTypeFilter}
          onChange={(e) => setSubscriptionTypeFilter(e.target.value)}
          className="h-10 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-400 bg-white text-gray-700"
        >
          <option value="all">All Subscriptions</option>
          {memberships.map((membership) => (
            <option key={membership.planId} value={membership.planId}>
              {membership.displayName}
            </option>
          ))}
        </select>
        <select
          value={expiryFilter}
          onChange={(e) => setExpiryFilter(e.target.value)}
          className="h-10 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-400 bg-white text-gray-700"
        >
          <option value="all">Any Expiry</option>
          <option value="day">Expire in a Day</option>
          <option value="week">Expire in a Week</option>
          <option value="month">Expire in a Month</option>
          <option value="year">Expire in a Year</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <MaterialReactTable table={table} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">
            Total ₹{" "}
            {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="rounded bg-green-100 px-2 py-1 text-green-700">
            Active ₹{" "}
            {activeAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-700">
            Completed ₹{" "}
            {completedAmount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>

      {selectedActionRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Subscription Actions
              </h3>
              <button
                onClick={() => setSelectedActionRow(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <button
                onClick={() => handleAction("view")}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50"
              >
                <div className="rounded-full bg-violet-100 p-2 text-violet-600">
                  <Eye size={18} />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">
                    View Subscription
                  </div>
                  <div className="text-xs text-gray-500">
                    View in read-only mode
                  </div>
                </div>
              </button>
              <Can permission={PERMISSIONS.SUBSCRIPTION_UPDATE}>
                <button
                  onClick={() => handleAction("edit")}
                  disabled={selectedActionRow.status === "cancelled"}
                  className={`flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors ${selectedActionRow.status === "cancelled" ? "cursor-not-allowed opacity-50" : "hover:bg-gray-50"}`}
                >
                  <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                    <Edit size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">
                      Edit Subscription
                    </div>
                    <div className="text-xs text-gray-500">
                      Modify subscription details
                    </div>
                  </div>
                </button>
              </Can>
              <Can permission={PERMISSIONS.SUBSCRIPTION_CREATE}>
                <button
                  onClick={() => handleAction("upgrade")}
                  disabled={selectedActionRow.status === "cancelled"}
                  className={`flex w-full items-center gap-3 rounded-lg border border-violet-100 bg-violet-50/50 p-3 text-left transition-colors ${selectedActionRow.status === "cancelled" ? "cursor-not-allowed opacity-50" : "hover:bg-violet-50"}`}
                >
                  <div className="rounded-full bg-violet-100 p-2 text-violet-600">
                    <ArrowUpCircle size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-violet-800">
                      Upgrade Subscription
                    </div>
                    <div className="text-xs text-violet-600/80">
                      Move to a higher-priority plan (Junior always allowed)
                    </div>
                  </div>
                </button>
              </Can>
              <Can permission={PERMISSIONS.SUBSCRIPTION_DELETE}>
                <button
                  onClick={() => handleAction("delete")}
                  className="flex w-full items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-left transition-colors hover:bg-red-100"
                >
                  <div className="rounded-full bg-red-200 p-2 text-red-700">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-red-700">
                      Delete Subscription
                    </div>
                    <div className="text-xs text-red-600/70">
                      Permanently remove
                    </div>
                  </div>
                </button>
              </Can>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <CreateSubscriptionScreen
          initialMode={modalMode}
          initialData={modalData}
          onClose={() => setIsModalOpen(false)}
          onSave={() => {
            fetchSubscriptions();
          }}
        />
      )}
    </div>
  );
}
