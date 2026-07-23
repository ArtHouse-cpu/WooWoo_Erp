import express from 'express';
import {
  getCategories,
  addCategories,
  updateCategories,
  deleteCategory,
} from '../controllers/category.controller.js';
import {authenticateUser} from '../middlewares/auth.middleware.js';
import {
  attachStaffContext,
  requirePermission,
  requireAnyPermission,
} from '../middlewares/authorize.middleware.js';
import {PERMISSIONS} from '../constants/permissions.js';

const router = express.Router();

router.use(authenticateUser, attachStaffContext);

// Read categories when working catalogue / sales (no separate category.read key)
router.get(
  '/',
  requireAnyPermission(
    PERMISSIONS.CATEGORY_MANAGE,
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.PRODUCT_CREATE,
    PERMISSIONS.SERVICE_READ,
    PERMISSIONS.SERVICE_CREATE,
    PERMISSIONS.FOOD_READ,
    PERMISSIONS.SPACE_READ,
  ),
  getCategories,
);
router.post('/', requirePermission(PERMISSIONS.CATEGORY_MANAGE), addCategories);
router.patch('/', requirePermission(PERMISSIONS.CATEGORY_MANAGE), updateCategories);
router.delete('/:id', requirePermission(PERMISSIONS.CATEGORY_MANAGE), deleteCategory);

export default router;
