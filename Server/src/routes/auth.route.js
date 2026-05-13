import express from 'express';
import {
  healthCheck,
  login,
  logout,
  register,
  requestOtp,
  verifyOtp,
  updateUser,
  forgotPassword,
  requestEmailOtp,
} from '../controllers/auth.controller.js';

const router = express.Router();

router.get('/check', healthCheck);
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/request-otp', requestOtp);
router.post('/request-email-otp', requestEmailOtp);
router.post('/verify-otp', verifyOtp);
router.patch('/forgot-password', forgotPassword);
router.patch('/:mobile', updateUser);

export default router;
