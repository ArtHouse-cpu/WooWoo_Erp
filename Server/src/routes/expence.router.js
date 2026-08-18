import express from 'express';
import {authenticateUser} from '../middlewares/auth.middleware.js';
import {attachStaffContext, requirePermission} from '../middlewares/authorize.middleware.js';
import {PERMISSIONS} from '../constants/permissions.js';
import {
  addExpencesById,
  deleteExpencesById,
  getAllExpences,
  getExpencesById,
  updateExpencesById,
  uploadExpenceReceipt,
} from '../controllers/expence.controller.js';

const router = express.Router();

router.use(authenticateUser, attachStaffContext);

router.get('/', requirePermission(PERMISSIONS.EXPENCE_READ), getAllExpences);
router.get('/:id', requirePermission(PERMISSIONS.EXPENCE_READ), getExpencesById);
router.post('/', requirePermission(PERMISSIONS.EXPENCE_CREATE), uploadExpenceReceipt.single('receipt'), addExpencesById);
router.patch('/:id', requirePermission(PERMISSIONS.EXPENCE_UPDATE), uploadExpenceReceipt.single('receipt'), updateExpencesById);
router.delete('/:id', requirePermission(PERMISSIONS.EXPENCE_DELETE), deleteExpencesById);

export default router;