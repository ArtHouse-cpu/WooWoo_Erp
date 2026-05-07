import express from 'express';
import { authenticateUser } from '../middlewares/auth.middleware.js';
import {
  bulkUpdateWallets,
  createWallet,
  deleteWallet,
  getWalletById,
  getWallets,
  updateWallet,
} from '../controllers/wallet.controller.js';

const router = express.Router();

router.get('/', authenticateUser, getWallets);
router.post('/', authenticateUser, createWallet);
router.post('/:id', authenticateUser, createWallet);
router.patch('/bulk', authenticateUser, bulkUpdateWallets);
router.get('/:id', authenticateUser, getWalletById);
router.delete('/:id', authenticateUser, deleteWallet);
router.patch('/:id', authenticateUser, updateWallet);

export default router;