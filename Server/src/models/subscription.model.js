import mongoose from 'mongoose';

const subscriptionItemSchema = new mongoose.Schema(
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
  },
  {_id: false},
);

const subscriptionSchema = new mongoose.Schema(
  {
    subscriptionPrefix: {
      type: String,
      required: true,
      default: 'SUB',
      trim: true,
    },
    subscriptionNumber: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    subscriptionCode: {
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
    invoiceDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: false,
      default: null,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: false,
      default: null,
    },
    repeatType: {
      type: String,
      enum: ['monthly', 'yearly', 'lifetime'],
      default: 'monthly',
    },
    repeatEvery: {
      type: Number,
      default: 1,
      min: 1,
    },
    repeatUnit: {
      type: String,
      enum: ['month', 'year', null],
      default: 'month',
    },
    noOfInvoices: {
      type: Number,
      min: 0,
      default: 0,
    },
    nextInvoiceDate: {
      type: Date,
      default: null,
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
      enum: ['draft', 'active', 'completed', 'expired', 'error', 'cancelled'],
      default: 'active',
    },
    items: {
      type: [subscriptionItemSchema],
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
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    createdBy: {
      m_staff_id: {type: String, default: null},
      m_staff_name: {type: String, default: null},
      m_staff_email: {type: String, default: null},
    },
  },
  {timestamps: true},
);

subscriptionSchema.index({customerName: 1});
subscriptionSchema.index({createdAt: -1});
subscriptionSchema.index({status: 1});

const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;
