import express from 'express';
import {
  createProduct,
  getProducts,
  upload,
  deleteProduct,
  updateProduct,
  uploadBulkProducts,
} from '../controllers/product.controller.js';
import {authenticateUser} from '../middlewares/auth.middleware.js';
import {
  attachStaffContext,
  requireAnyPermission,
  requirePermission,
} from '../middlewares/authorize.middleware.js';
import {PERMISSIONS} from '../constants/permissions.js';

const router = express.Router();

router.use(authenticateUser, attachStaffContext);

router.get('/', requirePermission(PERMISSIONS.PRODUCT_READ), getProducts);
router.post(
  '/',
  requirePermission(PERMISSIONS.PRODUCT_CREATE),
  upload.array('images', 10),
  createProduct,
);
router.post(
  '/bulkUpload',
  requireAnyPermission(
    PERMISSIONS.PRODUCT_BULK_CREATE,
    PERMISSIONS.PRODUCT_CREATE,
  ),
  uploadBulkProducts,
);
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCT_UPDATE),
  upload.array('images', 10),
  updateProduct,
);
router.delete('/:id', requirePermission(PERMISSIONS.PRODUCT_DELETE), deleteProduct);

export default router;
