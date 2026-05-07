import express from 'express';
import {authenticateUser} from '../middlewares/auth.middleware.js';
import {
  createReturnSale,
  deleteReturnSale,
  getReturnSaleById,
  getReturnSales,
  updateReturnSale,
} from '../controllers/returnSales.controller.js';

const router = express.Router();

router.get('/', authenticateUser, getReturnSales);
router.get('/:id', authenticateUser, getReturnSaleById);
router.post('/', authenticateUser, createReturnSale);
router.patch('/:id', authenticateUser, updateReturnSale);
router.delete('/:id', authenticateUser, deleteReturnSale);

export default router;
