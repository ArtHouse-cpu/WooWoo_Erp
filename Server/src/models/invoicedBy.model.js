import mongoose from 'mongoose';

const invoicedBySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

invoicedBySchema.index({ name: 1 });

const InvoicedBy = mongoose.model('InvoicedBy', invoicedBySchema);
export default InvoicedBy;
