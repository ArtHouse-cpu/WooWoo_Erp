import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    // Name is compulsory
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      required: [true, "Phone number is required"],
      match: [/^\d{10}$/, "Phone number must be a valid 10-digit number"],
    },

    // Status
    status: {
      type: String,
      enum: [
        "New",
        "Contacted",
        "Interested",
        "Not Interested",
        "Need to message",
      ],
      default: "New",
    },

    // Source
    source: {
      type: String,
      trim: true,
      enum: ["Instagram",
        "WhatsApp",
        "Walk-in",
        "Reference",
        "Member",
        "Events",
        "Website",
        "Other",],
      default: "",
    },

    // Purpose
    purpose: {
      type: String,
      trim: true,
      enum: ["Events",
        "Supplies",
        "Space Booking (Exhibition)",
        "Space Booking (Corporate Booking)",
        "Framing",
        "Private Booking",
        "Birthday Party",
        "Membership",
        "Volunteering",
        "CSP",
        "Customer Art Work",
        "Co-Working",
        "Handmade Gift",
        "Saler Program",],
      default: "",
    },

    // Reason / Note
    reasonNote: {
      type: String,
      trim: true,
      default: "",
    },

    // Media / Document Attachments
    attachments: [
      {
        url: { type: String, required: true },
        name: { type: String, default: "" },
        mimeType: { type: String, default: "" },
        size: { type: Number, default: 0 },
      },
    ],

    // Reference URL / Media Link
    url: {
      type: String,
      trim: true,
      default: "",
    },

    // Created By Staff
    createdBy: {
      m_staff_id: { type: String, default: null },
      m_staff_name: { type: String, default: null },
      m_staff_email: { type: String, default: null },
    },

    // Assigned To Staff
    assignedTo: {
      m_staff_id: { type: String, default: null },
      m_staff_name: { type: String, default: null },
      m_staff_email: { type: String, default: null },
    },

    // Lead date
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);


leadSchema.pre("validate", function (next) {
  const phone = this.phone?.trim();

  if (!phone) {
    this.invalidate("phone", "Phone number is required.");
  } else if (!/^\d{10}$/.test(phone)) {
    this.invalidate("phone", "Phone number must be a valid 10-digit number.");
  }

  next();
});


const Lead = mongoose.model("Lead", leadSchema);

export default Lead;