import express from 'express';
import { authenticateUser } from '../middlewares/auth.middleware.js';
import {
  createVendor,
  getVendors,
  getVendorById,
  deleteVendor,
  updateVendor,
} from '../controllers/vendor.controller.js';

const router = express.Router();

router.post('/', authenticateUser, createVendor);
router.get('/', authenticateUser, getVendors);
router.get('/:id', authenticateUser, getVendorById);
router.delete('/:id', authenticateUser, deleteVendor);
router.patch('/:id', authenticateUser, updateVendor);

export default router;