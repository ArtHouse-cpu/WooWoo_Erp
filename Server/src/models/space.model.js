import mongoose from 'mongoose';

const ALLOWED_DAYS = ['Weekday', 'Weekend'];

const spaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: 'Studio',
      trim: true,
    },
    /** Strict entity type — always Space (never Product/Services/Food). */
    itemType: {
      type: String,
      enum: ['space'],
      default: 'space',
      index: true,
    },
    /**
     * Pricing day for this record.
     * Same space name may have one Weekday row and one Weekend row.
     */
    day: {
      type: String,
      enum: ALLOWED_DAYS,
      required: true,
      default: 'Weekday',
      index: true,
    },
    /** Price for this specific day record only */
    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    capacity: {
      type: Number,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: ['Available', 'Booked', 'Maintenance'],
      default: 'Available',
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    imageUrl: {
      type: String,
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

spaceSchema.index({name: 1});
spaceSchema.index({category: 1});
/** Query helper — uniqueness enforced in controller (case-insensitive name). */
spaceSchema.index({name: 1, day: 1});

export const SPACE_DAYS = ALLOWED_DAYS;
export default mongoose.model('Space', spaceSchema);
