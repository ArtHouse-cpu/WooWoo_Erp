import express from 'express';
import {createProduct, getProducts, upload, deleteProduct, updateProduct} from '../controllers/product.controller.js';
import {authenticateUser} from '../middlewares/auth.middleware.js';
import {attachStaffContext, requirePermission} from '../middlewares/authorize.middleware.js';
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
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCT_UPDATE),
  upload.array('images', 10),
  updateProduct,
);
router.delete('/:id', requirePermission(PERMISSIONS.PRODUCT_DELETE), deleteProduct);

export default router;
