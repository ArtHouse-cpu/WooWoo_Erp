import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    m_staff_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    /** E.164 format, e.g. +91XXXXXXXXXX */
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    gstin: { type: String, trim: true },
    companyName: { type: String, trim: true },
    address: { type: String, trim: true },
    pincode: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    membershipType: { type: String, trim: true },
    adharNumber: { type: String, trim: true },
    dob: { type: String, trim: true },
    gender: { type: String, trim: true },
    whatsappNumber: { type: String, trim: true },
    AlternateMobile: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },

  {timestamps: true},
);

const User = mongoose.model('User', userSchema);
export default User;
