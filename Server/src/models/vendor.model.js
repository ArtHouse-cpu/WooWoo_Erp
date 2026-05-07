import mongoose from "mongoose";


const vendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Vendor name is required"],
      trim: true,
    },

    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      trim: true,
      unique: true,
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    companyName: {
      type: String,
      default: "",
      trim: true,
    },

    gstin: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    panNumber: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

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
      enum: ["Male", "Female", "Other", ""],
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

    accountHolderName: {
      type: String,
      default: "",
      trim: true,
    },

    accountNumber: {
      type: String,
      default: "",
      trim: true,
    },

    IFSCcode: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    UPIID: {
      type: String,
      default: "",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

vendorSchema.index({ name: 1 });
vendorSchema.index({ mobile: 1 }, { unique: true });

const Vendor = mongoose.model("Vendor", vendorSchema);

export default Vendor;
