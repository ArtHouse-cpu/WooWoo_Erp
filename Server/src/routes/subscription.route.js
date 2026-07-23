import express from 'express';
import {authenticateUser} from '../middlewares/auth.middleware.js';
import {attachStaffContext, requirePermission} from '../middlewares/authorize.middleware.js';
import {PERMISSIONS} from '../constants/permissions.js';
import {
  createSubscription,
  deleteSubscription,
  getSubscriptionById,
  getSubscriptions,
  updateSubscription,
} from '../controllers/subscription.controller.js';

const router = express.Router();

router.use(authenticateUser, attachStaffContext);

router.get('/', requirePermission(PERMISSIONS.SUBSCRIPTION_READ), getSubscriptions);
router.get('/:id', requirePermission(PERMISSIONS.SUBSCRIPTION_READ), getSubscriptionById);
router.post('/', requirePermission(PERMISSIONS.SUBSCRIPTION_CREATE), createSubscription);
router.patch('/:id', requirePermission(PERMISSIONS.SUBSCRIPTION_UPDATE), updateSubscription);
router.delete('/:id', requirePermission(PERMISSIONS.SUBSCRIPTION_DELETE), deleteSubscription);

export default router;
