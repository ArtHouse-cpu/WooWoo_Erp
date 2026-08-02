import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema(
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
      required: true,
      min: 0,
      default: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    isCsp: {
      type: Boolean,
      default: false,
    },
    cspEnrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomersailorProgram',
      default: null,
    },
    cspCustomerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    cspsailorAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {_id: false},
);

const invoiceSchema = new mongoose.Schema(
  {
    invoicePrefix: {
      type: String,
      required: true,
      default: 'INVVWAH',
      trim: true,
    },
    invoiceNumber: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    invoiceCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
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
    },
    /** Exact CRM customer linked at invoice create (prefer over name search). */
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
      index: true,
    },
    invoiceDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    salesPersonName: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'final', 'cancelled'],
      default: 'final',
    },
    items: {
      type: [invoiceItemSchema],
      default: [],
    },
    subTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    coupon: {
      code: { type: String, trim: true, uppercase: true, default: null },
      title: { type: String, trim: true, default: null },
      discountType: {
        type: String,
        enum: ['percentage', 'flat', null],
        default: null,
      },
      discountValue: { type: Number, min: 0, default: 0 },
      discountAmount: { type: Number, min: 0, default: 0 },
    },
    referral: {
      code: { type: String, trim: true, uppercase: true, default: null },
      inviterName: { type: String, trim: true, default: null },
      discountType: {
        type: String,
        enum: ['percentage', 'fixed', null],
        default: null,
      },
      discountValue: { type: Number, min: 0, default: 0 },
      discountAmount: { type: Number, min: 0, default: 0 },
      label: { type: String, trim: true, default: 'Referral Discount' },
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    extraCharges: [
      {
        label: { type: String, trim: true },
        amount: { type: Number, default: 0 }
      }
    ],
    mode: {
      type: String,
      trim: true,
      default: 'Cash',
    },
    paymentStatus: {
      type: String,
      enum: ['full', 'partial'],
      default: 'full',
    },
    paymentBreakdown: {
      cash: {type: Number, min: 0, default: 0},
      upi: {type: Number, min: 0, default: 0},
      card: {type: Number, min: 0, default: 0},
      wallet: {type: Number, min: 0, default: 0},
      paidAmount: {type: Number, min: 0, default: 0},
      dueAmount: {type: Number, min: 0, default: 0},
      changeAmount: {type: Number, min: 0, default: 0},
    },
    paymentHistory: [
      {
        date: { type: Date, default: Date.now },
        amount: { type: Number, required: true },
        mode: { type: String, required: true },
        receivedBy: { type: String, default: null }
      }
    ],
    createdBy: {
      m_staff_id: {type: String, default: null},
      m_staff_name: {type: String, default: null},
      m_staff_email: {type: String, default: null},
    },
  },
  {timestamps: true},
);

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
