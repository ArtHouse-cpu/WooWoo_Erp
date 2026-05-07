import express from 'express';
import { authenticateUser } from '../middlewares/auth.middleware.js';
import { createInventory, getInventories, getInventoryById, updateInventory, deleteInventory } from '../controllers/Inventory.controller.js';

const router = express.Router();

router.get('/', authenticateUser, getInventories);


export default router;