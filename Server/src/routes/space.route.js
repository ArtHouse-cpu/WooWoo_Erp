import express from 'express';
import {authenticateUser} from '../middlewares/auth.middleware.js';
import {attachStaffContext, requireAnyPermission, requirePermission} from '../middlewares/authorize.middleware.js';
import {PERMISSIONS} from '../constants/permissions.js';
import {
  createSpace,
  getSpaces,
  getSpaceById,
  updateSpace,
  deleteSpace,
  signSpaceVideoUpload,
  uploadSpaceImage,
} from '../controllers/space.controller.js';

const router = express.Router();

// Catalogue read. Customer app lists Exclusive / Coworking without a staff session.
router.get('/', getSpaces);

router.use(authenticateUser, attachStaffContext);

router.post(
  '/video-signature',
  requireAnyPermission(PERMISSIONS.SPACE_CREATE, PERMISSIONS.SPACE_UPDATE),
  signSpaceVideoUpload,
);
router.get('/:id', requirePermission(PERMISSIONS.SPACE_READ), getSpaceById);
const spaceUploadFields = [
  {name: 'images', maxCount: 8},
  {name: 'image', maxCount: 1},
  {name: 'video', maxCount: 4},
  {name: 'highlightImages', maxCount: 16},
  {name: 'highlightVideos', maxCount: 8},
  {name: 'highlightVideo', maxCount: 8},
];

router.post(
  '/',
  requirePermission(PERMISSIONS.SPACE_CREATE),
  uploadSpaceImage.fields(spaceUploadFields),
  createSpace,
);
router.put(
  '/:id',
  requirePermission(PERMISSIONS.SPACE_UPDATE),
  uploadSpaceImage.fields(spaceUploadFields),
  updateSpace,
);
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.SPACE_UPDATE),
  uploadSpaceImage.fields(spaceUploadFields),
  updateSpace,
);
router.delete('/:id', requirePermission(PERMISSIONS.SPACE_DELETE), deleteSpace);

export default router;
