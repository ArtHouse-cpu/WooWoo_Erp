import express from 'express';
import { authenticateUser } from '../middlewares/auth.middleware.js';
import {
    createPurchaseReturn,
    deletePurchaseReturn,
    getPurchaseReturnById,
    getPurchaseReturns,
    updatePurchaseReturn,
} from '../controllers/purchaseReturn.controller.js';

const router = express.Router();

router.get('/', authenticateUser, getPurchaseReturns);
router.get('/:id', authenticateUser, getPurchaseReturnById);
router.post('/', authenticateUser, createPurchaseReturn);
router.patch('/:id', authenticateUser, updatePurchaseReturn);
router.delete('/:id', authenticateUser, deletePurchaseReturn);

export default router;