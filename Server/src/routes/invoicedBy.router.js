import express from 'express';
import { authenticateUser } from '../middlewares/auth.middleware.js';
import {
  attachStaffContext,
  requireAnyPermission,
} from '../middlewares/authorize.middleware.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  getInvoicedBy,
  getInvoicedByById,
  createInvoicedBy,
  updateInvoicedBy,
  deleteInvoicedBy,
} from '../controllers/invoicedBy.controller.js';

const router = express.Router();

router.use(authenticateUser, attachStaffContext);

const canManageInvoicedBy = requireAnyPermission(
  PERMISSIONS.INVOICE_CREATE,
  PERMISSIONS.INVOICE_READ,
  PERMISSIONS.INVOICE_UPDATE,
);

router.get('/', canManageInvoicedBy, getInvoicedBy);
router.get('/:id', canManageInvoicedBy, getInvoicedByById);
router.post('/', canManageInvoicedBy, createInvoicedBy);
router.patch('/:id', canManageInvoicedBy, updateInvoicedBy);
router.delete('/:id', canManageInvoicedBy, deleteInvoicedBy);

export default router;
