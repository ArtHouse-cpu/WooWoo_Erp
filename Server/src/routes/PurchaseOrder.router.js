import express from 'express';
import { authenticateUser } from '../middlewares/auth.middleware.js';
import {
  createPurchaseOrder,
  getPurchasesOrder,
  getPurchaseOrderById,
  updatePurchaseOrder,
  deletePurchaseOrder,
  uploadPurchaseOrderAttachments,
} from '../controllers/purchaseOrder.controller.js';

const router = express.Router();

router.post('/', authenticateUser, uploadPurchaseOrderAttachments.array('attachments'), createPurchaseOrder);
router.get('/', authenticateUser, getPurchasesOrder);
router.get('/:id', authenticateUser, getPurchaseOrderById);
router.patch('/:id', authenticateUser, uploadPurchaseOrderAttachments.array('attachments'), updatePurchaseOrder);
router.delete('/:id', authenticateUser, deletePurchaseOrder);

export default router;