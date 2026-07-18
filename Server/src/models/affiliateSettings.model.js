import mongoose from 'mongoose';

const commissionRuleSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: [
        'invite',
        'product',
        'space',
        'food',
        'service',
        'membership',
        'other',
      ],
      required: true,
    },
    label: {type: String, default: '', trim: true},
    enabled: {type: Boolean, default: true},
    commissionType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    commissionValue: {type: Number, default: 0, min: 0},
    minOrderAmount: {type: Number, default: 0, min: 0},
    maxCommissionAmount: {type: Number, default: null},
    // For invite reward: when to credit
    inviteTrigger: {
      type: String,
      enum: ['registration', 'first_paid_transaction', 'membership_activate'],
      default: 'first_paid_transaction',
    },
  },
  {_id: false},
);

const affiliateSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'default',
      unique: true,
      trim: true,
    },
    isEnabled: {type: Boolean, default: true},
    rules: {
      type: [commissionRuleSchema],
      default: () => [
        {
          category: 'invite',
          label: 'Successful Invite Reward',
          enabled: true,
          commissionType: 'fixed',
          commissionValue: 100,
          minOrderAmount: 0,
          maxCommissionAmount: null,
          inviteTrigger: 'first_paid_transaction',
        },
        {
          category: 'product',
          label: 'Product Purchase Commission',
          enabled: true,
          commissionType: 'percentage',
          commissionValue: 5,
          minOrderAmount: 0,
          maxCommissionAmount: null,
        },
        {
          category: 'space',
          label: 'Space Booking Commission',
          enabled: true,
          commissionType: 'percentage',
          commissionValue: 8,
          minOrderAmount: 0,
          maxCommissionAmount: null,
        },
        {
          category: 'food',
          label: 'Food Order Commission',
          enabled: true,
          commissionType: 'percentage',
          commissionValue: 3,
          minOrderAmount: 0,
          maxCommissionAmount: null,
        },
        {
          category: 'service',
          label: 'Service Booking Commission',
          enabled: true,
          commissionType: 'percentage',
          commissionValue: 5,
          minOrderAmount: 0,
          maxCommissionAmount: null,
        },
        {
          category: 'membership',
          label: 'Membership Purchase Commission',
          enabled: false,
          commissionType: 'percentage',
          commissionValue: 5,
          minOrderAmount: 0,
          maxCommissionAmount: null,
        },
        {
          category: 'other',
          label: 'Other Transactions',
          enabled: false,
          commissionType: 'percentage',
          commissionValue: 0,
          minOrderAmount: 0,
          maxCommissionAmount: null,
        },
      ],
    },
    withdrawal: {
      enabled: {type: Boolean, default: true},
      minAmount: {type: Number, default: 2000, min: 0}, // from mockup
      maxAmount: {type: Number, default: 50000, min: 0},
      methods: {
        type: [String],
        default: ['bank', 'upi', 'instant_upi'],
      },
      processingNote: {
        type: String,
        default: 'Withdrawals are reviewed by admin before payout.',
      },
      processingFeePercentage: {type: Number, default: 0, min: 0, max: 100},
    },
    payoutSettings: {
      frequency: {type: String, enum: ['daily', 'weekly', 'monthly'], default: 'weekly'},
      payoutDay: {type: String, default: 'Monday'},
      payoutTime: {type: String, default: '10:00 AM'},
      timezone: {type: String, default: 'Asia/Kolkata'},
      autoApproval: {type: Boolean, default: false},
      holdCommissionDays: {type: Number, default: 15, min: 0},
      cancelCommissionOnRefund: {type: Boolean, default: true},
    },
    programControls: {
      allowSelfReferral: {type: Boolean, default: false},
      couponBasedTracking: {type: Boolean, default: false},
      multiLevelReferral: {type: Boolean, default: false},
      commissionOnRefund: {type: String, enum: ['deduct', 'keep'], default: 'deduct'},
    },
    milestones: [
      {
        revenueAmount: {type: Number, required: true, min: 0},
        rewardAmount: {type: Number, required: true, min: 0},
        rewardType: {type: String, default: 'cash'},
        additionalBenefits: {type: [String], default: []},
        status: {type: String, enum: ['active', 'inactive'], default: 'active'},
      }
    ],
    milestoneSettings: {
      autoCreditReward: {type: Boolean, default: true},
      includeCancelledOrders: {type: Boolean, default: false},
      achievementWindow: {
        type: String,
        enum: ['lifetime', 'yearly', 'quarterly', 'monthly'],
        default: 'lifetime',
      },
    },
    notifications: {
      newAffiliateRegistration: {type: Boolean, default: true},
      milestoneAchieved: {type: Boolean, default: true},
      payoutRequest: {type: Boolean, default: true},
      payoutProcessed: {type: Boolean, default: true},
      refundOrderCancelled: {type: Boolean, default: true},
    },
    registrationSettings: {
      autoVerifyAffiliates: {type: Boolean, default: true},
      requireBankDetails: {type: Boolean, default: true},
      allowedTypes: {
        type: [String],
        default: ['customer', 'partner', 'vendor'],
      },
    },
    cookieDurationDays: {type: Number, default: 30, min: 1},
    maxCommissionPerOrder: {type: Number, default: 10000, min: 0},
    autoApproveCommissions: {type: Boolean, default: true},
    affiliateDashboardAccess: {type: Boolean, default: true},
    analyticsTracking: {type: Boolean, default: true},
    updatedBy: {
      m_staff_id: {type: String, default: null},
      m_staff_name: {type: String, default: null},
      m_staff_email: {type: String, default: null},
    },
  },
  {timestamps: true},
);

const AffiliateSettings = mongoose.model('AffiliateSettings', affiliateSettingsSchema);
export default AffiliateSettings;
