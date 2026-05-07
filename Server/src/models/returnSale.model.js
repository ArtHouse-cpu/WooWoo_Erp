import mongoose from 'mongoose';

const returnSaleItemSchema = new mongoose.Schema(
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

const returnSaleSchema = new mongoose.Schema(
  {
    returnPrefix: {
      type: String,
      required: true,
      default: 'RSRVWAH',
      trim: true,
    },
    returnNumber: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    returnCode: {
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
      type: [returnSaleItemSchema],
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
    /** Optional link to the original sale invoice */
    originalInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null,
    },
    createdBy: {
      m_staff_id: {type: String, default: null},
      m_staff_name: {type: String, default: null},
      m_staff_email: {type: String, default: null},
    },
  },
  {timestamps: true},
);

returnSaleSchema.index({customerName: 1});
returnSaleSchema.index({createdAt: -1});

const ReturnSale = mongoose.model('ReturnSale', returnSaleSchema);
export default ReturnSale;
