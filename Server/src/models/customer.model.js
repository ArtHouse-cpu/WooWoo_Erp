import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    // =========================
    // BASIC INFO
    // =========================
    name: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, "Invalid mobile number"],
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    // =========================
    // BUSINESS INFO
    // =========================
    gstin: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    companyName: {
      type: String,
      default: "",
      trim: true,
    },

    // =========================
    // ADDRESS
    // =========================
    address: {
      type: String,
      default: "",
      trim: true,
    },

    pincode: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      default: "",
      trim: true,
    },

    state: {
      type: String,
      default: "",
      trim: true,
    },

    country: {
      type: String,
      default: "India",
      trim: true,
    },

    // =========================
    // MEMBERSHIP
    // =========================
    membershipType: {
      type: String,
      enum: ["none","pro", "premium", "special", "junior", "general"],
      default: "none",
    },
    membershipPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Membership",
      default: null,
    },

    // =========================
    // PERSONAL INFO
    // =========================
    adharNumber: {
      type: String,
      default: "",
      trim: true,
    },

    dob: {
      type: Date,
      default: null,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other", ""],
      default: "",
    },

    whatsappNumber: {
      type: String,
      default: "",
      trim: true,
    },

    AlternateMobile: {
      type: String,
      default: "",
      trim: true,
    },

    // =========================
    // BANK DETAILS
    // =========================
    IFSCcode: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    bankName: {
      type: String,
      default: "",
      trim: true,
    },

    branchName: {
      type: String,
      default: "",
      trim: true,
    },

    accountNumber: {
      type: String,
      default: "",
      trim: true,
    },

    panNumber: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    accountHolderName: {
      type: String,
      default: "",
      trim: true,
    },

    UPIID: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    // =========================
    // PROFILE IMAGE
    // =========================
    profileImage: {
      type: String,
      default: "",
    },

    // =========================
    // WALLET
    // =========================
    walletAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    closingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =========================
    // CREATED BY
    // =========================
    createdBy: {
      m_staff_id: { type: String, default: null },
      m_staff_name: { type: String, default: null },
      m_staff_email: { type: String, default: null },
    },
  },
  {
    timestamps: true,
  }
);

// =========================
// INDEXES (IMPORTANT)
// =========================
customerSchema.index({ name: 1 });
customerSchema.index({ mobile: 1 }, { unique: true }); // prevent duplicate

// =========================
// MODEL
// =========================
const Customer = mongoose.model("Customer", customerSchema);

export default Customer;