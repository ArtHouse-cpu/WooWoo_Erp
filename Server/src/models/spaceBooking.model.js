import mongoose from 'mongoose';

const spaceBookingSchema = new mongoose.Schema(
  {
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
    customerEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    /** Booked catalogue space (Space document). */
    spaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Space',
      required: true,
      index: true,
    },
    /** Snapshot of space details at booking time */
    spaceName: {
      type: String,
      default: '',
      trim: true,
    },
    spaceCode: {
      type: String,
      default: '',
      trim: true,
    },
    spaceType: {
      type: String,
      enum: ['Exclusive', 'Coworking', ''],
      default: '',
    },
    spaceCategory: {
      type: String,
      default: '',
      trim: true,
    },
    spaceDay: {
      type: String,
      default: '',
      trim: true,
    },
    unitPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    durationHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    lineTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    bookingDate: {
      type: Date,
      required: true,
      index: true,
    },
    /** 24h "HH:mm" */
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    /** 24h "HH:mm" */
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Upcoming', 'Ongoing', 'Expired', 'Cancelled'],
      default: 'Upcoming',
      index: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    /** Linked sales invoice after checkout */
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null,
    },
    invoiceCode: {
      type: String,
      default: '',
      trim: true,
    },
    grandTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['full', 'partial', ''],
      default: '',
    },
    paymentMode: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      m_staff_id: {type: String, default: null},
      m_staff_name: {type: String, default: null},
      m_staff_email: {type: String, default: null},
    },
  },
  {timestamps: true},
);

spaceBookingSchema.index({spaceId: 1, bookingDate: 1});
spaceBookingSchema.index({customerPhone: 1});
spaceBookingSchema.index({spaceType: 1});

export default mongoose.model('SpaceBooking', spaceBookingSchema);
