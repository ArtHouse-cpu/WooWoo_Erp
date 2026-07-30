import { useEffect, useMemo, useState } from "react";
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
  type CustomerPayload,
  type CreateSubscriptionPayload,
} from "@/services/apiClient";
import CreateCustomerModal from "@/features/network/components/CreateCustomerModal";
import CheckoutModal from "../components/invoice/Modal/CheckoutModal";
import { printThermalReceipt } from "@/utils/printUtils";
import { Camera, Printer, X } from "lucide-react";

const today = new Date().toISOString().split("T")[0];
const SUBSCRIPTION_SEQ_KEY = "wooerp-subscription-seq";

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

type Mode = "create" | "edit" | "view" | "upgrade";
type RepeatType = "weekly" | "monthly" | "yearly";
type MembershipOption = {
  _id: string;
  planId: string;
  displayName: string;
  amount: number;
  period: string;
  priority: number;
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

const isJuniorPlan = (plan?: Pick<MembershipOption, "planId" | "displayName"> | null) => {
  const text = `${plan?.planId ?? ""} ${plan?.displayName ?? ""}`.toLowerCase();
  return text.includes("junior") || text.includes("junoir");
};

const getCustomerMembershipType = (plan?: Pick<MembershipOption, "planId" | "displayName"> | null) => {
  const raw = `${plan?.planId ?? ""} ${plan?.displayName ?? ""}`.toLowerCase();
  if (raw.includes("junior") || raw.includes("junoir")) return "junior";
  if (raw.includes("premium")) return "premium";
  if (raw.includes("special")) return "special";
  if (raw.includes("pro")) return "pro";
  return "general";
};

const parseDurationToDays = (periodRaw: string): number => {
  const period = String(periodRaw ?? "").trim().toLowerCase();
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

const computeEndDateFromPeriod = (startDateValue: string, periodRaw: string) => {
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
  onSave
}: {
  onClose?: () => void;
  initialData?: any;
  initialMode?: Mode;
  onSave?: () => void;
} = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>("create");
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
  const [students, setStudents] = useState<StudentForm[]>([createEmptyStudent()]);
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
        if (doc.subscriptionCode) setSubscriptionNo(String(doc.subscriptionCode));
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
    if (!mType || mType === "none" || mType.includes("junior") || mType.includes("junoir")) {
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
    const computedEndDate = computeEndDateFromPeriod(startDate, selectedMembership.period);
    setEndDate(computedEndDate);
  }, [selectedMembership, startDate, endDateManuallyEdited]);

  useEffect(() => {
    if (!juniorSelected) {
      setStudents([createEmptyStudent()]);
    }
  }, [juniorSelected]);

  const buildPayload = (status: "draft" | "active"): CreateSubscriptionPayload => {
    const repeatUnit: "month" | "year" | null =
      repeatType === "yearly" ? "year" : "month";
    const repeatEvery = repeatType === "weekly" ? 1 : 1;

    const membershipTypeRaw =
      selectedMembership?.planId || selectedMembership?.displayName || "general";
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
        if (!s.studentName.trim() || !s.schoolName.trim() || !s.classStd.trim()) {
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
  }) => {
    try {
      setSaving(true);
      const couponDiscount = Number(payment.coupon?.discountAmount ?? 0);
      const referralDiscount = Number(payment.referral?.discountAmount ?? 0);
      const appliedDiscountTotal = Math.max(0, discountTotal + couponDiscount + referralDiscount);
      const payableTotal = Math.max(
        0,
        Number(payment.finalAmount ?? Math.max(0, grandTotal - couponDiscount - referralDiscount)),
      );
      const payload: CreateSubscriptionPayload = {
        ...buildPayload("active"),
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
        Swal.fire("Updated", "Subscription updated successfully.", "success").then(
          () => {
            if (onSave) onSave();
            if (onClose) onClose();
            else navigate(-1);
          }
        );
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
      prev.map((student, i) => (i === index ? { ...student, [field]: value } : student)),
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
              {mode === "upgrade"
                ? "Only higher-priority plans (and Junior) are available"
                : (
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
              {customerDropdownOpen && (loadingCustomers || customers.length > 0) && (
                <div className="mt-1 max-h-48 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg z-20 relative">
                  {loadingCustomers ? (
                    <div className="p-2 text-sm text-gray-500">Searching...</div>
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
                                    Number(selectedCustomer.priority ?? 0) || 0,
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
                    <span className="text-[11px] text-gray-500">Current membership</span>
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
                  {`${m.displayName} • ₹${m.amount.toLocaleString("en-IN")} / ${m.period} • P${m.priority} • ${m.planId}`}
                </option>
              ))}
            </select>
            {mode === "upgrade" &&
              !loadingMemberships &&
              selectableMemberships.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  No higher-priority plans available for this customer. Junior
                  is always listed when configured.
                </p>
              )}
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
                        onChange={(e) => updateStudent(index, "dob", e.target.value)}
                        className="h-10 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-0.5 ml-1 text-[10px] font-bold text-gray-500">
                        Gender
                      </label>
                      <select
                        value={student.gender}
                        onChange={(e) => updateStudent(index, "gender", e.target.value)}
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
                            updateStudent(index, "studentIdUpload", e.target.value)
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
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                updateStudent(index, "studentIdUpload", file.name);
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
                            updateStudent(index, "formImageUpload", e.target.value)
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
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                updateStudent(index, "formImageUpload", file.name);
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
              <span className="font-semibold text-gray-800">{subscriptionNo}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-gray-600">Total Amount</span>
              <span className="text-lg font-semibold text-gray-900">
                ₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
              },
            ]
            : []
        }
        initialCustomerName={customer}
        initialCustomerPhone={phone}
        initialCustomerId={selectedCustomerId || null}
        initialMembership={selectedMembership?.displayName ?? ""}
        initialCashbackTotal={0}
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
