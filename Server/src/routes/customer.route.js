import express from 'express';
import {
  createCustomer,
  getCustomers,
  uploadCustomerImage,
  deleteCustomer,
  editCustomer,
  importCustomers,
} from '../controllers/customer.controller.js';
import {authenticateUser} from '../middlewares/auth.middleware.js';
import {attachStaffContext, requirePermission} from '../middlewares/authorize.middleware.js';
import {PERMISSIONS} from '../constants/permissions.js';

const router = express.Router();

router.use(authenticateUser, attachStaffContext);

router.post(
  '/',
  requirePermission(PERMISSIONS.CUSTOMER_CREATE),
  uploadCustomerImage.single('profileImage'),
  createCustomer,
);
router.post(
  '/import',
  requirePermission(PERMISSIONS.CUSTOMER_CREATE),
  importCustomers,
);
router.get('/', requirePermission(PERMISSIONS.CUSTOMER_READ), getCustomers);
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.CUSTOMER_UPDATE),
  uploadCustomerImage.single('profileImage'),
  editCustomer,
);
router.delete('/:id', requirePermission(PERMISSIONS.CUSTOMER_DELETE), deleteCustomer);

export default router;
