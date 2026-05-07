import express from 'express';
import { authenticateUser } from '../middlewares/auth.middleware.js';
import {
  createPurchase,
  getPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase,
} from '../controllers/purchase.controller.js';

const router = express.Router();

router.post('/', authenticateUser, createPurchase);
router.get('/', authenticateUser, getPurchases);
router.get('/:id', authenticateUser, getPurchaseById);
router.patch('/:id', authenticateUser, updatePurchase);
router.delete('/:id', authenticateUser, deletePurchase);

export default router;