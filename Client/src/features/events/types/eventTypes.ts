export type EventStatus = "Draft" | "Published" | "Completed" | "Cancelled";

export type EventFormat = "Physical" | "Online" | "Hybrid";

export type TicketVisibility = "Public" | "Hidden" | "AccessCodeOnly";

export type TicketStatus = "Active" | "Paused" | "SoldOut";

export type PaymentStatus = "Paid" | "Pending" | "Refunded" | "Cancelled" | "Failed";

export type CheckInStatus = "CheckedIn" | "NotCheckedIn";

export type SeatingType = "GeneralAdmission" | "ReservedSeating";

export interface EventSession {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  description?: string;
  speakerName?: string;
  speakerRole?: string;
  location?: string; // Room / Stage / Online URL
  capacity?: number;
}

export interface EventDateSchedule {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  sessions: EventSession[];
}

export interface TimeBasedPriceRule {
  id: string;
  label: string; // e.g. "Morning Session"
  applicableDate?: string;
  applicableSessionId?: string;
  startTime?: string;
  endTime?: string;
  price: number;
  availableQuantity: number;
  validFrom?: string;
  validUntil?: string;
  priority: number;
}

export interface TicketType {
  id: string;
  name: string; // General, VIP, Early Bird, etc.
  description: string;
  color: string; // Hex color tag
  price: number; // ₹0 for free
  isFree: boolean;
  totalQuantity: number;
  soldQuantity: number;
  minPurchaseQty: number;
  maxPurchaseQty: number;
  saleStartDate: string;
  saleEndDate: string;
  perPersonLimit: number;
  visibility: TicketVisibility;
  status: TicketStatus;
  timeBasedPricingEnabled?: boolean;
  timeBasedRules?: TimeBasedPriceRule[];
  earlyBirdDiscountPercent?: number;
  earlyBirdEndDate?: string;
  assignedSectionId?: string;
}

export interface Seat {
  id: string;
  sectionId: string;
  row: string; // e.g. "A"
  number: number; // e.g. 1
  label: string; // e.g. "A-1"
  status: "Available" | "Reserved" | "Sold" | "Blocked";
  price: number;
  attendeeId?: string;
  passCode?: string;
}

export interface SeatingSection {
  id: string;
  name: string; // e.g. "VIP Platinum Section"
  color: string;
  price: number;
  rows: number;
  seatsPerRow: number;
  seats: Seat[];
}

export interface SeatingMapConfig {
  type: SeatingType;
  sections: SeatingSection[];
  totalSeats: number;
  availableSeats: number;
  soldSeats: number;
  reservedSeats: number;
  blockedSeats: number;
}

export interface CustomFormField {
  id: string;
  name: string;
  label: string;
  type: "text" | "number" | "dropdown" | "checkbox" | "radio" | "file";
  placeholder?: string;
  description?: string;
  required: boolean;
  enabled: boolean;
  order: number;
  options?: string[]; // For dropdown or radio
}

export interface RegistrationSettings {
  enabled: boolean;
  openingDate: string;
  closingDate: string;
  maxRegistrations: number;
  allowMultipleTickets: boolean;
  maxTicketsPerOrder: number;
  allowGuestRegistration: boolean;
  approvalRequired: boolean;
  enableWaitlist: boolean;
  allowCancellation: boolean;
  cancellationDeadlineHours: number;
  preventDuplicateByEmail: boolean;
  preventDuplicateByPhone: boolean;
}

export interface TicketDesignSettings {
  ticketPrefix: string;
  enableQrCode: boolean;
  enableBarcode: boolean;
  themeColor: string;
  backgroundColor: string;
  backgroundImageUrl?: string;
  logoUrl?: string;
  showVenue: boolean;
  showSeatNumber: boolean;
  showEventDate: boolean;
  showPassCode: boolean;
  termsText: string;
}

export interface NotificationSettings {
  adminNotifyOnRegistration: boolean;
  adminNotifyOnPayment: boolean;
  adminNotifyOnCancellation: boolean;
  adminDailySummary: boolean;
  adminEmail: string;

  guestSendTicketConfirmation: boolean;
  guestSendReminder: boolean;
  guestReminderHoursBefore: number;
  guestSendCancellationEmail: boolean;
  guestSendApprovalStatus: boolean;
  guestSendPaymentReceipt: boolean;

  ticketEmailSubject: string;
  ticketEmailTemplate: string;
  reminderEmailSubject: string;
  reminderEmailTemplate: string;

  msgTicketsUnavailable: string;
  msgRegistrationClosed: string;
  msgRegistrationSuccess: string;
  msgPaymentFailed: string;
}

export interface EventPolicies {
  refundPolicy: string;
  refundPercentage: number;
  cancellationPolicy: string;
  transferPolicy: string;
  reschedulingPolicy: string;
  termsAndConditions: string;
  privacyPolicy: string;
  ageRestriction: string; // "All Ages" | "18+" | "21+" | "Kids Under 12 Free"
  entryRules: string;
  checkInRules: string;
}

export interface InvoicePaymentSettings {
  currency: string; // "INR"
  currencySymbol: string; // "₹"
  paymentGateway: "Razorpay" | "CashOnEntry" | "Both";
  razorpayKeyId: string;
  razorpayKeySecret?: string;
  isTestMode: boolean;
  taxEnabled: boolean;
  gstRatePercent: number; // 18
  convenienceFeeAmount: number;
  convenienceFeeType: "fixed" | "percent";
  platformFeeAmount: number;
  invoicePrefix: string;
  invoiceNumberFormat: string; // EVT-INV-YYYY-XXXX
  autoGenerateInvoice: boolean;
  gstin: string;
  businessName: string;
  businessAddress: string;
  businessPan?: string;
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  website?: string;
}

export interface EventCoupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usedCount: number;
  perCustomerLimit: number;
  applicableTicketTypes: string[]; // "all" or array of ticket IDs
  minOrderValue: number;
  status: "Active" | "Expired" | "Disabled";
  eventId?: string; // empty means global
}

export interface EventItem {
  id: string;
  name: string;
  shortTeaser: string;
  category: string;
  coverImage: string;
  galleryImages: string[];
  aboutRichText: string;
  tags: string[];
  organizer: string;
  contactEmail: string;
  contactNumber: string;

  isMultipleDates: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timeZone: string;
  multipleDates: EventDateSchedule[];

  format: EventFormat;
  venueName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  googleMapsUrl?: string;
  onlineMeetingUrl?: string;

  tickets: TicketType[];
  seatingMap: SeatingMapConfig;
  checkoutFields: CustomFormField[];
  registrationSettings: RegistrationSettings;
  ticketDesign: TicketDesignSettings;
  notifications: NotificationSettings;
  policies: EventPolicies;
  paymentSettings: InvoicePaymentSettings;
  socialLinks: SocialLinks;
  coupons: EventCoupon[];

  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  ticketTypeId: string;
  ticketName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  selectedSeats?: string[]; // e.g. ["A-1", "A-2"]
  sessionId?: string;
  sessionName?: string;
}

export interface EventOrder {
  id: string;
  orderNumber: string; // e.g. ORD-EVT-10023
  eventId: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  customerName: string;
  email: string;
  phone: string;
  items: OrderItem[];
  ticketCategory: string; // comma separated or primary
  totalQuantity: number;
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  taxAmount: number;
  convenienceFee: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: "Razorpay" | "UPI" | "Card" | "CashAtVenue";
  paymentReference?: string;
  invoiceNumber: string;
  bookingDate: string;
  customFieldValues?: Record<string, string>;
  attendeeIds: string[];
}

export interface EventAttendee {
  id: string;
  orderId: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  sessionName?: string;
  name: string;
  email: string;
  phone: string;
  ticketTypeId: string;
  ticketTypeName: string;
  ticketColor: string;
  seatNumber?: string;
  passCode: string; // Unique alphanumeric pass code
  qrCodeValue: string;
  barcodeValue: string;
  registrationDate: string;
  checkInStatus: CheckInStatus;
  checkedInAt?: string;
  checkedInBy?: string;
  customDetails?: Record<string, string>;
}

export interface CheckInLog {
  id: string;
  attendeeId: string;
  attendeeName: string;
  passCode: string;
  eventId: string;
  eventName: string;
  ticketType: string;
  seatNumber?: string;
  sessionName?: string;
  operatorName: string;
  timestamp: string;
  status: "Success" | "Reverted";
}
