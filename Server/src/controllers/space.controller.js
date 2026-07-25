import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import Space from '../models/space.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localUploadsDir = path.resolve(__dirname, '../../uploads/spaces');
const tmpUploadsDir = path.join('/tmp', 'uploads', 'spaces');

let uploadsDir = localUploadsDir;
try {
  fs.mkdirSync(localUploadsDir, {recursive: true});
} catch {
  fs.mkdirSync(tmpUploadsDir, {recursive: true});
  uploadsDir = tmpUploadsDir;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '')}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  cb(null, allowed.test(file.mimetype));
};

export const uploadSpaceImage = multer({
  storage,
  fileFilter,
  limits: {fileSize: 5 * 1024 * 1024},
});

const ALLOWED_STATUS = new Set(['Available', 'Booked', 'Maintenance']);

const normalizeStatus = value => {
  const status = String(value || 'Available').trim();
  return ALLOWED_STATUS.has(status) ? status : 'Available';
};

const buildSpacePayload = (body = {}, imageUrl) => {
  const name = String(body.name ?? '').trim();
  const payload = {
    name,
    category: String(body.category ?? 'Studio').trim() || 'Studio',
    price: Math.max(0, Number(body.price ?? 0) || 0),
    capacity: Math.max(1, Number(body.capacity ?? 1) || 1),
    status: normalizeStatus(body.status),
    description: String(body.description ?? '').trim(),
  };

  if (imageUrl !== undefined) {
    payload.imageUrl = imageUrl;
  } else if (body.imageUrl !== undefined) {
    payload.imageUrl = body.imageUrl || null;
  }

  if (body.createdBy !== undefined) {
    payload.createdBy = body.createdBy;
  }

  return {name, payload};
};

const resolveImageUrl = async req => {
  if (!req.file?.path) return undefined;
  try {
    const uploadedUrl = await uploadOnCloudinary(req.file.path, {
      folder: 'woowoo/spaces',
    });
    return uploadedUrl || null;
  } catch (error) {
    console.error('space image upload error:', error);
    return null;
  }
};

export const createSpace = async (req, res) => {
  try {
    const imageUrl = await resolveImageUrl(req);
    const {name, payload} = buildSpacePayload(req.body, imageUrl);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Space name is required.',
      });
    }

    const staffFromReq = {
      m_staff_id: req.user?.userId ?? null,
      m_staff_name: req.user?.name ?? null,
      m_staff_email: req.user?.email ?? null,
    };

    const space = await Space.create({
      ...payload,
      createdBy: payload.createdBy ?? staffFromReq,
    });

    return res.status(201).json({
      success: true,
      message: 'Space created successfully.',
      space,
    });
  } catch (error) {
    console.error('createSpace error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create space.',
    });
  }
};

export const getSpaces = async (req, res) => {
  try {
    const {search = '', category, status} = req.query;
    const query = {};

    if (category && String(category).trim() && String(category) !== 'All') {
      query.category = String(category).trim();
    }
    if (status && String(status).trim() && String(status) !== 'All') {
      query.status = normalizeStatus(status);
    }

    const s = String(search).trim();
    if (s) {
      query.$or = [
        {name: {$regex: s, $options: 'i'}},
        {category: {$regex: s, $options: 'i'}},
        {description: {$regex: s, $options: 'i'}},
      ];
    }

    const spaces = await Space.find(query).sort({createdAt: -1});
    return res.status(200).json({
      success: true,
      message: 'Spaces fetched successfully.',
      spaces,
    });
  } catch (error) {
    console.error('getSpaces error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch spaces.',
    });
  }
};

export const getSpaceById = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid space id.',
      });
    }

    const space = await Space.findById(id);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Space fetched successfully.',
      space,
    });
  } catch (error) {
    console.error('getSpaceById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch space.',
    });
  }
};

export const updateSpace = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid space id.',
      });
    }

    const imageUrl = await resolveImageUrl(req);
    const {name, payload} = buildSpacePayload(req.body, imageUrl);

    if (req.body.name !== undefined && !name) {
      return res.status(400).json({
        success: false,
        message: 'Space name is required.',
      });
    }

    const space = await Space.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Space updated successfully.',
      space,
    });
  } catch (error) {
    console.error('updateSpace error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update space.',
    });
  }
};

export const deleteSpace = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid space id.',
      });
    }

    const space = await Space.findByIdAndDelete(id);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Space deleted successfully.',
    });
  } catch (error) {
    console.error('deleteSpace error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete space.',
    });
  }
};
