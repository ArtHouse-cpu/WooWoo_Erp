import express from 'express';
import {createCustomer, getCustomers, uploadCustomerImage,deleteCustomer,editCustomer} from '../controllers/customer.controller.js';
import {authenticateUser} from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', authenticateUser,uploadCustomerImage.single("profileImage"), createCustomer);
router.get('/', authenticateUser, getCustomers);
router.patch('/:id', authenticateUser, uploadCustomerImage.single("profileImage"), editCustomer);
router.delete('/:id', authenticateUser, deleteCustomer);

export default router;
