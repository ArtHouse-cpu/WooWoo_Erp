import express from 'express';
import {authenticateUser} from '../middlewares/auth.middleware.js';
import {
  createFood,
  getFoods,
  getFoodById,
  updateFood,
  deleteFood,
  uploadFoodImage,
} from '../controllers/food.controller.js';

const router = express.Router();

router.get('/', authenticateUser, getFoods);
router.get('/:id', authenticateUser, getFoodById);
router.post('/', authenticateUser, uploadFoodImage.single('image'), createFood);
router.put('/:id', authenticateUser, uploadFoodImage.single('image'), updateFood);
router.patch('/:id', authenticateUser, uploadFoodImage.single('image'), updateFood);
router.delete('/:id', authenticateUser, deleteFood);

export default router;
