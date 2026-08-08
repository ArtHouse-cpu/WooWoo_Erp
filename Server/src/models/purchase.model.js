import mongoose from "mongoose";

const purchaseItemSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },

    qty: {
      type: Number,
      required: true,
      min: 1,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    invoiceDate: {
      type: Date,
      required: true,
    },

    supplierName: {
      type: String,
      required: true,
      trim: true,
    },

    supplierAddress: {
      type: String,
      default: "",
      trim: true,
    },

    supplierContact: {
      type: String,
      default: "",
      trim: true,
    },

    vendorDate: {
      type: Date,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    /** Bill-level manual discount value (₹ if flat, % if percentage) */
    manualDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /** How to interpret manualDiscount */
    manualDiscountType: {
      type: String,
      enum: ["flat", "percentage"],
      default: "flat",
    },

    paymentMode: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Bank", "Credit", "Other"],
      default: "Cash",
    },

    status: {
      type: String,
      enum: ["draft", "pending", "paid", "partial", "cancelled"],
      default: "pending",
    },

    items: {
      type: [purchaseItemSchema],
      default: [],
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    purchaser: {
      type: String,
      default: "Anurag Tiwari",
      trim: true,
    },

    /** Staff who created the purchase (logged-in user) */
    createdByName: {
      type: String,
      default: "",
      trim: true,
    },

    /** Staff verified via billing PIN at checkout (Bill By) */
    billBy: {
      type: String,
      default: "",
      trim: true,
    },

    invoiceBy: {
      staffId: { type: String, default: "", trim: true },
      staffName: { type: String, default: "", trim: true },
      employeeId: { type: String, default: "", trim: true },
      email: { type: String, default: "", trim: true },
    },

    purchaserDate: {
      type: Date,
    },

    purchaserSignature: {
      type: String,
      default: "",
      trim: true,
    },

    supplierSignature: {
      type: String,
      default: "",
      trim: true,
    },

    supplierDate: {
      type: Date,
    },
    attachments: [{
      type: String
    }],
  },
  {
    timestamps: true,
  }
);

const Purchase = mongoose.model("Purchase", purchaseSchema);

export default Purchase;