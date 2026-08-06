import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAppSelector } from "@/store/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import {
  handleCreateCustomer,
  handleCreateSubscription,
  handleGetMemberships,
  handleUpdateCustomer,
  handleUpdateSubscription,
  handleGetCustomers,
  handleBulkCreateSubscriptions ,
  type CustomerPayload,
  type CreateSubscriptionPayload,
} from "@/services/apiClient";
import CreateCustomerModal from "@/features/network/components/CreateCustomerModal";
import CheckoutModal from "../components/invoice/Modal/CheckoutModal";
import { getCustomerMembershipTypeFromPlan } from "../utils/membershipInvoiceUtils";
import { printThermalReceipt } from "@/utils/printUtils";
import { Camera, Download, Printer, X } from "lucide-react";

const today = new Date().toISOString().split("T")[0];
const SUBSCRIPTION_SEQ_KEY = "wooerp-subscription-seq";

/** Exact header row for bulk subscription Excel (do not rename). */
const BULK_SUBSCRIPTION_HEADERS = [
  "customerName",
  "customerPhone",
  "membershipPlan",
  "startDate",
  "endDate",
  "salesPersonName",
  "amount",
  "status",
  "repeatType",
  "notes",
  "studentName",
  "classStd",
  "relation",
  "parentName",
  "studentId",
  "schoolName",
  "dob",
] as const;

const BULK_SUBSCRIPTION_SAMPLE_ROWS: Array<Array<string | number>> = [
  [
    "Rahul Anand",
    "9876543210",
    "Premium",
    "29 Jul 2026",
    "28 Jul 2027",
    "Admin",
    1999,
    "active",
    "yearly",
    "Sample adult plan — delete before upload",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ],
  [
    "Amit Kumar",
    "9123456780",
    "Junior",
    "29 Jul 2026",
    "28 Jul 2027",
    "Admin",
    499,
    "active",
    "yearly",
    "Junior with student details",
    "Aarav Kumar",
    "8",
    "Father",
    "Amit Kumar",
    "STU001",
    "Delhi Public School",
    "12 May 2014",
  ],
  [
    "Priya Sharma",
    "9988776655",
    "Junior",
    "29 Jul 2026",
    "28 Jul 2027",
    "Admin",
    499,
    "active",
    "yearly",
    "Junior with blank student fields — allowed",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ],
];

const BULK_DATE_FIELDS = ["startDate", "endDate", "dob"] as const;

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const toYmd = (year: number, monthIndex: number, day: number) => {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthIndex) ||
    !Number.isInteger(day) ||
    monthIndex < 0 ||
    monthIndex > 11 ||
    day < 1 ||
    day > 31
  ) {
    return "";
  }
  const dt = new Date(Date.UTC(year, monthIndex, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== monthIndex ||
    dt.getUTCDate() !== day
  ) {
    return "";
  }
  return `${String(year).padStart(4, "0")}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

/** Parse Excel dates like "29 Jul 2026" into YYYY-MM-DD for the API. */
const parseBulkExcelDate = (value: unknown): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toYmd(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel serial date
    const epoch = Date.UTC(1899, 11, 30);
    const d = new Date(epoch + Math.round(value) * 86400000);
    if (!Number.isNaN(d.getTime())) {
      return toYmd(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
  }

  const text = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!text) return "";

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return toYmd(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  // Preferred: 29 Jul 2026 | 29-Jul-2026 | 29/Jul/2026
  const dmyMonth = text.match(
    /^(\d{1,2})[ \/\-]([A-Za-z]{3,9})[ \/\-](\d{4})$/,
  );
  if (dmyMonth) {
    const monthIndex = MONTH_INDEX[dmyMonth[2].toLowerCase()];
    if (monthIndex !== undefined) {
      return toYmd(Number(dmyMonth[3]), monthIndex, Number(dmyMonth[1]));
    }
  }

  const dmyNum = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyNum) {
    return toYmd(Number(dmyNum[3]), Number(dmyNum[2]) - 1, Number(dmyNum[1]));
  }

  return text;
};

const BULK_HEADER_ALIASES: Record<string, string> = {
  customername: "customerName",
  name: "customerName",
  customerphone: "customerPhone",
  phone: "customerPhone",
  mobile: "customerPhone",
  membershipplan: "membershipPlan",
  membership: "membershipPlan",
  plan: "membershipPlan",
  startdate: "startDate",
  start: "startDate",
  enddate: "endDate",
  end: "endDate",
  salespersonname: "salesPersonName",
  salesperson: "salesPersonName",
  amount: "amount",
  status: "status",
  activity: "status",
  activitystatus: "status",
  repeattype: "repeatType",
  repeatedtype: "repeatType",
  repeat: "repeatType",
  notes: "notes",
  studentname: "studentName",
  classstd: "classStd",
  classstandard: "classStd",
  class: "classStd",
  relation: "relation",
  parentname: "parentName",
  parentsname: "parentName",
  studentid: "studentId",
  schoolname: "schoolName",
  dob: "dob",
  dateofbirth: "dob",
};

const normalizeBulkRow = (row: Record<string, unknown>) => {
  const next: Record<string, unknown> = {};
  for (const [rawKey, value] of Object.entries(row || {})) {
    const compact = String(rawKey)
      .trim()
      .toLowerCase()
      .replace(/[\s_\-./]+/g, "");
    const key = BULK_HEADER_ALIASES[compact] || String(rawKey).trim();
    if (next[key] === undefined || next[key] === "" || next[key] === null) {
      next[key] = value;
    }
  }
  for (const field of BULK_DATE_FIELDS) {
    if (next[field] !== undefined && next[field] !== "") {
      next[field] = parseBulkExcelDate(next[field]);
    }
  }
  return next;
};

function downloadBulkSubscriptionTemplate() {
  const aoa: Array<Array<string | number>> = [
    [...BULK_SUBSCRIPTION_HEADERS],
    ...BULK_SUBSCRIPTION_SAMPLE_ROWS,
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);

  // Keep phone / studentId / dates as text so Excel keeps "29 Jul 2026"
  ["B2", "B3", "B4", "D2", "D3", "D4", "E2", "E3", "E4", "O3", "Q3"].forEach(
    (addr) => {
      if (sheet[addr]) {
        sheet[addr].t = "s";
        sheet[addr].v = String(sheet[addr].v);
        sheet[addr].z = "@";
      }
    },
  );

  sheet["!cols"] = BULK_SUBSCRIPTION_HEADERS.map((h) => ({
    wch: Math.max(14, h.length + 2),
  }));

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Subscriptions");
  XLSX.writeFile(book, "subscription-bulk-import-template.xlsx");
}

const getNextSubscriptionNumber = (): string => {
  const fallback = 1000;
  try {
    const currentRaw = localStorage.getItem(SUBSCRIPTION_SEQ_KEY);
    const current = currentRaw ? Number(currentRaw) : fallback;
    const next = Number.isFinite(current) ? current + 1 : fallback + 1;
    localStorage.setItem(SUBSCRIPTION_SEQ_KEY, String(next));
    return String(next);
  } catch {
    return String(fallback + 1);
  }
};

type Mode = "create" | "edit" | "view" | "upgrade" | "bulk";
type RepeatType = "weekly" | "monthly" | "yearly";
type MembershipOption = {
  _id: string;
  planId: string;
  displayName: string;
  amount: number;
  period: string;
  priority: number;
  /** Fixed ₹ credited to wallet when this plan is purchased */
  walletCashbackAmount: number;
};

type StudentForm = {
  studentName: string;
  schoolName: string;
  dob: string;
  gender: string;
  classStd: string;
  relation: string;
  parentName: string;
  studentIdUpload: string;
  formImageUpload: string;
};

const createEmptyStudent = (): StudentForm => ({
  studentName: "",
  schoolName: "",
  dob: "",
  gender: "",
  classStd: "",
  relation: "",
  parentName: "",
  studentIdUpload: "",
  formImageUpload: "",
});

const isJuniorPlan = (
  plan?: Pick<MembershipOption, "planId" | "displayName"> | null,
) => {
  const text = `${plan?.planId ?? ""} ${plan?.displayName ?? ""}`.toLowerCase();
  return text.includes("junior") || text.includes("junoir");
};

const getCustomerMembershipType = (
  plan?: Pick<MembershipOption, "planId" | "displayName"> | null,
) => getCustomerMembershipTypeFromPlan(plan);

const parseDurationToDays = (periodRaw: string): number => {
  const period = String(periodRaw ?? "")
    .trim()
    .toLowerCase();
  if (!period || period === "monthly" || period === "month") return 30;
  if (period === "weekly" || period === "week") return 7;
  if (period === "yearly" || period === "year") return 365;
  if (period.includes("quarter")) return 90;
  if (period.includes("half")) return 182;
  if (period.includes("lifetime")) return 3650;

  const numericMatch = period.match(/(\d+)/);
  const value = numericMatch ? Number(numericMatch[1]) : NaN;
  if (!Number.isFinite(value) || value <= 0) return 30;
  if (period.includes("day")) return value;
  if (period.includes("week")) return value * 7;
  if (period.includes("year")) return value * 365;
  return value * 30;
};

const computeEndDateFromPeriod = (
  startDateValue: string,
  periodRaw: string,
) => {
  if (!startDateValue) return today;
  const start = new Date(startDateValue);
  if (Number.isNaN(start.getTime())) return startDateValue;
  const days = parseDurationToDays(periodRaw);
  start.setDate(start.getDate() + Math.max(days - 1, 0));
  return start.toISOString().split("T")[0];
};

export default function CreateSubscriptionScreen({
  onClose,
  initialData,
  initialMode,
  onSave,
}: {
  onClose?: () => void;
  initialData?: any;
  initialMode?: Mode;
  onSave?: () => void;
} = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>(initialMode || "create");

  const [bulkData, setBulkData] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [bulkParseError, setBulkParseError] = useState("");
  const [bulkUploadErrors, setBulkUploadErrors] = useState<
    Array<{ index: number; customerPhone?: string; message: string }>
  >([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setBulkParseError("");
    setBulkUploadErrors([]);
    setBulkData([]);

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        if (!buffer) {
          setBulkParseError("Could not read file.");
          return;
        }

        const workbook = XLSX.read(buffer, {
          type: "array",
          cellDates: true,
        });
        const sheetName =
          workbook.SheetNames.find(
            (n) => n.trim().toLowerCase() === "subscriptions",
          ) || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          setBulkParseError("No worksheet found in the Excel file.");
          return;
        }

        const jsonResult = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          worksheet,
          { defval: "", raw: true },
        );

        if (!jsonResult.length) {
          setBulkParseError(
            "No data rows found. Keep the header row and add member rows below it.",
          );
          return;
        }

        const firstKeys = Object.keys(jsonResult[0] || {}).map((k) =>
          String(k).trim().toLowerCase(),
        );
        const hasExpectedHeader = BULK_SUBSCRIPTION_HEADERS.some((h) =>
          firstKeys.includes(h.toLowerCase()),
        );
        if (!hasExpectedHeader) {
          setBulkParseError(
            `Header row missing or wrong. Expected columns like: ${BULK_SUBSCRIPTION_HEADERS.slice(0, 7).join(", ")}…`,
          );
          return;
        }

        setBulkData(jsonResult.map((row) => normalizeBulkRow(row)));
      } catch {
        setBulkParseError(
          "Could not read Excel file. Use .xlsx / .xls / .csv.",
        );
      } finally {
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setBulkParseError("Failed to read the selected file.");
      setIsParsing(false);
    };

    reader.readAsArrayBuffer(file);
    // allow re-selecting the same file
    e.target.value = "";
  };
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [subscriptionNo, setSubscriptionNo] = useState(
    getNextSubscriptionNumber(),
  );
  const [customer, setCustomer] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [phone, setPhone] = useState("");
  const [membership, setMembership] = useState("-");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [repeatType, setRepeatType] = useState<RepeatType>("monthly");
  const staff = useAppSelector((state) => state.user);
  const staffName = useAppSelector((state) => state.user.m_staff_name);
  const salesPerson = staffName ?? "Not Assigned";
  const [notes, setNotes] = useState("");
  const [openCheckout, setOpenCheckout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<
    Array<{
      _id: string;
      name: string;
      mobile: string;
      companyName?: string;
      membershipType?: string;
      membershipPlanId?: string;
      priority?: number;
    }>
  >([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(true);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [memberships, setMemberships] = useState<MembershipOption[]>([]);
  const [loadingMemberships, setLoadingMemberships] = useState(false);
  const [selectedMembershipId, setSelectedMembershipId] = useState("");
  const [students, setStudents] = useState<StudentForm[]>([
    createEmptyStudent(),
  ]);
  const [endDateManuallyEdited, setEndDateManuallyEdited] = useState(false);
  /** Customer's current membership priority (Junior treated as 0 for upgrades) */
  const [customerPriority, setCustomerPriority] = useState(0);

  useEffect(() => {
    type Line = {
      productName?: string;
      qty?: number;
      unitPrice?: number;
      discount?: number;
    };
    type Doc = {
      _id?: string;
      subscriptionCode?: string;
      invoiceCode?: string;
      customerName?: string;
      customerPhone?: string;
      invoiceDate?: string;
      dueDate?: string;
      repeatType?: string;
      repeatEvery?: number | string | null;
      repeatUnit?: string | null;
      notes?: string;
      items?: Line[];
      membershipId?: string;
      students?: StudentForm[];
    };
    const state = location.state as {
      mode?: Mode;
      subscription?: Doc;
    } | null;

    const applyDoc = (doc: Doc, nextMode: Mode) => {
      setMode(nextMode);
      if (nextMode === "upgrade") {
        // Upgrade creates a new subscription for a higher-priority plan
        setSubscriptionId(null);
        setSubscriptionNo(getNextSubscriptionNumber());
      } else if (doc._id) {
        setSubscriptionId(String(doc._id));
      }
      if (nextMode !== "upgrade") {
        if (doc.subscriptionCode)
          setSubscriptionNo(String(doc.subscriptionCode));
        else if (doc.invoiceCode) setSubscriptionNo(String(doc.invoiceCode));
      }
      setCustomer(doc.customerName || "");
      setSelectedCustomerId("");
      setPhone(doc.customerPhone || "");
      const docMembershipType = String(
        (doc as any).membershipType ?? "",
      ).toLowerCase();
      if (docMembershipType) {
        setMembership(docMembershipType);
      }
      const docPriority = Number((doc as any).priority ?? 0);
      const isJuniorCust =
        docMembershipType.includes("junior") ||
        docMembershipType.includes("junoir");
      setCustomerPriority(
        isJuniorCust || !docMembershipType || docMembershipType === "none"
          ? 0
          : Math.max(0, docPriority || 0),
      );
      if (doc.invoiceDate && nextMode !== "upgrade") {
        setStartDate(new Date(doc.invoiceDate).toISOString().split("T")[0]);
      }
      if (doc.dueDate && nextMode !== "upgrade") {
        setEndDate(new Date(doc.dueDate).toISOString().split("T")[0]);
      }
      const rawType = String(doc.repeatType ?? "").toLowerCase();
      if (rawType === "weekly") {
        setRepeatType("weekly");
      } else if (
        rawType === "yearly" ||
        String(doc.repeatUnit ?? "").toLowerCase() === "year"
      ) {
        setRepeatType("yearly");
      } else {
        setRepeatType("monthly");
      }
      setNotes(nextMode === "upgrade" ? "" : doc.notes || "");
      if (nextMode === "upgrade") {
        setSelectedMembershipId("");
        setStudents([createEmptyStudent()]);
      } else {
        if (doc.membershipId) setSelectedMembershipId(String(doc.membershipId));
        if (Array.isArray(doc.students) && doc.students.length > 0) {
          setStudents(
            doc.students.map((s) => ({
              studentName: String(s.studentName ?? ""),
              schoolName: String(s.schoolName ?? ""),
              dob: s.dob ? String(s.dob).split("T")[0] : "",
              gender: String(s.gender ?? ""),
              classStd: String(s.classStd ?? ""),
              relation: String(s.relation ?? ""),
              parentName: String(s.parentName ?? ""),
              studentIdUpload: String(s.studentIdUpload ?? ""),
              formImageUpload: String(s.formImageUpload ?? ""),
            })),
          );
        }
      }
    };

    if (initialData) {
      applyDoc(initialData, initialMode ?? "edit");
    } else if (state?.subscription) {
      applyDoc(state.subscription, state.mode ?? "edit");
    }
  }, [location.state, initialData, initialMode]);
  const selectedMembership = useMemo(
    () => memberships.find((m) => m._id === selectedMembershipId) ?? null,
    [memberships, selectedMembershipId],
  );
  const selectedCustomer = useMemo(
    () => customers.find((c) => c._id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );
  const juniorSelected = isJuniorPlan(selectedMembership);

  /** Effective customer priority for upgrade rules (Junior = 0). */
  const effectiveCustomerPriority = useMemo(() => {
    const mType = String(
      selectedCustomer?.membershipType ?? membership ?? "",
    ).toLowerCase();
    if (
      !mType ||
      mType === "none" ||
      mType.includes("junior") ||
      mType.includes("junoir")
    ) {
      return 0;
    }
    const fromCustomer = Number(selectedCustomer?.priority ?? customerPriority);
    if (Number.isFinite(fromCustomer) && fromCustomer > 0) return fromCustomer;
    const match = memberships.find(
      (m) =>
        m.planId.toLowerCase() === mType ||
        m.displayName.toLowerCase().includes(mType),
    );
    return Math.max(0, Number(match?.priority ?? 0) || 0);
  }, [selectedCustomer, membership, customerPriority, memberships]);

  /** Plans available in the dropdown (upgrade mode filters by priority). */
  const selectableMemberships = useMemo(() => {
    if (mode !== "upgrade") return memberships;
    return memberships.filter((m) => {
      if (isJuniorPlan(m)) return true;
      return Number(m.priority) > effectiveCustomerPriority;
    });
  }, [mode, memberships, effectiveCustomerPriority]);

  const subTotal = selectedMembership?.amount ?? 0;
  const discountTotal = 0;
  const grandTotal = subTotal;

  useEffect(() => {
    if (!selectedMembership || endDateManuallyEdited) return;
    const computedEndDate = computeEndDateFromPeriod(
      startDate,
      selectedMembership.period,
    );
    setEndDate(computedEndDate);
  }, [selectedMembership, startDate, endDateManuallyEdited]);

  useEffect(() => {
    if (!juniorSelected) {
      setStudents([createEmptyStudent()]);
    }
  }, [juniorSelected]);

  const buildPayload = (
    status: "draft" | "active",
  ): CreateSubscriptionPayload => {
    const repeatUnit: "month" | "year" | null =
      repeatType === "yearly" ? "year" : "month";
    const repeatEvery = repeatType === "weekly" ? 1 : 1;

    const membershipTypeRaw =
      selectedMembership?.planId ||
      selectedMembership?.displayName ||
      "general";
    return {
      customerName: customer.trim(),
      customerPhone: phone.trim(),
      invoiceDate: startDate,
      dueDate: endDate,
      membershipId: selectedMembership?._id ?? "",
      membershipPlanId: selectedMembership?.planId ?? "",
      membershipType: membershipTypeRaw,
      priority: Math.max(0, Number(selectedMembership?.priority ?? 0) || 0),
      repeatType,
      repeatEvery,
      repeatUnit,
      salesPersonName: salesPerson,
      notes: notes.trim(),
      items: selectedMembership
        ? [
          {
            productName: selectedMembership.displayName,
            qty: 1,
            unitPrice: selectedMembership.amount,
            discount: 0,
            category: "membership",
          },
        ]
        : [],
      subTotal,
      discountTotal,
      grandTotal,
      status,
      createdBy: {
        m_staff_id: staff.m_staff_id,
        m_staff_name: staff.m_staff_name,
        m_staff_email: staff.m_staff_email,
      },
      students: juniorSelected
        ? students.map((student) => ({
          ...student,
          dob: student.dob || null,
        }))
        : [],
    };
  };

  const validateBeforeCheckout = () => {
    if (!customer.trim()) {
      Swal.fire(
        "Customer required",
        "Please select or enter customer.",
        "warning",
      );
      return false;
    }
    if (!phone.trim()) {
      Swal.fire(
        "Phone required",
        "Please enter customer phone number.",
        "warning",
      );
      return false;
    }
    if (endDate < startDate) {
      Swal.fire(
        "Invalid end date",
        "End date cannot be before start date.",
        "warning",
      );
      return false;
    }
    if (!selectedMembership) {
      Swal.fire(
        "Membership required",
        "Please select a membership plan.",
        "warning",
      );
      return false;
    }
    if (!juniorSelected) {
      const newPriority = Math.max(
        0,
        Number(selectedMembership?.priority ?? 0) || 0,
      );
      if (
        effectiveCustomerPriority > 0 &&
        newPriority <= effectiveCustomerPriority
      ) {
        Swal.fire(
          "Upgrade not allowed",
          `Choose a membership with a higher priority than the customer's current plan (current priority: ${effectiveCustomerPriority}). Same or lower priority plans are blocked. Junior membership is always allowed.`,
          "warning",
        );
        return false;
      }
    }

    if (juniorSelected) {
      if (students.length === 0) {
        Swal.fire(
          "Student details required",
          "Please add at least one student for Junior membership.",
          "warning",
        );
        return false;
      }
      for (let i = 0; i < students.length; i += 1) {
        const s = students[i];
        const classNumber = Number(s.classStd);
        if (
          !s.studentName.trim() ||
          !s.schoolName.trim() ||
          !s.classStd.trim()
        ) {
          Swal.fire(
            "Incomplete student details",
            `Please fill student name, school name and class for student ${i + 1}.`,
            "warning",
          );
          return false;
        }
        if (!Number.isFinite(classNumber) || classNumber > 12) {
          Swal.fire(
            "Invalid class",
            `Junior membership is only valid for class 12 and below (student ${i + 1}).`,
            "warning",
          );
          return false;
        }
        if (!s.relation.trim() || !s.parentName.trim()) {
          Swal.fire(
            "Incomplete student details",
            `Please fill relation and parent name for student ${i + 1}.`,
            "warning",
          );
          return false;
        }
      }
    }
    return true;
  };

  const fetchCustomers = async (searchText = "", signal?: AbortSignal) => {
    try {
      setLoadingCustomers(true);
      const response = await handleGetCustomers(searchText, signal);
      setCustomers(
        Array.isArray(response?.customers) ? response.customers : [],
      );
    } catch {
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const debouncedCustomer = useDebounce(customer.trim(), 250);

  useEffect(() => {
    if (!customerDropdownOpen) return;

    const term = debouncedCustomer;
    if (!term) {
      setCustomers([]);
      setLoadingCustomers(false);
      return;
    }

    const controller = new AbortController();
    fetchCustomers(term, controller.signal);

    return () => {
      controller.abort();
    };
  }, [debouncedCustomer, customerDropdownOpen]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchMemberships = async () => {
      try {
        setLoadingMemberships(true);
        const response = await handleGetMemberships(
          { status: "Active" },
          controller.signal,
        );
        const list = Array.isArray(response?.memberships)
          ? response.memberships
          : [];
        const mapped: MembershipOption[] = list
          .map((m: Record<string, any>) => ({
            _id: String(m?._id ?? m?.planId ?? ""),
            planId: String(m?.planId ?? ""),
            displayName: String(m?.displayName ?? m?.planId ?? "Membership"),
            amount: Number(m?.pricing?.amount ?? 0),
            period: String(m?.pricing?.period ?? "monthly"),
            priority: Math.max(0, Number(m?.priority ?? 0) || 0),
            walletCashbackAmount: Math.max(
              0,
              Number(m?.walletCashback?.amount ?? 0) || 0,
            ),
          }))
          .filter((m: MembershipOption) => Boolean(m._id));
        setMemberships(mapped);
      } catch {
        setMemberships([]);
      } finally {
        setLoadingMemberships(false);
      }
    };
    void fetchMemberships();
    return () => controller.abort();
  }, []);

  const handleCreateCustomerSubmit = async (args: {
    payload: CustomerPayload;
    profileImageFile?: File | null;
  }) => {
    try {
      setCreatingCustomer(true);
      const response = await handleCreateCustomer({
        ...args.payload,
        createdBy: {
          m_staff_id: staff.m_staff_id,
          m_staff_name: staff.m_staff_name,
          m_staff_email: staff.m_staff_email,
        },
      });
      const created = response?.customer;
      if (created?.name) {
        setSelectedCustomerId(String(created._id ?? ""));
        setCustomer(String(created.name));
        setPhone(String(created.mobile ?? ""));
      }
      setShowCreateCustomerModal(false);
      await fetchCustomers();
      Swal.fire("Customer created", "Customer saved successfully.", "success");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Create failed",
        err?.response?.data?.message ?? "Could not create customer. Try again.",
        "error",
      );
    } finally {
      setCreatingCustomer(false);
    }
  };

  

  const handleSaveSubscription = async (payment: {
    mode: string;
    paymentStatus: "full" | "partial";
    paymentBreakdown: {
      cash: number;
      upi: number;
      card: number;
      wallet: number;
      paidAmount: number;
      dueAmount: number;
      changeAmount: number;
    };
    finalAmount?: number;
    coupon?: {
      code: string;
      discountAmount: number;
    } | null;
    referral?: {
      code: string;
      discountAmount: number;
      inviterName?: string;
      label?: string;
    } | null;
    invoiceBy?: {
      staffId: string;
      staffName: string;
      employeeId: string;
      email?: string;
    } | null;
    verifiedAt?: string | null;
  }) => {
    try {
      setSaving(true);
      const couponDiscount = Number(payment.coupon?.discountAmount ?? 0);
      const referralDiscount = Number(payment.referral?.discountAmount ?? 0);
      const appliedDiscountTotal = Math.max(
        0,
        discountTotal + couponDiscount + referralDiscount,
      );
      const payableTotal = Math.max(
        0,
        Number(
          payment.finalAmount ??
            Math.max(0, grandTotal - couponDiscount - referralDiscount),
        ),
      );
      const payload: CreateSubscriptionPayload = {
        ...buildPayload("active"),
        salesPersonName:
          payment.invoiceBy?.staffName?.trim() || salesPerson,
        discountTotal: appliedDiscountTotal,
        grandTotal: payableTotal,
        subscriptionCode: subscriptionNo,
        mode: payment.mode,
        paymentStatus: payment.paymentStatus,
        paymentBreakdown: payment.paymentBreakdown,
        coupon: payment.coupon ?? null,
        referral: payment.referral ?? null,
      };
      if (mode === "edit" && subscriptionId) {
        await handleUpdateSubscription(subscriptionId, payload);
        if (selectedCustomerId && selectedMembership) {
          await handleUpdateCustomer(selectedCustomerId, {
            membershipType: getCustomerMembershipType(selectedMembership),
            membershipPlanId: selectedMembership._id,
            priority: Math.max(
              0,
              Number(selectedMembership.priority ?? 0) || 0,
            ),
          });
        }
        printThermalReceipt({
          invoiceNo: subscriptionNo,
          customerName: customer.trim(),
          customerPhone: phone.trim(),
          items: [
            {
              name: selectedMembership?.displayName ?? "Membership",
              qty: 1,
              price: selectedMembership?.amount ?? 0,
              discount: appliedDiscountTotal,
            },
          ],
          totalMRP: subTotal,
          discountTotal: appliedDiscountTotal,
          finalAmount: payableTotal,
          totalDue: payment.paymentBreakdown.dueAmount,
          totalQty: 1,
        });
        Swal.fire(
          "Updated",
          "Subscription updated successfully.",
          "success",
        ).then(() => {
          if (onSave) onSave();
          if (onClose) onClose();
          else navigate(-1);
        });
        return;
      }
      const response = await handleCreateSubscription(payload);
      if (selectedCustomerId && selectedMembership) {
        const nextType = getCustomerMembershipType(selectedMembership);
        // Don't overwrite a main membership with Junior on the client either
        const existingType = String(
          selectedCustomer?.membershipType ?? membership ?? "none",
        ).toLowerCase();
        const hasMain =
          existingType &&
          existingType !== "none" &&
          !existingType.includes("junior") &&
          !existingType.includes("junoir");
        if (!(nextType === "junior" && hasMain)) {
          await handleUpdateCustomer(selectedCustomerId, {
            membershipType: nextType,
            membershipPlanId: selectedMembership._id,
            priority: Math.max(
              0,
              Number(selectedMembership.priority ?? 0) || 0,
            ),
          });
        }
      }
      const savedCode = String(
        response?.subscription?.subscriptionCode ?? subscriptionNo,
      );
      printThermalReceipt({
        invoiceNo: savedCode,
        customerName: customer.trim(),
        customerPhone: phone.trim(),
        items: [
          {
            name: selectedMembership?.displayName ?? "Membership",
            qty: 1,
            price: selectedMembership?.amount ?? 0,
            discount: appliedDiscountTotal,
          },
        ],
        totalMRP: subTotal,
        discountTotal: appliedDiscountTotal,
        finalAmount: payableTotal,
        totalDue: payment.paymentBreakdown.dueAmount,
        totalQty: 1,
      });
      Swal.fire(
        "Saved",
        `Subscription ${savedCode} saved successfully.`,
        "success",
      ).then(() => {
        if (onSave) onSave();
        if (onClose) onClose();
        else navigate(-1);
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Save failed",
        err?.response?.data?.message ?? "Could not save subscription.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const updateStudent = (
    index: number,
    field: keyof StudentForm,
    value: string,
  ) => {
    setStudents((prev) =>
      prev.map((student, i) =>
        i === index ? { ...student, [field]: value } : student,
      ),
    );
  };
  

  const addStudent = () => {
    setStudents((prev) => [...prev, createEmptyStudent()]);
  };

  const removeStudent = (index: number) => {
    setStudents((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) {
          if (onClose) onClose();
          else navigate(-1);
        }
      }}
    >
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {mode === "bulk" ? (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                Bulk Upload Subscriptions
              </h2>
              <button
                onClick={() => {
                  if (onClose) onClose();
                  else navigate(-1);
                }}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-2">
              Download the template, keep the header row exactly as-is, fill
              member rows, then upload the file.
            </p>
            <p className="mb-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Required:</span>{" "}
              customerName, customerPhone, membershipPlan, startDate, endDate,
              salesPersonName, amount, status (activity), repeatType (e.g.
              yearly).
            </p>
            <p className="mb-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Optional</span>{" "}
              (can be blank, including Junior): studentName, classStd,
              relation, parentName, studentId, schoolName, dob, notes.
            </p>
            <p className="mb-2 text-xs text-amber-700">
              Duplicates are blocked automatically: same phone + membership +
              start/end dates + amount (already in DB or repeated in this file)
              will be skipped.
            </p>
            <p className="mb-4 text-xs text-slate-500">
              Date format for <code>startDate</code>, <code>endDate</code>, and{" "}
              <code>dob</code>: <b>29 Jul 2026</b> (day month year). Also
              accepts <code>29-Jul-2026</code> or Excel date cells.
            </p>
            <button
              type="button"
              onClick={downloadBulkSubscriptionTemplate}
              className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              <Download size={16} />
              Download Template
            </button>

            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="mb-4 block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />

            {isParsing && (
              <p className="text-sm text-blue-500">Parsing file...</p>
            )}

            {bulkParseError ? (
              <div className="mb-4 rounded border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                {bulkParseError}
              </div>
            ) : null}

            {bulkData.length > 0 && (
              <div className="mb-4 rounded bg-green-50 p-3 text-sm font-medium text-green-700">
                Successfully parsed {bulkData.length} subscriptions. Ready to
                upload!
              </div>
            )}

            {bulkUploadErrors.length > 0 ? (
              <div className="mb-4 max-h-48 overflow-y-auto rounded border border-rose-100 bg-rose-50 p-3 text-xs text-rose-800">
                <p className="mb-2 font-semibold">
                  Skipped / errors ({bulkUploadErrors.length})
                </p>
                <ul className="space-y-1">
                  {bulkUploadErrors.slice(0, 40).map((err) => (
                    <li key={`${err.index}-${err.customerPhone || ""}`}>
                      Row {err.index + 1}
                      {err.customerPhone ? ` (${err.customerPhone})` : ""}:{" "}
                      {err.message}
                    </li>
                  ))}
                  {bulkUploadErrors.length > 40 ? (
                    <li>…and {bulkUploadErrors.length - 40} more</li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  if (onClose) onClose();
                  else navigate(-1);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                disabled={bulkData.length === 0}
                onClick={async () => {
                  try {
                    setBulkUploadErrors([]);
                    const response = await handleBulkCreateSubscriptions({
                      subscriptions: bulkData,
                    });
                    const failed = Number(response?.summary?.failed ?? 0);
                    const skipped = Number(response?.summary?.skipped ?? 0);
                    const failedRows = Array.isArray(response?.results)
                      ? response.results.filter(
                          (r: { success?: boolean }) => !r.success,
                        )
                      : [];
                    setBulkUploadErrors(failedRows);
                    const icon =
                      failed > 0
                        ? "warning"
                        : skipped > 0
                          ? "info"
                          : "success";
                    Swal.fire(
                      failed > 0
                        ? "Partial success"
                        : skipped > 0
                          ? "Upload finished (duplicates skipped)"
                          : "Success",
                      response?.message || "Bulk upload finished.",
                      icon,
                    );
                    if (failed === 0) onClose?.();
                  } catch (error: unknown) {
                    const err = error as {
                      response?: {
                        data?: {
                          message?: string;
                          results?: Array<{
                            index: number;
                            success?: boolean;
                            skipped?: boolean;
                            duplicate?: boolean;
                            customerPhone?: string;
                            message?: string;
                          }>;
                        };
                      };
                    };
                    const failedRows = Array.isArray(err?.response?.data?.results)
                      ? err.response!.data!.results!.filter((r) => !r.success)
                      : [];
                    setBulkUploadErrors(
                      failedRows.map((r) => ({
                        index: Number(r.index ?? 0),
                        customerPhone: r.customerPhone,
                        message: r.message || "Failed",
                      })),
                    );
                    const sample = failedRows
                      .slice(0, 3)
                      .map(
                        (r) =>
                          `Row ${(Number(r.index) || 0) + 1}: ${r.message || "Failed"}`,
                      )
                      .join("\n");
                    Swal.fire(
                      "Error",
                      sample ||
                        err?.response?.data?.message ||
                        "Failed to upload bulk subscriptions",
                      "error",
                    );
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Upload to Database
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b bg-gray-50 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {mode === "edit"
                    ? "Edit Subscription"
                    : mode === "upgrade"
                      ? "Upgrade Subscription"
                      : mode === "view"
                        ? "View Subscription"
                        : "Create Subscription"}
                </h2>
                <p className="text-xs text-gray-500">
                  {mode === "upgrade" ? (
                    "Only higher-priority plans (and Junior) are available"
                  ) : (
                    <>
                      Invoice No:{" "}
                      <span className="font-semibold">{subscriptionNo}</span>
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const result = await Swal.fire({
                title: "Are you sure?",
                text: "Any unsaved changes will be lost.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#4F46E5",
                cancelButtonColor: "#6B7280",
                confirmButtonText: "Yes, Close",
                cancelButtonText: "Cancel",
              });

              if (result.isConfirmed) {
                if (onClose) {
                  onClose();
                    } else {
                  navigate(-1);
                    }
              }
            }}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-black"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Customer
                  </label>
                  <input
                    value={customer}
                    onChange={(e) => {
                      setCustomer(e.target.value);
                      setSelectedCustomerId("");
                      setPhone("");
                      setMembership("-");
                      setCustomerDropdownOpen(true);
                    }}
                    onFocus={() => setCustomerDropdownOpen(true)}
                    placeholder="Search customer by name or phone"
                    className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                  />
                  {customerDropdownOpen &&
                    (loadingCustomers || customers.length > 0) && (
                      <div className="mt-1 max-h-48 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg z-20 relative">
                        {loadingCustomers ? (
                          <div className="p-2 text-sm text-gray-500">
                            Searching...
                          </div>
                        ) : (
                          customers.map((selectedCustomer) => {
                            const mType = String(
                              selectedCustomer.membershipType ?? "none",
                            ).trim();
                            const hasMembership =
                              Boolean(mType) &&
                              mType !== "-" &&
                              mType.toLowerCase() !== "none";
                            return (
                              <button
                                key={selectedCustomer._id}
                                type="button"
                                onClick={() => {
                                  setSelectedCustomerId(selectedCustomer._id);
                                  setCustomer(selectedCustomer.name);
                                  setPhone(selectedCustomer.mobile);
                                  setMembership(hasMembership ? mType : "none");
                                  const isJuniorCust =
                                    mType.toLowerCase().includes("junior") ||
                                    mType.toLowerCase().includes("junoir");
                                  setCustomerPriority(
                                    isJuniorCust || !hasMembership
                                      ? 0
                                      : Math.max(
                                          0,
                                          Number(
                                            selectedCustomer.priority ?? 0,
                                          ) || 0,
                                        ),
                                  );
                                  setCustomerDropdownOpen(false);
                                  if (mode === "upgrade") {
                                    setSelectedMembershipId("");
                                  }
                                }}
                                className="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-3 py-2.5 text-left text-sm hover:bg-gray-50 last:border-0"
                              >
                                <div className="min-w-0">
                                  <div className="truncate font-medium text-gray-800">
                                    {selectedCustomer.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {selectedCustomer.mobile}
                                  </div>
                                </div>
                                {hasMembership ? (
                                  <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                                    {mType}
                                  </span>
                                ) : (
                                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                    No plan
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  {selectedCustomerId &&
                    membership &&
                    membership !== "-" &&
                    membership.toLowerCase() !== "none" && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[11px] text-gray-500">
                          Current membership
                        </span>
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                          {membership}
                        </span>
                      </div>
                    )}
                  <button
                    type="button"
                    onClick={() => setShowCreateCustomerModal(true)}
                    className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    + Add New Customer
                  </button>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Phone Number
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Customer phone number"
                    className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Membership Plan
                  {mode === "upgrade" && effectiveCustomerPriority > 0 ? (
                    <span className="ml-2 font-normal text-violet-600">
                      (current priority: {effectiveCustomerPriority})
                    </span>
                  ) : null}
                </label>
                <select
                  value={selectedMembershipId}
                  onChange={(e) => {
                    setSelectedMembershipId(e.target.value);
                    setEndDateManuallyEdited(false);
                  }}
                  disabled={mode === "view"}
                  className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">
                    {loadingMemberships
                      ? "Loading memberships..."
                      : mode === "upgrade"
                        ? "Select upgrade plan"
                        : "Select membership plan"}
                  </option>
                  {selectableMemberships.map((m) => (
                    <option key={m._id} value={m._id}>
                      {`${m.displayName} • ₹${m.amount.toLocaleString("en-IN")} / ${m.period} • P${m.priority}${
                        m.walletCashbackAmount > 0
                          ? ` • Cashback ₹${m.walletCashbackAmount.toLocaleString("en-IN")}`
                          : ""
                      } • ${m.planId}`}
                    </option>
                  ))}
                </select>
                {mode === "upgrade" &&
                  !loadingMemberships &&
                  selectableMemberships.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      No higher-priority plans available for this customer.
                      Junior is always listed when configured.
                    </p>
                  )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Created By
                  </label>
                  <input
                    value={salesPerson}
                    disabled
                    className="h-10 w-full rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setEndDateManuallyEdited(false);
                    }}
                    className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setEndDateManuallyEdited(true);
                    }}
                    className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {juniorSelected && (
                <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-orange-800">
                      Junior Student Details
                    </h3>
                    <button
                      type="button"
                      onClick={addStudent}
                      className="rounded-md bg-orange-600 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-700"
                    >
                      + Add More Student
                    </button>
                  </div>

                  {students.map((student, index) => (
                    <div
                      key={`student-${index}`}
                      className="space-y-3 rounded-md border border-orange-200 bg-white p-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-700">
                          Student {index + 1}
                        </p>
                        {students.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStudent(index)}
                            className="text-xs font-semibold text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <input
                          value={student.studentName}
                          onChange={(e) =>
                            updateStudent(index, "studentName", e.target.value)
                          }
                          placeholder="Student Name"
                          className="h-10 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                        />
                        <input
                          value={student.schoolName}
                          onChange={(e) =>
                            updateStudent(index, "schoolName", e.target.value)
                          }
                          placeholder="School Name"
                          className="h-10 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                        />
                        <div className="flex flex-col">
                          <label className="mb-0.5 ml-1 text-[10px] font-bold text-gray-500">
                            DOB
                          </label>
                          <input
                            type="date"
                            value={student.dob}
                            onChange={(e) =>
                              updateStudent(index, "dob", e.target.value)
                            }
                            className="h-10 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="mb-0.5 ml-1 text-[10px] font-bold text-gray-500">
                            Gender
                          </label>
                          <select
                            value={student.gender}
                            onChange={(e) =>
                              updateStudent(index, "gender", e.target.value)
                            }
                            className="h-10 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                          >
                            <option value="">Select Gender</option>
                            <option value="Boy">Boy</option>
                            <option value="Girl">Girl</option>
                          </select>
                        </div>
                        <div className="flex flex-col">
                          <label className="mb-0.5 ml-1 text-[10px] font-bold text-gray-500">
                            Class / STD
                          </label>
                          <input
                            type="number"
                            value={student.classStd}
                            onChange={(e) =>
                              updateStudent(index, "classStd", e.target.value)
                            }
                            placeholder="Class / STD"
                            className="h-10 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                        <input
                          value={student.relation}
                          onChange={(e) =>
                            updateStudent(index, "relation", e.target.value)
                          }
                          placeholder="Relation"
                          className="h-10 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                        />
                        <input
                          value={student.parentName}
                          onChange={(e) =>
                            updateStudent(index, "parentName", e.target.value)
                          }
                          placeholder="Parent Name"
                          className="h-10 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                        />
                        <div className="md:col-span-1">
                          <label className="mb-1 block text-xs font-semibold text-gray-600">
                            Student ID Photo
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={student.studentIdUpload}
                              onChange={(e) =>
                                updateStudent(
                                  index,
                                  "studentIdUpload",
                                  e.target.value,
                                )
                              }
                              placeholder="ID Photo (URL/Upload)"
                              className="h-10 flex-1 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              className="flex h-10 items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-3 text-gray-600 hover:bg-gray-100"
                              onClick={() => {
                                const input = document.createElement("input");
                                input.type = "file";
                                input.accept = "image/*";
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement)
                                    .files?.[0];
                                  if (file) {
                                    updateStudent(
                                      index,
                                      "studentIdUpload",
                                      file.name,
                                    );
                                  }
                                };
                                input.click();
                              }}
                            >
                              <Camera size={18} />
                            </button>
                          </div>
                        </div>
                        <div className="md:col-span-1">
                          <label className="mb-1 block text-xs font-semibold text-gray-600">
                            Form Image
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={student.formImageUpload}
                              onChange={(e) =>
                                updateStudent(
                                  index,
                                  "formImageUpload",
                                  e.target.value,
                                )
                              }
                              placeholder="Form Image (URL/Upload)"
                              className="h-10 flex-1 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              className="flex h-10 items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-3 text-gray-600 hover:bg-gray-100"
                              onClick={() => {
                                const input = document.createElement("input");
                                input.type = "file";
                                input.accept = "image/*";
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement)
                                    .files?.[0];
                                  if (file) {
                                    updateStudent(
                                      index,
                                      "formImageUpload",
                                      file.name,
                                    );
                                  }
                                };
                                input.click();
                              }}
                            >
                              <Camera size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[72px] w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="Add notes for this subscription..."
                />
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Invoice Number</span>
                  <span className="font-semibold text-gray-800">
                    {subscriptionNo}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="text-lg font-semibold text-gray-900">
                    ₹{" "}
                    {grandTotal.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  if (onClose) onClose();
                  else navigate(-1);
                }}
                className="rounded-lg bg-gray-200 px-4 py-2 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (validateBeforeCheckout()) setOpenCheckout(true);
                }}
                disabled={saving || mode === "view"}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer size={16} />
                Checkout
              </button>
            </div>
          </>
        )}
      </div>

      {showCreateCustomerModal && (
        <CreateCustomerModal
          onClose={() => setShowCreateCustomerModal(false)}
          onSubmit={handleCreateCustomerSubmit}
          loading={creatingCustomer}
        />
      )}

      <CheckoutModal
        open={openCheckout}
        grandTotal={grandTotal}
        disableCashback
        items={
          selectedMembership
            ? [
              {
                id: 1,
                name: selectedMembership.displayName,
                qty: 1,
                price: selectedMembership.amount,
                discount: 0,
                category: "membership",
                cashback: selectedMembership.walletCashbackAmount,
              },
            ]
            : []
        }
        initialCustomerName={customer}
        initialCustomerPhone={phone}
        initialCustomerId={selectedCustomerId || null}
        initialMembership={selectedMembership?.displayName ?? ""}
        initialCashbackTotal={
          selectedMembership?.walletCashbackAmount ?? 0
        }
        onClose={() => setOpenCheckout(false)}
        onConfirmPayment={async (payment) => {
          setOpenCheckout(false);
          await handleSaveSubscription(payment);
        }}
      />
      {mode === "view" && (
        <div className="pointer-events-none fixed inset-0 z-[55] rounded-2xl bg-transparent" />
      )}
    </div>
  );
}
