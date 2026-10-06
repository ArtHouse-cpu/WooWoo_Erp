import mongoose from 'mongoose';
export const EXHIBITION_GENDERS = [
  'Male',
  'Female',
  'Other',
  'Prefer not to say',
];
export const EXHIBITION_INTERESTS = [
  'Art',
  'Fashion',
  'Craft',
  'Live Workshops',
  'Food',
  'Music & Activities',
];

export const EXHIBITION_PASS_STATUSES = ['Active', 'Expired', 'Cancelled'];
const staffSchema = new mongoose.Schema(
  {
    m_staff_id: {type: String, default: null},
    m_staff_name: {type: String, default: null},
    m_staff_email: {type: String, default: null},
  },
  {_id: false},
);

const exhibitionPassSchema = new mongoose.Schema(
  {
    passcode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    event: {
      type: String,
      required: true,
      trim: true,
      default: 'creative-exhibition-2026',
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Invalid Indian mobile number'],
      index: true,
    },
    age: {type: Number, required: true, min: 1, max: 110},
    gender: {type: String, enum: EXHIBITION_GENDERS, required: true},
    interest: {type: String, enum: EXHIBITION_INTERESTS, required: true},
    groupId: {type: String, required: true, index: true},
    position: {type: Number, required: true, min: 1},
    status: {
      type: String,
      enum: EXHIBITION_PASS_STATUSES,
      default: 'Active',
      index: true,
    },
    checkedInAt: {type: Date, default: null},
    checkedInBy: {type: staffSchema, default: undefined},
    cancelledAt: {type: Date, default: null},
    note: {type: String, default: '', trim: true},
    createdBy: {type: staffSchema, default: undefined},
    updatedBy: {type: staffSchema, default: undefined},
  },
  {timestamps: true},
);
exhibitionPassSchema.index({createdAt: -1});
exhibitionPassSchema.index({event: 1, status: 1});
exhibitionPassSchema.index({fullName: 1});
export default mongoose.model('ExhibitionPass', exhibitionPassSchema);
