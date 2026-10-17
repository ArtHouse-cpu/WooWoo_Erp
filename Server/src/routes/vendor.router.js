import express from 'express';
import {authenticateUser} from '../middlewares/auth.middleware.js';
import {attachStaffContext, requirePermission} from '../middlewares/authorize.middleware.js';
import {PERMISSIONS} from '../constants/permissions.js';
import {
  createVendor,
  getVendors,
  getVendorById,
  deleteVendor,
  updateVendor,
  importVendors,
} from '../controllers/vendor.controller.js';
import {getVendor360, recordVendorPayment, paymentDocumentUpload, uploadVendorPaymentDocument} from '../controllers/vendor360.controller.js';

const router = express.Router();

router.use(authenticateUser, attachStaffContext);

router.post('/', requirePermission(PERMISSIONS.VENDOR_CREATE), createVendor);
router.post(
  '/import',
  requirePermission(PERMISSIONS.VENDOR_CREATE),
  importVendors,
);
router.get('/', requirePermission(PERMISSIONS.VENDOR_READ), getVendors);
router.get('/:id/360', requirePermission(PERMISSIONS.VENDOR_READ), getVendor360);
router.post('/:id/payment-documents', requirePermission(PERMISSIONS.VENDOR_UPDATE), (req, res, next) => {
  paymentDocumentUpload(req, res, error => {
    if (!error) return next();
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'The file must be 5 MB or smaller.'
      : error.message || 'Could not upload the receipt.';
    return res.status(400).json({success: false, message});
  });
}, uploadVendorPaymentDocument);
router.post('/:id/payments', requirePermission(PERMISSIONS.VENDOR_UPDATE), recordVendorPayment);
router.get('/:id', requirePermission(PERMISSIONS.VENDOR_READ), getVendorById);
router.delete('/:id', requirePermission(PERMISSIONS.VENDOR_DELETE), deleteVendor);
router.patch('/:id', requirePermission(PERMISSIONS.VENDOR_UPDATE), updateVendor);

export default router;
