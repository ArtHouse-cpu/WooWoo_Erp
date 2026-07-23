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
} from '../controllers/vendor.controller.js';

const router = express.Router();

router.use(authenticateUser, attachStaffContext);

router.post('/', requirePermission(PERMISSIONS.VENDOR_CREATE), createVendor);
router.get('/', requirePermission(PERMISSIONS.VENDOR_READ), getVendors);
router.get('/:id', requirePermission(PERMISSIONS.VENDOR_READ), getVendorById);
router.delete('/:id', requirePermission(PERMISSIONS.VENDOR_DELETE), deleteVendor);
router.patch('/:id', requirePermission(PERMISSIONS.VENDOR_UPDATE), updateVendor);

export default router;
