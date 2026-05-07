import express from 'express';
import { authenticateUser } from '../middlewares/auth.middleware.js';
import {
  createSubscription,
  deleteSubscription,
  getSubscriptionById,
  getSubscriptions,
  updateSubscription,
} from '../controllers/subscription.controller.js';

const router = express.Router();

router.get('/', authenticateUser, getSubscriptions);
router.get('/:id', authenticateUser, getSubscriptionById);
router.post('/', authenticateUser, createSubscription);
router.patch('/:id', authenticateUser, updateSubscription);
router.delete('/:id', authenticateUser, deleteSubscription);

export default router;