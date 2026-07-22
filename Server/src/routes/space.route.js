import express from 'express';
import {authenticateUser} from '../middlewares/auth.middleware.js';
import {
  createSpace,
  getSpaces,
  getSpaceById,
  updateSpace,
  deleteSpace,
  uploadSpaceImage,
} from '../controllers/space.controller.js';

const router = express.Router();

router.get('/', authenticateUser, getSpaces);
router.get('/:id', authenticateUser, getSpaceById);
router.post('/', authenticateUser, uploadSpaceImage.single('image'), createSpace);
router.put('/:id', authenticateUser, uploadSpaceImage.single('image'), updateSpace);
router.patch('/:id', authenticateUser, uploadSpaceImage.single('image'), updateSpace);
router.delete('/:id', authenticateUser, deleteSpace);

export default router;
