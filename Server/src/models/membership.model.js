import mongoose from "mongoose";

const usageLimitSchema = new mongoose.Schema(
  {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
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
      links: { type: usageLimitSchema, default: () => ({}) },
      galleryMedia: { type: usageLimitSchema, default: () => ({}) },
      services: { type: usageLimitSchema, default: () => ({}) },
      store: { type: usageLimitSchema, default: () => ({}) },
      academy: { type: usageLimitSchema, default: () => ({}) },
      work: { type: usageLimitSchema, default: () => ({}) },
      events: { type: usageLimitSchema, default: () => ({}) },
    },

    insightsLevel: { type: String, default: "Basic", trim: true },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    internalNotes: { type: String, default: "", trim: true },

    createdBy: {
      m_staff_id: { type: String, default: null },
      m_staff_name: { type: String, default: null },
      m_staff_email: { type: String, default: null },
    },
  },
  { timestamps: true },
);

export default mongoose.model("Membership", membershipSchema);

