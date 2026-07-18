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
    // Which bucket this tx affects
    walletType: {
      type: String,
      enum: ["cashback", "affiliate", "general"],
      default: "general",
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
    idempotencyKey: {
      type: String,
      default: null,
      trim: true,
    },
    previousBalance: {
      type: Number,
      default: 0,
      min: 0,
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
    affiliateBalanceAfter: {
      type: Number,
      default: 0,
      min: 0,
    },
    cashbackBalanceAfter: {
      type: Number,
      default: 0,
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
    // Withdrawable affiliate earnings
    affiliateBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Non-withdrawable cashback / promo credits
    cashbackBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Reserved for pending withdrawal requests
    affiliateReserved: {
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
walletSchema.index({ "transactions.idempotencyKey": 1 }, { sparse: true });

const Wallet = mongoose.model("Wallet", walletSchema);

export default Wallet;
