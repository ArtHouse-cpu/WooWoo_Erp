import express from 'express';
import {createInvoice,getInvoices,deleteInvoice, updateInvoice, cancelInvoice} from '../controllers/invoice.controller.js';
import {authenticateUser} from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', authenticateUser, createInvoice);
router.get('/', authenticateUser, getInvoices);
router.delete('/:id', authenticateUser, deleteInvoice);
router.patch('/:id', authenticateUser, updateInvoice);
router.patch('/:id/cancel', authenticateUser, cancelInvoice);

export default router;
