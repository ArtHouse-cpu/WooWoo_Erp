import mongoose from "mongoose";

const usageLimitSchema = new mongoose.Schema(
  {
    discount: { type: Number, default: 0 },
    cashback: { type: Number, default: 0 },
  },
  { _id: false },
);

const membershipSchema = new mongoose.Schema(
  {
    planId: { type: String, required: true, trim: true, unique: true },
    displayName: { type: String, required: true, trim: true },
    priority: { type: Number, default: 0 },

    planType: {
      type: String,
      default: "Professional",
      trim: true,
    },
    description: { type: String, default: "", trim: true },

    pricing: {
      period: {
        type: String,
        default: "Monthly",
        trim: true,
      },
      amount: { type: Number, default: 0 },
      taxPercent: { type: Number, default: 0 },
      discountType: { type: String, default: "Percentage", trim: true },
      discountPercent: { type: Number, default: 0 },
    },

    usageLimits: {
      type: Map,
      of: usageLimitSchema,
      default: {},
    },

    insightsLevel: { type: String, default: "Basic", trim: true },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    internalNotes: { type: String, default: "", trim: true },

    customerDisplay: {
      showInApp: { type: Boolean, default: true },
      badgeLabel: { type: String, default: "", trim: true },
      themeKey: {
        type: String,
        enum: ["blue", "purple", "green", "orange"],
        default: "blue",
      },
      iconKey: {
        type: String,
        enum: ["user", "star", "graduation", "crown"],
        default: "user",
      },
      cashbackPercent: { type: Number, default: 0, min: 0 },
      storeDiscountPercent: { type: Number, default: 0, min: 0 },
      spaceDiscountPercent: { type: Number, default: 0, min: 0 },
      features: {
        type: [
          {
            label: { type: String, default: "", trim: true },
            was: { type: Number, default: 0, min: 0 },
          },
        ],
        default: [],
      },
    },

    createdBy: {
      m_staff_id: { type: String, default: null },
      m_staff_name: { type: String, default: null },
      m_staff_email: { type: String, default: null },
    },
  },
  { timestamps: true },
);

export default mongoose.model("Membership", membershipSchema);

