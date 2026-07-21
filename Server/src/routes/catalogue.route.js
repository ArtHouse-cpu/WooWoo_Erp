import express from 'express';
import {authenticateUser} from '../middlewares/auth.middleware.js';
import {lookupCatalogueItems} from '../controllers/catalogue.controller.js';

const router = express.Router();

router.get('/lookup', authenticateUser, lookupCatalogueItems);

export default router;
