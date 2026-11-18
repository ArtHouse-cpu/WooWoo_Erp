import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  EventItem,
  EventOrder,
  EventAttendee,
  CheckInLog,
  EventCoupon,
  EventStatus,
  PaymentStatus,
  InvoicePaymentSettings,
} from "../types/eventTypes";
import {
  createBlankEvent,
  createDefaultSeatingSection,
  DEFAULT_CHECKOUT_FIELDS,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_POLICIES,
  DEFAULT_REGISTRATION_SETTINGS,
  DEFAULT_TICKET_DESIGN,
} from "../utils/eventHelpers";

interface EventStoreState {
  events: EventItem[];
  orders: EventOrder[];
  attendees: EventAttendee[];
  checkInLogs: CheckInLog[];
  globalCoupons: EventCoupon[];
  globalSettings: InvoicePaymentSettings;

  // Event actions
  addEvent: (event: EventItem) => void;
  updateEvent: (id: string, updates: Partial<EventItem>) => void;
  deleteEvent: (id: string) => void;
  duplicateEvent: (id: string) => EventItem;
  setEventStatus: (id: string, status: EventStatus) => void;

  // Order actions
  addOrder: (order: EventOrder) => void;
  updateOrderStatus: (id: string, status: PaymentStatus, refundAmount?: number) => void;
  cancelOrder: (id: string) => void;

  // Check-in actions
  checkInAttendee: (passCodeOrId: string, operatorName?: string) => {
    success: boolean;
    status: "Valid" | "AlreadyUsed" | "NotFound" | "Cancelled" | "Refunded" | "WrongEvent";
    message: string;
    attendee?: EventAttendee;
  };
  revertCheckIn: (attendeeId: string, operatorName?: string) => boolean;

  // Coupon actions
  addCoupon: (coupon: EventCoupon) => void;
  updateCoupon: (id: string, updates: Partial<EventCoupon>) => void;
  deleteCoupon: (id: string) => void;
  toggleCouponStatus: (id: string) => void;

  // Settings
  updateGlobalSettings: (settings: Partial<InvoicePaymentSettings>) => void;

  // Reset
  resetToDefaultSeed: () => void;
}

const buildSeedData = () => {
  const vip1 = createDefaultSeatingSection("Platinum VIP", "#9333ea", 2999, 3, 8);
  const gen1 = createDefaultSeatingSection("Auditorium Floor", "#2563eb", 999, 6, 12);

  const event1: EventItem = {
    id: "evt_techsummit_2026",
    name: "TechSummit Horizons 2026",
    shortTeaser: "India's premier technology, cloud architecture, and product leadership conference.",
    category: "Technology",
    coverImage:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80",
    ],
    aboutRichText: `
      <h3>Welcome to TechSummit Horizons 2026</h3>
      <p>Gathering over 1,500 CTOs, Engineering Heads, Product Pioneers, and Founders across the subcontinent.</p>
      <ul>
        <li>3 Keynote stages with 30+ international speakers</li>
        <li>Hands-on deep dive architecture workshops</li>
        <li>Curated 1-on-1 investor & enterprise matching</li>
        <li>Evening networking cocktail dinner at the Grand Terrace</li>
      </ul>
    `,
    tags: ["Technology", "AI & Cloud", "Enterprise", "Architecture"],
    organizer: "WooWoo Tech Innovations",
    contactEmail: "techsummit@woowoo.co.in",
    contactNumber: "+91 98200 88771",

    isMultipleDates: true,
    startDate: "2026-12-10",
    startTime: "09:00",
    endDate: "2026-12-12",
    endTime: "18:30",
    timeZone: "IST (UTC+5:30)",
    multipleDates: [
      {
        id: "d1",
        date: "2026-12-10",
        startTime: "09:00",
        endTime: "18:00",
        sessions: [
          {
            id: "s1",
            title: "Opening Keynote: Next-Gen Agentic Systems",
            date: "2026-12-10",
            startTime: "09:30",
            endTime: "11:00",
            speakerName: "Dr. Arvind Subramanian",
            speakerRole: "Chief AI Scientist, HyperScale",
            location: "Hall A - Main Auditorium",
          },
          {
            id: "s2",
            title: "Cloud Native Resilience at Terabyte Scale",
            date: "2026-12-10",
            startTime: "11:30",
            endTime: "13:00",
            speakerName: "Pooja Varma",
            speakerRole: "VP Engineering, CloudGrid",
            location: "Hall B - Deep Dive Stage",
          },
        ],
      },
      {
        id: "d2",
        date: "2026-12-11",
        startTime: "09:30",
        endTime: "18:30",
        sessions: [
          {
            id: "s3",
            title: "FinTech & Real-Time Settlement Architectures",
            date: "2026-12-11",
            startTime: "10:00",
            endTime: "12:00",
            speakerName: "Vikram Malhotra",
            speakerRole: "CTO, PayStream",
            location: "Hall A - Main Auditorium",
          },
        ],
      },
    ],

    format: "Hybrid",
    venueName: "Jio World Convention Centre",
    address: "G Block BKC, Bandra Kurla Complex",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    zipCode: "400051",
    googleMapsUrl: "https://maps.google.com/?q=Jio+World+Convention+Centre+Mumbai",
    onlineMeetingUrl: "https://stream.woowoo.co.in/techsummit2026",

    tickets: [
      {
        id: "tkt_gen_01",
        name: "General Delegate Pass",
        description: "Full access to 3 conference stages, exhibition floor, and buffet lunch.",
        color: "#2563eb",
        price: 1499,
        isFree: false,
        totalQuantity: 500,
        soldQuantity: 184,
        minPurchaseQty: 1,
        maxPurchaseQty: 10,
        saleStartDate: "2026-10-01",
        saleEndDate: "2026-12-09",
        perPersonLimit: 5,
        visibility: "Public",
        status: "Active",
        timeBasedPricingEnabled: true,
        timeBasedRules: [
          {
            id: "rule_morn",
            label: "Morning Session Only",
            price: 899,
            startTime: "09:00",
            endTime: "13:00",
            availableQuantity: 200,
            priority: 1,
          },
          {
            id: "rule_full",
            label: "Full Day Pass",
            price: 1499,
            startTime: "09:00",
            endTime: "18:00",
            availableQuantity: 300,
            priority: 2,
          },
        ],
      },
      {
        id: "tkt_vip_01",
        name: "VIP All-Access Pass",
        description: "Priority VIP lounge, reserved front-row seating, speaker dinner & valet parking.",
        color: "#9333ea",
        price: 3499,
        isFree: false,
        totalQuantity: 80,
        soldQuantity: 56,
        minPurchaseQty: 1,
        maxPurchaseQty: 4,
        saleStartDate: "2026-10-01",
        saleEndDate: "2026-12-09",
        perPersonLimit: 2,
        visibility: "Public",
        status: "Active",
      },
      {
        id: "tkt_stu_01",
        name: "Student Innovation Pass",
        description: "Special subsidized access for university students with valid student ID card.",
        color: "#16a34a",
        price: 499,
        isFree: false,
        totalQuantity: 100,
        soldQuantity: 42,
        minPurchaseQty: 1,
        maxPurchaseQty: 2,
        saleStartDate: "2026-10-01",
        saleEndDate: "2026-12-09",
        perPersonLimit: 1,
        visibility: "Public",
        status: "Active",
      },
    ],

    seatingMap: {
      type: "ReservedSeating",
      sections: [vip1, gen1],
      totalSeats: vip1.seats.length + gen1.seats.length,
      availableSeats: 58,
      soldSeats: 32,
      reservedSeats: 6,
      blockedSeats: 0,
    },

    checkoutFields: [...DEFAULT_CHECKOUT_FIELDS],
    registrationSettings: { ...DEFAULT_REGISTRATION_SETTINGS, maxRegistrations: 680 },
    ticketDesign: { ...DEFAULT_TICKET_DESIGN, themeColor: "#2563eb" },
    notifications: { ...DEFAULT_NOTIFICATIONS },
    policies: { ...DEFAULT_POLICIES },
    paymentSettings: { ...DEFAULT_PAYMENT_SETTINGS },
    socialLinks: {
      instagram: "https://instagram.com/techsummit_india",
      linkedin: "https://linkedin.com/company/techsummit-horizons",
      website: "https://techsummit2026.woowoo.co.in",
    },
    coupons: [],

    status: "Published",
    createdAt: "2026-10-15T10:00:00Z",
    updatedAt: "2026-11-10T14:30:00Z",
  };

  const event2: EventItem = {
    id: "evt_designcraft_2026",
    name: "DesignCraft UX & Creative Masterclass",
    shortTeaser: "A 2-day hands-on masterclass on design systems, micro-interactions, and AI design tools.",
    category: "Design & Arts",
    coverImage:
      "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1200&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80",
    ],
    aboutRichText:
      "<p>Elevate your design craft with masterclasses led by principal designers from Spotify, Airbnb, and Figma.</p>",
    tags: ["Design", "UI/UX", "Workshop", "Figma"],
    organizer: "ArtHouse Design Lab",
    contactEmail: "design@woowoo.co.in",
    contactNumber: "+91 99300 44552",

    isMultipleDates: false,
    startDate: "2026-11-28",
    startTime: "10:00",
    endDate: "2026-11-29",
    endTime: "17:00",
    timeZone: "IST (UTC+5:30)",
    multipleDates: [],

    format: "Physical",
    venueName: "WooWoo ArtHouse Studio 4",
    address: "Indiranagar 100ft Road, Stage 2",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    zipCode: "560038",
    googleMapsUrl: "https://maps.google.com/?q=Indiranagar+Bangalore",

    tickets: [
      {
        id: "tkt_dsgn_wk",
        name: "Workshop Pass",
        description: "Includes design toolkit, Figma assets pack, lunch, and certificate.",
        color: "#ea580c",
        price: 1999,
        isFree: false,
        totalQuantity: 120,
        soldQuantity: 98,
        minPurchaseQty: 1,
        maxPurchaseQty: 4,
        saleStartDate: "2026-09-01",
        saleEndDate: "2026-11-27",
        perPersonLimit: 2,
        visibility: "Public",
        status: "Active",
      },
    ],

    seatingMap: {
      type: "GeneralAdmission",
      sections: [],
      totalSeats: 120,
      availableSeats: 22,
      soldSeats: 98,
      reservedSeats: 0,
      blockedSeats: 0,
    },

    checkoutFields: [...DEFAULT_CHECKOUT_FIELDS],
    registrationSettings: { ...DEFAULT_REGISTRATION_SETTINGS, maxRegistrations: 120 },
    ticketDesign: { ...DEFAULT_TICKET_DESIGN, themeColor: "#ea580c" },
    notifications: { ...DEFAULT_NOTIFICATIONS },
    policies: { ...DEFAULT_POLICIES },
    paymentSettings: { ...DEFAULT_PAYMENT_SETTINGS },
    socialLinks: {
      instagram: "https://instagram.com/designcraft_masterclass",
    },
    coupons: [],

    status: "Published",
    createdAt: "2026-09-05T09:00:00Z",
    updatedAt: "2026-11-12T11:20:00Z",
  };

  const event3: EventItem = {
    id: "evt_fintech_2026",
    name: "FinTech Horizons India Conference",
    shortTeaser: "Regulatory sandbox, cross-border UPI, and CBDC integration summit.",
    category: "Finance & Banking",
    coverImage:
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80",
    galleryImages: [],
    aboutRichText: "<p>Explore the future of digital banking and global payments in India.</p>",
    tags: ["FinTech", "Banking", "UPI", "Regulations"],
    organizer: "FinTech Guild India",
    contactEmail: "fintech@woowoo.co.in",
    contactNumber: "+91 98111 22334",

    isMultipleDates: false,
    startDate: "2027-01-15",
    startTime: "09:00",
    endDate: "2027-01-16",
    endTime: "18:00",
    timeZone: "IST (UTC+5:30)",
    multipleDates: [],

    format: "Physical",
    venueName: "The Leela Palace Convention Center",
    address: "Diplomatic Enclave, Chanakyapuri",
    city: "New Delhi",
    state: "Delhi",
    country: "India",
    zipCode: "110023",

    tickets: [
      {
        id: "tkt_fin_early",
        name: "Early Bird Corporate Pass",
        description: "Full delegate access with discounted pricing for registrations before Dec 15.",
        color: "#0284c7",
        price: 2499,
        isFree: false,
        totalQuantity: 200,
        soldQuantity: 15,
        minPurchaseQty: 1,
        maxPurchaseQty: 5,
        saleStartDate: "2026-11-01",
        saleEndDate: "2026-12-15",
        perPersonLimit: 5,
        visibility: "Public",
        status: "Active",
      },
    ],

    seatingMap: {
      type: "GeneralAdmission",
      sections: [],
      totalSeats: 300,
      availableSeats: 285,
      soldSeats: 15,
      reservedSeats: 0,
      blockedSeats: 0,
    },

    checkoutFields: [...DEFAULT_CHECKOUT_FIELDS],
    registrationSettings: { ...DEFAULT_REGISTRATION_SETTINGS, maxRegistrations: 300 },
    ticketDesign: { ...DEFAULT_TICKET_DESIGN, themeColor: "#0284c7" },
    notifications: { ...DEFAULT_NOTIFICATIONS },
    policies: { ...DEFAULT_POLICIES },
    paymentSettings: { ...DEFAULT_PAYMENT_SETTINGS },
    socialLinks: {},
    coupons: [],

    status: "Draft",
    createdAt: "2026-11-01T12:00:00Z",
    updatedAt: "2026-11-01T12:00:00Z",
  };

  const events: EventItem[] = [event1, event2, event3];

  const orders: EventOrder[] = [
    {
      id: "ord_1001",
      orderNumber: "ORD-EVT-10023",
      eventId: event1.id,
      eventName: event1.name,
      eventDate: "10-12 Dec 2026",
      eventLocation: "Jio World Convention Centre, Mumbai",
      customerName: "Aarav Mehta",
      email: "aarav.mehta@acme.com",
      phone: "9820199201",
      ticketCategory: "VIP All-Access Pass",
      totalQuantity: 2,
      subtotal: 6998,
      discountAmount: 700,
      couponCode: "VIP10",
      taxAmount: 1133.64,
      convenienceFee: 50,
      totalAmount: 7481.64,
      paymentStatus: "Paid",
      paymentMethod: "Razorpay",
      paymentReference: "pay_Rzp9821873192",
      invoiceNumber: "EVT-INV-2026-00101",
      bookingDate: "2026-11-14T11:20:00Z",
      attendeeIds: ["att_01", "att_02"],
      items: [
        {
          ticketTypeId: "tkt_vip_01",
          ticketName: "VIP All-Access Pass",
          quantity: 2,
          unitPrice: 3499,
          subtotal: 6998,
          selectedSeats: ["A-1", "A-2"],
        },
      ],
    },
    {
      id: "ord_1002",
      orderNumber: "ORD-EVT-10024",
      eventId: event1.id,
      eventName: event1.name,
      eventDate: "10-12 Dec 2026",
      eventLocation: "Jio World Convention Centre, Mumbai",
      customerName: "Sneha Kapur",
      email: "sneha.k@innovate.in",
      phone: "9833411223",
      ticketCategory: "General Delegate Pass",
      totalQuantity: 1,
      subtotal: 1499,
      discountAmount: 0,
      taxAmount: 269.82,
      convenienceFee: 50,
      totalAmount: 1818.82,
      paymentStatus: "Paid",
      paymentMethod: "UPI",
      paymentReference: "upi_88921839210",
      invoiceNumber: "EVT-INV-2026-00102",
      bookingDate: "2026-11-15T14:15:00Z",
      attendeeIds: ["att_03"],
      items: [
        {
          ticketTypeId: "tkt_gen_01",
          ticketName: "General Delegate Pass",
          quantity: 1,
          unitPrice: 1499,
          subtotal: 1499,
          selectedSeats: ["B-4"],
        },
      ],
    },
    {
      id: "ord_1003",
      orderNumber: "ORD-EVT-10025",
      eventId: event2.id,
      eventName: event2.name,
      eventDate: "28-29 Nov 2026",
      eventLocation: "WooWoo ArtHouse Studio 4, Bengaluru",
      customerName: "Rohan Deshmukh",
      email: "rohan.design@gmail.com",
      phone: "9876543210",
      ticketCategory: "Workshop Pass",
      totalQuantity: 1,
      subtotal: 1999,
      discountAmount: 200,
      couponCode: "EARLYBIRD",
      taxAmount: 323.82,
      convenienceFee: 50,
      totalAmount: 2172.82,
      paymentStatus: "Paid",
      paymentMethod: "Card",
      paymentReference: "card_visa_4021",
      invoiceNumber: "EVT-INV-2026-00103",
      bookingDate: "2026-11-16T16:45:00Z",
      attendeeIds: ["att_04"],
      items: [
        {
          ticketTypeId: "tkt_dsgn_wk",
          ticketName: "Workshop Pass",
          quantity: 1,
          unitPrice: 1999,
          subtotal: 1999,
        },
      ],
    },
    {
      id: "ord_1004",
      orderNumber: "ORD-EVT-10026",
      eventId: event1.id,
      eventName: event1.name,
      eventDate: "10-12 Dec 2026",
      eventLocation: "Jio World Convention Centre, Mumbai",
      customerName: "Ananya Roy",
      email: "ananya.roy@techlabs.io",
      phone: "9910022334",
      ticketCategory: "General Delegate Pass",
      totalQuantity: 1,
      subtotal: 1499,
      discountAmount: 0,
      taxAmount: 269.82,
      convenienceFee: 50,
      totalAmount: 1818.82,
      paymentStatus: "Pending",
      paymentMethod: "UPI",
      invoiceNumber: "EVT-INV-2026-00104",
      bookingDate: "2026-11-17T09:10:00Z",
      attendeeIds: ["att_05"],
      items: [
        {
          ticketTypeId: "tkt_gen_01",
          ticketName: "General Delegate Pass",
          quantity: 1,
          unitPrice: 1499,
          subtotal: 1499,
          selectedSeats: ["C-2"],
        },
      ],
    },
    {
      id: "ord_1005",
      orderNumber: "ORD-EVT-10027",
      eventId: event1.id,
      eventName: event1.name,
      eventDate: "10-12 Dec 2026",
      eventLocation: "Jio World Convention Centre, Mumbai",
      customerName: "Sameer Joshi",
      email: "sameer.j@finpulse.co",
      phone: "9845012345",
      ticketCategory: "Student Innovation Pass",
      totalQuantity: 1,
      subtotal: 499,
      discountAmount: 0,
      taxAmount: 89.82,
      convenienceFee: 50,
      totalAmount: 638.82,
      paymentStatus: "Cancelled",
      paymentMethod: "Razorpay",
      invoiceNumber: "EVT-INV-2026-00105",
      bookingDate: "2026-11-12T13:20:00Z",
      attendeeIds: ["att_06"],
      items: [
        {
          ticketTypeId: "tkt_stu_01",
          ticketName: "Student Innovation Pass",
          quantity: 1,
          unitPrice: 499,
          subtotal: 499,
        },
      ],
    },
  ];

  const attendees: EventAttendee[] = [
    {
      id: "att_01",
      orderId: "ord_1001",
      eventId: event1.id,
      eventName: event1.name,
      eventDate: "10-12 Dec 2026",
      sessionName: "All Days - Morning & Afternoon",
      name: "Aarav Mehta",
      email: "aarav.mehta@acme.com",
      phone: "+91 98201 99201",
      ticketTypeId: "tkt_vip_01",
      ticketTypeName: "VIP All-Access Pass",
      ticketColor: "#9333ea",
      seatNumber: "A-1",
      passCode: "TSH-9821",
      qrCodeValue: "TSH-9821|Aarav Mehta|VIP|A-1",
      barcodeValue: "890123982101",
      registrationDate: "2026-11-14T11:20:00Z",
      checkInStatus: "CheckedIn",
      checkedInAt: "2026-11-18T09:12:00Z",
      checkedInBy: "Gate 1 - Operator Priya",
      customDetails: {
        companyName: "Acme Corp",
        designation: "VP Engineering",
      },
    },
    {
      id: "att_02",
      orderId: "ord_1001",
      eventId: event1.id,
      eventName: event1.name,
      eventDate: "10-12 Dec 2026",
      sessionName: "All Days - Morning & Afternoon",
      name: "Tanya Mehta",
      email: "tanya.m@acme.com",
      phone: "+91 98201 99202",
      ticketTypeId: "tkt_vip_01",
      ticketTypeName: "VIP All-Access Pass",
      ticketColor: "#9333ea",
      seatNumber: "A-2",
      passCode: "TSH-9822",
      qrCodeValue: "TSH-9822|Tanya Mehta|VIP|A-2",
      barcodeValue: "890123982202",
      registrationDate: "2026-11-14T11:20:00Z",
      checkInStatus: "NotCheckedIn",
      customDetails: {
        companyName: "Acme Corp",
        designation: "Head of AI",
      },
    },
    {
      id: "att_03",
      orderId: "ord_1002",
      eventId: event1.id,
      eventName: event1.name,
      eventDate: "10-12 Dec 2026",
      sessionName: "Morning Keynote Session",
      name: "Sneha Kapur",
      email: "sneha.k@innovate.in",
      phone: "+91 98334 11223",
      ticketTypeId: "tkt_gen_01",
      ticketTypeName: "General Delegate Pass",
      ticketColor: "#2563eb",
      seatNumber: "B-4",
      passCode: "TSH-4019",
      qrCodeValue: "TSH-4019|Sneha Kapur|General|B-4",
      barcodeValue: "890123401903",
      registrationDate: "2026-11-15T14:15:00Z",
      checkInStatus: "CheckedIn",
      checkedInAt: "2026-11-18T09:25:30Z",
      checkedInBy: "Gate 2 - Operator Vikram",
      customDetails: {
        companyName: "Innovate Labs",
        designation: "Principal Architect",
      },
    },
    {
      id: "att_04",
      orderId: "ord_1003",
      eventId: event2.id,
      eventName: event2.name,
      eventDate: "28-29 Nov 2026",
      sessionName: "Full Workshop",
      name: "Rohan Deshmukh",
      email: "rohan.design@gmail.com",
      phone: "+91 98765 43210",
      ticketTypeId: "tkt_dsgn_wk",
      ticketTypeName: "Workshop Pass",
      ticketColor: "#ea580c",
      passCode: "DCM-2201",
      qrCodeValue: "DCM-2201|Rohan Deshmukh|Workshop",
      barcodeValue: "890123220104",
      registrationDate: "2026-11-16T16:45:00Z",
      checkInStatus: "NotCheckedIn",
      customDetails: {
        companyName: "Freelance",
        designation: "UI/UX Designer",
      },
    },
    {
      id: "att_05",
      orderId: "ord_1004",
      eventId: event1.id,
      eventName: event1.name,
      eventDate: "10-12 Dec 2026",
      sessionName: "Morning Keynote Session",
      name: "Ananya Roy",
      email: "ananya.roy@techlabs.io",
      phone: "+91 99100 22334",
      ticketTypeId: "tkt_gen_01",
      ticketTypeName: "General Delegate Pass",
      ticketColor: "#2563eb",
      seatNumber: "C-2",
      passCode: "TSH-5590",
      qrCodeValue: "TSH-5590|Ananya Roy|General|C-2",
      barcodeValue: "890123559005",
      registrationDate: "2026-11-17T09:10:00Z",
      checkInStatus: "NotCheckedIn",
    },
    {
      id: "att_06",
      orderId: "ord_1005",
      eventId: event1.id,
      eventName: event1.name,
      eventDate: "10-12 Dec 2026",
      sessionName: "Full Day Pass",
      name: "Sameer Joshi",
      email: "sameer.j@finpulse.co",
      phone: "+91 98450 12345",
      ticketTypeId: "tkt_stu_01",
      ticketTypeName: "Student Innovation Pass",
      ticketColor: "#16a34a",
      passCode: "TSH-8812",
      qrCodeValue: "TSH-8812|Sameer Joshi|Student",
      barcodeValue: "890123881206",
      registrationDate: "2026-11-12T13:20:00Z",
      checkInStatus: "NotCheckedIn",
    },
  ];

  const checkInLogs: CheckInLog[] = [
    {
      id: "log_01",
      attendeeId: "att_01",
      attendeeName: "Aarav Mehta",
      passCode: "TSH-9821",
      eventId: event1.id,
      eventName: event1.name,
      ticketType: "VIP All-Access Pass",
      seatNumber: "A-1",
      operatorName: "Gate 1 - Operator Priya",
      timestamp: "2026-11-18T09:12:00Z",
      status: "Success",
    },
    {
      id: "log_02",
      attendeeId: "att_03",
      attendeeName: "Sneha Kapur",
      passCode: "TSH-4019",
      eventId: event1.id,
      eventName: event1.name,
      ticketType: "General Delegate Pass",
      seatNumber: "B-4",
      operatorName: "Gate 2 - Operator Vikram",
      timestamp: "2026-11-18T09:25:30Z",
      status: "Success",
    },
  ];

  const globalCoupons: EventCoupon[] = [
    {
      id: "cpn_earlybird",
      code: "EARLYBIRD20",
      discountType: "percentage",
      discountValue: 20,
      startDate: "2026-10-01",
      endDate: "2026-12-31",
      usageLimit: 250,
      usedCount: 84,
      perCustomerLimit: 1,
      applicableTicketTypes: ["all"],
      minOrderValue: 999,
      status: "Active",
    },
    {
      id: "cpn_vip500",
      code: "VIP500OFF",
      discountType: "fixed",
      discountValue: 500,
      startDate: "2026-11-01",
      endDate: "2026-12-25",
      usageLimit: 50,
      usedCount: 19,
      perCustomerLimit: 1,
      applicableTicketTypes: ["tkt_vip_01"],
      minOrderValue: 2500,
      status: "Active",
    },
    {
      id: "cpn_student50",
      code: "CAMPUSPASS",
      discountType: "percentage",
      discountValue: 50,
      startDate: "2026-10-01",
      endDate: "2026-11-30",
      usageLimit: 100,
      usedCount: 92,
      perCustomerLimit: 1,
      applicableTicketTypes: ["tkt_stu_01"],
      minOrderValue: 400,
      status: "Active",
    },
  ];

  return {
    events,
    orders,
    attendees,
    checkInLogs,
    globalCoupons,
    globalSettings: { ...DEFAULT_PAYMENT_SETTINGS },
  };
};

export const useEventStore = create<EventStoreState>()(
  persist(
    (set, get) => ({
      ...buildSeedData(),

      addEvent: (event) =>
        set((state) => ({
          events: [event, ...state.events],
        })),

      updateEvent: (id, updates) =>
        set((state) => ({
          events: state.events.map((e) =>
            e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
          ),
        })),

      deleteEvent: (id) =>
        set((state) => ({
          events: state.events.filter((e) => e.id !== id),
        })),

      duplicateEvent: (id) => {
        const target = get().events.find((e) => e.id === id);
        if (!target) return createBlankEvent();
        const newEvent: EventItem = {
          ...target,
          id: "evt_" + Math.random().toString(36).substr(2, 9),
          name: `${target.name} (Copy)`,
          status: "Draft",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          events: [newEvent, ...state.events],
        }));
        return newEvent;
      },

      setEventStatus: (id, status) =>
        set((state) => ({
          events: state.events.map((e) =>
            e.id === id ? { ...e, status, updatedAt: new Date().toISOString() } : e
          ),
        })),

      addOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders],
        })),

      updateOrderStatus: (id, status, refundAmount) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  paymentStatus: status,
                  discountAmount: refundAmount !== undefined ? refundAmount : o.discountAmount,
                }
              : o
          ),
        })),

      cancelOrder: (id) =>
        set((state) => {
          const order = state.orders.find((o) => o.id === id);
          if (!order) return state;

          return {
            orders: state.orders.map((o) =>
              o.id === id ? { ...o, paymentStatus: "Cancelled" } : o
            ),
            attendees: state.attendees.filter((a) => !order.attendeeIds.includes(a.id)),
          };
        }),

      checkInAttendee: (passCodeOrId, operatorName = "Gate Operator 1") => {
        const query = passCodeOrId.trim().toUpperCase();
        const state = get();

        const attendee = state.attendees.find(
          (a) =>
            a.passCode.toUpperCase() === query ||
            a.id.toUpperCase() === query ||
            a.barcodeValue === query ||
            a.qrCodeValue.toUpperCase().includes(query)
        );

        if (!attendee) {
          return {
            success: false,
            status: "NotFound",
            message: `No attendee found with pass code or ticket ID "${passCodeOrId}". Please verify and try again.`,
          };
        }

        const relatedOrder = state.orders.find((o) => o.id === attendee.orderId);
        if (relatedOrder && relatedOrder.paymentStatus === "Cancelled") {
          return {
            success: false,
            status: "Cancelled",
            message: "This pass belongs to an order that was cancelled.",
            attendee,
          };
        }

        if (relatedOrder && relatedOrder.paymentStatus === "Refunded") {
          return {
            success: false,
            status: "Refunded",
            message: "This pass belongs to an order that has been refunded.",
            attendee,
          };
        }

        if (attendee.checkInStatus === "CheckedIn") {
          return {
            success: false,
            status: "AlreadyUsed",
            message: `Ticket already checked in at ${new Date(
              attendee.checkedInAt || Date.now()
            ).toLocaleTimeString("en-IN")} by ${attendee.checkedInBy || "Gate Staff"}.`,
            attendee,
          };
        }

        const now = new Date().toISOString();
        const newLog: CheckInLog = {
          id: "log_" + Date.now(),
          attendeeId: attendee.id,
          attendeeName: attendee.name,
          passCode: attendee.passCode,
          eventId: attendee.eventId,
          eventName: attendee.eventName,
          ticketType: attendee.ticketTypeName,
          seatNumber: attendee.seatNumber,
          sessionName: attendee.sessionName,
          operatorName,
          timestamp: now,
          status: "Success",
        };

        set((s) => ({
          attendees: s.attendees.map((a) =>
            a.id === attendee.id
              ? {
                  ...a,
                  checkInStatus: "CheckedIn",
                  checkedInAt: now,
                  checkedInBy: operatorName,
                }
              : a
          ),
          checkInLogs: [newLog, ...s.checkInLogs],
        }));

        const updatedAttendee = {
          ...attendee,
          checkInStatus: "CheckedIn" as const,
          checkedInAt: now,
          checkedInBy: operatorName,
        };

        return {
          success: true,
          status: "Valid",
          message: `Entry approved for ${attendee.name}! (${attendee.ticketTypeName})`,
          attendee: updatedAttendee,
        };
      },

      revertCheckIn: (attendeeId, operatorName = "Gate Supervisor") => {
        const attendee = get().attendees.find((a) => a.id === attendeeId);
        if (!attendee) return false;

        const newLog: CheckInLog = {
          id: "log_" + Date.now(),
          attendeeId: attendee.id,
          attendeeName: attendee.name,
          passCode: attendee.passCode,
          eventId: attendee.eventId,
          eventName: attendee.eventName,
          ticketType: attendee.ticketTypeName,
          seatNumber: attendee.seatNumber,
          sessionName: attendee.sessionName,
          operatorName: `${operatorName} (Reverted)`,
          timestamp: new Date().toISOString(),
          status: "Reverted",
        };

        set((s) => ({
          attendees: s.attendees.map((a) =>
            a.id === attendeeId
              ? {
                  ...a,
                  checkInStatus: "NotCheckedIn",
                  checkedInAt: undefined,
                  checkedInBy: undefined,
                }
              : a
          ),
          checkInLogs: [newLog, ...s.checkInLogs],
        }));
        return true;
      },

      addCoupon: (coupon) =>
        set((state) => ({
          globalCoupons: [coupon, ...state.globalCoupons],
        })),

      updateCoupon: (id, updates) =>
        set((state) => ({
          globalCoupons: state.globalCoupons.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      deleteCoupon: (id) =>
        set((state) => ({
          globalCoupons: state.globalCoupons.filter((c) => c.id !== id),
        })),

      toggleCouponStatus: (id) =>
        set((state) => ({
          globalCoupons: state.globalCoupons.map((c) =>
            c.id === id
              ? { ...c, status: c.status === "Active" ? "Disabled" : "Active" }
              : c
          ),
        })),

      updateGlobalSettings: (settings) =>
        set((state) => ({
          globalSettings: { ...state.globalSettings, ...settings },
        })),

      resetToDefaultSeed: () => {
        set(buildSeedData());
      },
    }),
    {
      name: "woowoo-events-storage-v1",
    }
  )
);
