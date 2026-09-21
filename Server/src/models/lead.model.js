import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    // Name is compulsory
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    // Phone is optional individually
    phone: {
      type: String,
      trim: true,
      default: "",
    },

    // Email is optional individually
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    // Status
    status: {
      type: String,
      enum: [
        "New",
        "Contacted",
        "Interested",
        "Converted",
        "Lost",
      ],
      default: "New",
    },

    // Source
    source: {
      type: String,
      trim: true,
      default: "",
    },

    // Reason / Note
    reasonNote: {
      type: String,
      trim: true,
      default: "",
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
  const email = this.email?.trim();

  // Both phone and email are empty
  if (!phone && !email) {
    this.invalidate(
      "phone",
      "Either phone number or email is required."
    );

    this.invalidate(
      "email",
      "Either phone number or email is required."
    );
  }

  next();
});


const Lead = mongoose.model("Lead", leadSchema);

export default Lead;