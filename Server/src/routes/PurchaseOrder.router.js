import express from 'express';
import { authenticateUser } from '../middlewares/auth.middleware.js';
import {
  createPurchaseOrder,
  getPurchasesOrder,
  getPurchaseOrderById,
  updatePurchaseOrder,
  deletePurchaseOrder,
} from '../controllers/purchaseOrder.controller.js';

const router = express.Router();

router.post('/', authenticateUser, createPurchaseOrder);
router.get('/', authenticateUser, getPurchasesOrder);
router.get('/:id', authenticateUser, getPurchaseOrderById);
router.patch('/:id', authenticateUser, updatePurchaseOrder);
router.delete('/:id', authenticateUser, deletePurchaseOrder);

export default router;