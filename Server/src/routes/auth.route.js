import express from 'express';
import {
  healthCheck,
  login,
  logout,
  register,
  requestOtp,
  verifyOtp,
  updateUser,
} from '../controllers/auth.controller.js';

const router = express.Router();

router.get('/check', healthCheck);
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.patch('/:mobile', updateUser);

export default router;
