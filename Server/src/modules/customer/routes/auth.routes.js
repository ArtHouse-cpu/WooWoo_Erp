import express from 'express';
import {
  signup,
  login,
  loginOtp,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  me,
  updateProfile,
  deleteProfile,
  activateMembership,
} from '../controllers/auth.controller.js';
import {validateCoupon} from '../controllers/coupon.controller.js';
import {
  initiatePayment,
  payuSuccess,
  payuFailure,
  paymentStatus,
} from '../controllers/payment.controller.js';
import {getReferralDashboard} from '../controllers/referral.controller.js';
import {validateRequest} from '../middlewares/validateRequest.js';
import {
  authenticateCustomer,
  authorizeCustomer,
} from '../middlewares/authenticateCustomer.js';
import {
  customerAuthLimiter,
  customerOtpLimiter,
} from '../middlewares/rateLimit.js';
import {
  signupSchema,
  loginSchema,
  otpLoginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  activateMembershipSchema,
  validateMembershipCouponSchema,
  initiatePaymentSchema,
} from '../validators/auth.validators.js';

const router = express.Router();

router.use(customerAuthLimiter);

/**
 * Customer Auth APIs — mounted at /api/customer
 * Intentionally separate from admin /customer CRUD routes.
 */
router.post('/signup', validateRequest(signupSchema), signup);
router.post('/login', validateRequest(loginSchema), login);
router.post(
  '/login/otp',
  customerOtpLimiter,
  validateRequest(otpLoginSchema),
  loginOtp,
);
router.post(
  '/verify-otp',
  customerOtpLimiter,
  validateRequest(verifyOtpSchema),
  verifyOtp,
);
router.post(
  '/resend-otp',
  customerOtpLimiter,
  validateRequest(resendOtpSchema),
  resendOtp,
);
router.post(
  '/forgot-password',
  customerOtpLimiter,
  validateRequest(forgotPasswordSchema),
  forgotPassword,
);
router.post(
  '/reset-password',
  validateRequest(resetPasswordSchema),
  resetPassword,
);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// PayU browser callbacks (no auth — PayU server redirect POST)
router.post('/payments/payu/success', payuSuccess);
router.post('/payments/payu/failure', payuFailure);

router.get('/me', authenticateCustomer, authorizeCustomer('active'), me);
router.get(
  '/referral',
  authenticateCustomer,
  authorizeCustomer('active'),
  getReferralDashboard,
);
router.put(
  '/profile',
  authenticateCustomer,
  authorizeCustomer('active'),
  validateRequest(updateProfileSchema),
  updateProfile,
);
router.delete(
  '/profile',
  authenticateCustomer,
  authorizeCustomer('active'),
  deleteProfile,
);
router.post(
  '/coupon/validate',
  authenticateCustomer,
  authorizeCustomer('active'),
  validateRequest(validateMembershipCouponSchema),
  validateCoupon,
);
router.post(
  '/payments/payu/initiate',
  authenticateCustomer,
  authorizeCustomer('active'),
  validateRequest(initiatePaymentSchema),
  initiatePayment,
);
router.get(
  '/payments/:txnid',
  authenticateCustomer,
  authorizeCustomer('active'),
  paymentStatus,
);
router.post(
  '/membership/activate',
  authenticateCustomer,
  authorizeCustomer('active'),
  validateRequest(activateMembershipSchema),
  activateMembership,
);

export default router;
