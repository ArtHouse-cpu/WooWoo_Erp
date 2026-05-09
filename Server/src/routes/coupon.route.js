import express from 'express';
import { authenticateUser } from '../middlewares/auth.middleware.js';
import {
  activateCoupon,
  createCoupon,
  deactivateCoupon,
  deleteCoupon,
  getCoupons,
  updateCoupon,
  validateCoupon,
} from '../controllers/coupon.controller.js';

const router = express.Router();

router.post('/', authenticateUser, createCoupon);
router.get('/', authenticateUser, getCoupons);
router.post('/validate', authenticateUser, validateCoupon);
router.patch('/:id', authenticateUser, updateCoupon);
router.patch('/:id/activate', authenticateUser, activateCoupon);
router.patch('/:id/deactivate', authenticateUser, deactivateCoupon);
router.delete('/:id', authenticateUser, deleteCoupon);

export default router;
