import express from 'express';
import {createQuotation,getQuotations,deleteQuotation, updateQuotation, updateQuotationStatus} from '../controllers/quotation.controller.js';
import {authenticateUser} from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', authenticateUser, createQuotation);
router.get('/', authenticateUser, getQuotations);
router.delete('/:id', authenticateUser, deleteQuotation);
router.patch('/:id', authenticateUser, updateQuotation);
router.patch('/:id/status', authenticateUser, updateQuotationStatus);

export default router;
