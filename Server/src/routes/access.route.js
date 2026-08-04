import express from 'express';
import {authenticateUser} from '../middlewares/auth.middleware.js';
import {attachStaffContext, requirePermission} from '../middlewares/authorize.middleware.js';
import {PERMISSIONS} from '../constants/permissions.js';
import {
  listPermissionCatalog,
  listRoles,
  getRoleById,
  updateRole,
  listStaff,
  assignStaffRole,
  createStaff,
  updateStaff,
  deleteStaff,
} from '../controllers/access.controller.js';

const router = express.Router();

router.use(authenticateUser, attachStaffContext);

router.get(
  '/permissions',
  requirePermission(PERMISSIONS.ACCESS_READ),
  listPermissionCatalog,
);

router.get('/roles', requirePermission(PERMISSIONS.ACCESS_READ), listRoles);
router.get('/roles/:id', requirePermission(PERMISSIONS.ACCESS_READ), getRoleById);
router.patch('/roles/:id', requirePermission(PERMISSIONS.ACCESS_MANAGE), updateRole);

router.get('/staff', requirePermission(PERMISSIONS.ACCESS_READ), listStaff);
router.post('/staff', requirePermission(PERMISSIONS.ACCESS_MANAGE), createStaff);
router.patch(
  '/staff/:id/role',
  requirePermission(PERMISSIONS.ACCESS_MANAGE),
  assignStaffRole,
);
router.patch(
  '/staff/:id',
  requirePermission(PERMISSIONS.ACCESS_MANAGE),
  updateStaff,
);
router.delete(
  '/staff/:id',
  requirePermission(PERMISSIONS.ACCESS_MANAGE),
  deleteStaff,
);

export default router;
