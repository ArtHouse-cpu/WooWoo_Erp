import type {
  EventItem,
  TicketType,
  SeatingSection,
  CustomFormField,
  RegistrationSettings,
  TicketDesignSettings,
  NotificationSettings,
  EventPolicies,
  InvoicePaymentSettings,
} from "../types/eventTypes";

export const formatInr = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export const generatePassCode = (prefix = "EVT"): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let random = "";
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${random}`;
};

export const generateId = (): string => {
  return "id_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

export const createDefaultSeatingSection = (
  name: string,
  color: string,
  price: number,
  rowsCount = 5,
  seatsPerRow = 10,
): SeatingSection => {
  const sectionId = generateId();
  const seats = [];
  const rowLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (let r = 0; r < rowsCount; r++) {
    const rowLetter = rowLetters[r] || `R${r + 1}`;
    for (let s = 1; s <= seatsPerRow; s++) {
      seats.push({
        id: `${sectionId}_${rowLetter}_${s}`,
        sectionId,
        row: rowLetter,
        number: s,
        label: `${rowLetter}-${s}`,
        status: (Math.random() > 0.85 ? "Sold" : "Available") as "Available" | "Reserved" | "Sold" | "Blocked",
        price,
      });
    }
  }

  return {
    id: sectionId,
    name,
    color,
    price,
    rows: rowsCount,
    seatsPerRow,
    seats,
  };
};

export const DEFAULT_CHECKOUT_FIELDS: CustomFormField[] = [
  {
    id: "f_name",
    name: "fullName",
    label: "Full Name",
    type: "text",
    placeholder: "e.g. Rahul Sharma",
    required: true,
    enabled: true,
    order: 1,
  },
  {
    id: "f_email",
    name: "email",
    label: "Email Address",
    type: "text",
    placeholder: "e.g. rahul@example.com",
    required: true,
    enabled: true,
    order: 2,
  },
  {
    id: "f_phone",
    name: "phone",
    label: "Mobile Number",
    type: "text",
    placeholder: "e.g. 9876543210",
    required: true,
    enabled: true,
    order: 3,
  },
  {
    id: "f_company",
    name: "companyName",
    label: "Company / Organization",
    type: "text",
    placeholder: "e.g. Acme Corp",
    required: false,
    enabled: true,
    order: 4,
  },
  {
    id: "f_designation",
    name: "designation",
    label: "Job Title / Designation",
    type: "text",
    placeholder: "e.g. Senior Product Manager",
    required: false,
    enabled: true,
    order: 5,
  },
  {
    id: "f_age",
    name: "age",
    label: "Age Group",
    type: "dropdown",
    placeholder: "Select your age group",
    options: ["Under 18", "18-24", "25-34", "35-44", "45+"],
    required: false,
    enabled: true,
    order: 6,
  },
  {
    id: "f_gender",
    name: "gender",
    label: "Gender",
    type: "radio",
    options: ["Male", "Female", "Other", "Prefer not to say"],
    required: false,
    enabled: false,
    order: 7,
  },
];

export const DEFAULT_REGISTRATION_SETTINGS: RegistrationSettings = {
  enabled: true,
  openingDate: new Date().toISOString().slice(0, 10),
  closingDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  maxRegistrations: 1000,
  allowMultipleTickets: true,
  maxTicketsPerOrder: 10,
  allowGuestRegistration: true,
  approvalRequired: false,
  enableWaitlist: true,
  allowCancellation: true,
  cancellationDeadlineHours: 24,
  preventDuplicateByEmail: true,
  preventDuplicateByPhone: true,
};

export const DEFAULT_TICKET_DESIGN: TicketDesignSettings = {
  ticketPrefix: "TKT-2026",
  enableQrCode: true,
  enableBarcode: true,
  themeColor: "#ea580c", // Orange
  backgroundColor: "#ffffff",
  showVenue: true,
  showSeatNumber: true,
  showEventDate: true,
  showPassCode: true,
  termsText:
    "This ticket is valid for single entry only. Entry strictly subject to security screening. Non-refundable and non-transferable unless authorized by the organizer.",
};

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  adminNotifyOnRegistration: true,
  adminNotifyOnPayment: true,
  adminNotifyOnCancellation: true,
  adminDailySummary: true,
  adminEmail: "events@woowoo.co.in",

  guestSendTicketConfirmation: true,
  guestSendReminder: true,
  guestReminderHoursBefore: 24,
  guestSendCancellationEmail: true,
  guestSendApprovalStatus: true,
  guestSendPaymentReceipt: true,

  ticketEmailSubject: "🎉 Your Entry Pass & Tickets for {{event_name}}",
  ticketEmailTemplate:
    "Hi {{attendee_name}},\n\nYour registration for {{event_name}} is confirmed! Here is your entry pass.\n\nDate: {{event_date}}\nVenue: {{venue}}\nTicket: {{ticket_type}}\nPass Code: {{pass_code}}\n\nPlease show your QR code at the check-in gate for quick scanning.",

  reminderEmailSubject: "⏰ Reminder: {{event_name}} starts tomorrow!",
  reminderEmailTemplate:
    "Hello {{attendee_name}},\n\nJust a quick reminder that {{event_name}} is happening on {{event_date}} at {{venue}}. Gates open 1 hour prior to session start.",

  msgTicketsUnavailable: "Sorry, all tickets for this category are currently sold out.",
  msgRegistrationClosed: "Registration for this event is now closed. Stay tuned for future dates!",
  msgRegistrationSuccess: "Congratulations! Your registration was successful. Check your email for your digital entry pass.",
  msgPaymentFailed: "Payment authorization failed. Please try again or use an alternative payment method.",
};

export const DEFAULT_POLICIES: EventPolicies = {
  refundPolicy:
    "Full refund available up to 48 hours prior to the event start. 50% refund between 48 hours and 24 hours. No refunds within 24 hours of event kickoff.",
  refundPercentage: 100,
  cancellationPolicy:
    "Attendees can cancel their registration directly through their order link subject to the refund cutoff window.",
  transferPolicy:
    "Tickets can be transferred to another individual up to 6 hours before event commencement with proof of original booking.",
  reschedulingPolicy:
    "In case of event rescheduling, original tickets remain 100% valid for the new date or full refund is offered.",
  termsAndConditions:
    "1. The organizers reserve the right to admission.\n2. Audio and video recording during exclusive keynote sessions is strictly prohibited.\n3. The organizer accepts no responsibility for lost or stolen personal belongings.",
  privacyPolicy:
    "Attendee contact details will only be used for official event communications and updates. We never share your data with unauthorized third parties.",
  ageRestriction: "All Ages Welcome (Under 16 must be accompanied by an adult)",
  entryRules: "Valid photo ID required at the gate alongside the digital ticket QR code. Dress code: Smart Casual.",
  checkInRules: "Gates open 60 minutes prior to session start. Re-entry allowed only with official wristband/digital badge.",
};

export const DEFAULT_PAYMENT_SETTINGS: InvoicePaymentSettings = {
  currency: "INR",
  currencySymbol: "₹",
  paymentGateway: "Razorpay",
  razorpayKeyId: "rzp_live_woowoo_demo",
  isTestMode: true,
  taxEnabled: true,
  gstRatePercent: 18,
  convenienceFeeAmount: 50,
  convenienceFeeType: "fixed",
  platformFeeAmount: 0,
  invoicePrefix: "EVT-INV-2026-",
  invoiceNumberFormat: "EVT-INV-YYYY-XXXX",
  autoGenerateInvoice: true,
  gstin: "27AABCV1234F1Z8",
  businessName: "WooWoo ArtHouse & Event Venues Ltd.",
  businessAddress: "402, Creative Hub, Park Street, Mumbai, Maharashtra 400001",
  businessPan: "AABCV1234F",
};

export const createBlankEvent = (): EventItem => {
  const vipSection = createDefaultSeatingSection("VIP Lounge", "#9333ea", 2499, 4, 8);
  const generalSection = createDefaultSeatingSection("General Auditorium", "#2563eb", 999, 6, 12);

  return {
    id: generateId(),
    name: "",
    shortTeaser: "",
    category: "Technology",
    coverImage:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80",
    ],
    aboutRichText:
      "<p>Join us for an immersive, world-class experience gathering industry leaders, innovators, and creators under one roof.</p>",
    tags: ["Conference", "Technology", "Networking", "2026"],
    organizer: "WooWoo ArtHouse Events",
    contactEmail: "events@woowoo.co.in",
    contactNumber: "+91 98200 12345",

    isMultipleDates: false,
    startDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    startTime: "09:30",
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    endTime: "18:00",
    timeZone: "IST (UTC+5:30)",
    multipleDates: [],

    format: "Physical",
    venueName: "WooWoo Grand Exhibition Hall",
    address: "Plot 45, BKC Avenue, Bandra East",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    zipCode: "400051",
    googleMapsUrl: "https://maps.google.com/?q=Bandra+Kurla+Complex+Mumbai",
    onlineMeetingUrl: "",

    tickets: [
      {
        id: generateId(),
        name: "General Admission",
        description: "Full day access to keynotes, open exhibition booths, and lunch buffet.",
        color: "#2563eb",
        price: 999,
        isFree: false,
        totalQuantity: 300,
        soldQuantity: 0,
        minPurchaseQty: 1,
        maxPurchaseQty: 10,
        saleStartDate: new Date().toISOString().slice(0, 10),
        saleEndDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        perPersonLimit: 5,
        visibility: "Public",
        status: "Active",
        timeBasedPricingEnabled: true,
        timeBasedRules: [
          {
            id: generateId(),
            label: "Morning Keynote Session",
            price: 799,
            startTime: "09:30",
            endTime: "13:00",
            availableQuantity: 150,
            priority: 1,
          },
          {
            id: generateId(),
            label: "Afternoon Workshop & Networking",
            price: 999,
            startTime: "14:00",
            endTime: "18:00",
            availableQuantity: 150,
            priority: 2,
          },
        ],
      },
      {
        id: generateId(),
        name: "VIP All-Access Pass",
        description: "Front-row reserved seating, speaker lounge access, and exclusive cocktail dinner.",
        color: "#9333ea",
        price: 2499,
        isFree: false,
        totalQuantity: 50,
        soldQuantity: 0,
        minPurchaseQty: 1,
        maxPurchaseQty: 4,
        saleStartDate: new Date().toISOString().slice(0, 10),
        saleEndDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        perPersonLimit: 2,
        visibility: "Public",
        status: "Active",
      },
    ],

    seatingMap: {
      type: "ReservedSeating",
      sections: [vipSection, generalSection],
      totalSeats: vipSection.seats.length + generalSection.seats.length,
      availableSeats:
        vipSection.seats.filter((s) => s.status === "Available").length +
        generalSection.seats.filter((s) => s.status === "Available").length,
      soldSeats:
        vipSection.seats.filter((s) => s.status === "Sold").length +
        generalSection.seats.filter((s) => s.status === "Sold").length,
      reservedSeats: 0,
      blockedSeats: 0,
    },

    checkoutFields: [...DEFAULT_CHECKOUT_FIELDS],
    registrationSettings: { ...DEFAULT_REGISTRATION_SETTINGS },
    ticketDesign: { ...DEFAULT_TICKET_DESIGN },
    notifications: { ...DEFAULT_NOTIFICATIONS },
    policies: { ...DEFAULT_POLICIES },
    paymentSettings: { ...DEFAULT_PAYMENT_SETTINGS },
    socialLinks: {
      instagram: "https://instagram.com/woowoo_events",
      facebook: "https://facebook.com/woowoo.arthouse",
      linkedin: "https://linkedin.com/company/woowoo-erp",
      website: "https://woowoo.co.in",
    },
    coupons: [
      {
        id: generateId(),
        code: "EARLYBIRD20",
        discountType: "percentage",
        discountValue: 20,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        usageLimit: 100,
        usedCount: 14,
        perCustomerLimit: 1,
        applicableTicketTypes: ["all"],
        minOrderValue: 500,
        status: "Active",
      },
    ],

    status: "Draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};
