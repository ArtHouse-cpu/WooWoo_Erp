import express from 'express';
import { authenticateUser } from '../middlewares/auth.middleware.js';
import { createMembership, getMemberships, updateMembership, deleteMembership } from '../controllers/membership.controller.js';
const router = express.Router();
router.post('/', authenticateUser, createMembership);
router.get('/', authenticateUser, getMemberships);
router.patch('/:id', authenticateUser, updateMembership);
router.delete('/:id', authenticateUser, deleteMembership);
export default router;