import mongoose from 'mongoose';

const expenceSchema = new mongoose.Schema(
  {
    expenseCode: {type: String, trim: true, default: ''},
    title: {type: String, required: true, trim: true},
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExpenceCategory',
      default: null,
    },
    category: {
      type: String,
      trim: true,
      default: 'Other',
    },
    amount: {type: Number, required: true, min: 0},
    paidTo: {type: String, trim: true, default: ''},
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null,
    },
    mode: {
      type: String,
      trim: true,
      default: 'Cash',
      enum: ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Wallet'],
    },
    status: {
      type: String,
      trim: true,
      default: 'Paid',
      enum: ['Paid', 'Pending', 'Cancelled'],
    },
    date: {type: Date, default: Date.now},
    notes: {type: String, trim: true, default: ''},
    receiptUrl: {type: String, trim: true, default: ''},
    createdBy: {
      m_staff_id: {type: String, default: null},
      m_staff_name: {type: String, default: null},
      m_staff_email: {type: String, default: null},
    },
    addedBy: {
      m_staff_id: {type: String, default: null},
      m_staff_name: {type: String, default: null},
      m_staff_email: {type: String, default: null},
    },
  },
  {timestamps: true},
);

const Expence = mongoose.models.Expence || mongoose.model('Expence', expenceSchema);

export default Expence;