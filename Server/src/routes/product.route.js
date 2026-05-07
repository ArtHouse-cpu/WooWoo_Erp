import express from 'express';
import { createProduct, getProducts, upload,deleteProduct, updateProduct } from '../controllers/product.controller.js';
import { authenticateUser } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', authenticateUser, getProducts);
router.post('/', authenticateUser, upload.array('images', 10), createProduct);
router.patch('/:id', authenticateUser, upload.array('images', 10), updateProduct);
router.delete('/:id', authenticateUser, deleteProduct);

export default router;
