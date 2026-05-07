import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    referenceType: {
      type: String,
      default: "",
      trim: true,
    },
    referenceId: {
      type: String,
      default: "",
      trim: true,
    },
    createdBy: {
      m_staff_id: { type: String, default: null },
      m_staff_name: { type: String, default: null },
      m_staff_email: { type: String, default: null },
    },
    closingBalance: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true },
);

const walletSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      unique: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    walletAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    transactions: {
      type: [walletTransactionSchema],
      default: [],
    },
  },
  { timestamps: true },
);

walletSchema.index({ customerName: 1 });

const Wallet = mongoose.model("Wallet", walletSchema);

export default Wallet;
