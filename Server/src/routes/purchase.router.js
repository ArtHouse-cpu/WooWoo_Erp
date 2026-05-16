import express from 'express';
import { authenticateUser } from '../middlewares/auth.middleware.js';
import {
  createPurchase,
  getPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase,
  uploadPurchaseAttachments,
} from '../controllers/purchase.controller.js';

const router = express.Router();

router.post('/', authenticateUser, uploadPurchaseAttachments.array('attachments'), createPurchase);
router.get('/', authenticateUser, getPurchases);
router.get('/:id', authenticateUser, getPurchaseById);
router.patch('/:id', authenticateUser, uploadPurchaseAttachments.array('attachments'), updatePurchase);
router.delete('/:id', authenticateUser, deletePurchase);

export default router;