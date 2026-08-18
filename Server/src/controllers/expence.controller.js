import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import Expence from '../models/expence.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localUploadsDir = path.resolve(__dirname, '../../uploads/expenses');
const tmpUploadsDir = path.join('/tmp', 'uploads', 'expenses');

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

export const uploadExpenceReceipt = multer({
  storage,
  fileFilter,
  limits: {fileSize: 5 * 1024 * 1024},
});

const parseMaybeJson = value => {
  if (value == null || value === '') return undefined;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const resolveReceiptUrl = async req => {
  if (!req.file?.path) return undefined;
  try {
    const uploadedUrl = await uploadOnCloudinary(req.file.path, {
      folder: 'woowoo/expenses',
    });
    return uploadedUrl || null;
  } catch (error) {
    console.error('expense receipt upload error:', error);
    return null;
  }
};

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const round2 = n => Math.round((Number(n) || 0) * 100) / 100;

const buildPayload = (body = {}, {isUpdate = false} = {}) => {
  const payload = {};

  if (!isUpdate || body.expenseCode !== undefined) payload.expenseCode = String(body.expenseCode ?? '').trim();
  if (!isUpdate || body.title !== undefined) payload.title = String(body.title ?? '').trim();
  if (!isUpdate || body.category !== undefined) payload.category = String(body.category ?? 'Other').trim() || 'Other';
  if (!isUpdate || body.categoryId !== undefined) {
    const categoryId = String(body.categoryId ?? '').trim();
    payload.categoryId = mongoose.Types.ObjectId.isValid(categoryId) ? categoryId : null;
  }
  if (!isUpdate || body.amount !== undefined) payload.amount = round2(Math.max(0, Number(body.amount ?? 0) || 0));
  if (!isUpdate || body.paidTo !== undefined) payload.paidTo = String(body.paidTo ?? '').trim();
  if (!isUpdate || body.vendorId !== undefined) {
    const vendorId = String(body.vendorId ?? '').trim();
    payload.vendorId = mongoose.Types.ObjectId.isValid(vendorId) ? vendorId : null;
  }
  if (!isUpdate || body.mode !== undefined) payload.mode = String(body.mode ?? 'Cash').trim() || 'Cash';
  if (!isUpdate || body.status !== undefined) payload.status = String(body.status ?? 'Paid').trim() || 'Paid';
  if (!isUpdate || body.date !== undefined) payload.date = body.date ? new Date(body.date) : new Date();
  if (!isUpdate || body.notes !== undefined) payload.notes = String(body.notes ?? '').trim();
  if (!isUpdate || body.receiptUrl !== undefined) payload.receiptUrl = String(body.receiptUrl ?? '').trim();

  return payload;
};

const validatePayload = payload => {
  if (!payload.title || !String(payload.title).trim()) return 'Title is required.';
  if (!Number.isFinite(Number(payload.amount)) || Number(payload.amount) < 0) return 'Amount must be a valid non-negative number.';
  if (payload.date && Number.isNaN(new Date(payload.date).getTime())) return 'Invalid date value.';
  return null;
};

export const getAllExpences = async (req, res) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 5000);
    const query = {};

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [{expenseCode: regex}, {title: regex}, {category: regex}, {paidTo: regex}, {notes: regex}];
    }

    const expences = await Expence.find(query).sort({date: -1, createdAt: -1}).limit(limit).lean();
    return res.status(200).json({
      success: true,
      message: 'Expenses fetched successfully.',
      expences,
      total: expences.length,
      limit,
    });
  } catch (error) {
    console.error('getAllExpences error:', error);
    return res.status(500).json({success: false, message: error.message || 'Failed to fetch expenses.'});
  }
};

export const getExpencesById = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid expense id.'});
    }

    const expence = await Expence.findById(id).lean();
    if (!expence) {
      return res.status(404).json({success: false, message: 'Expense not found.'});
    }

    return res.status(200).json({success: true, expence});
  } catch (error) {
    console.error('getExpencesById error:', error);
    return res.status(500).json({success: false, message: error.message || 'Failed to fetch expense.'});
  }
};

export const addExpencesById = async (req, res) => {
  try {
    const payload = buildPayload(req.body, {isUpdate: false});
    const invalid = validatePayload(payload);
    if (invalid) {
      return res.status(400).json({success: false, message: invalid});
    }

    const receiptUrl = await resolveReceiptUrl(req);
    if (req.file && !receiptUrl) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload receipt image to Cloudinary.',
      });
    }
    if (receiptUrl) payload.receiptUrl = receiptUrl;

    const createdBy = parseMaybeJson(req.body?.createdBy) ?? {
      m_staff_id: req.user?.userId ?? null,
      m_staff_name: req.user?.name ?? null,
      m_staff_email: req.user?.email ?? null,
    };
    const addedBy = parseMaybeJson(req.body?.addedBy) ?? {
      m_staff_id: req.user?.userId ?? null,
      m_staff_name: req.user?.name ?? null,
      m_staff_email: req.user?.email ?? null,
    };

    const expence = await Expence.create({...payload, createdBy, addedBy});
    return res.status(201).json({success: true, message: 'Expense created successfully.', expence});
  } catch (error) {
    console.error('addExpencesById error:', error);
    return res.status(500).json({success: false, message: error.message || 'Failed to create expense.'});
  }
};

export const updateExpencesById = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid expense id.'});
    }

    const existing = await Expence.findById(id);
    if (!existing) {
      return res.status(404).json({success: false, message: 'Expense not found.'});
    }

    const payload = buildPayload(req.body, {isUpdate: true});
    const receiptUrl = await resolveReceiptUrl(req);
    if (req.file && !receiptUrl) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload receipt image to Cloudinary.',
      });
    }
    if (receiptUrl) payload.receiptUrl = receiptUrl;

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({success: false, message: 'No valid fields to update.'});
    }

    const merged = {...existing.toObject(), ...payload};
    const invalid = validatePayload(merged);
    if (invalid) {
      return res.status(400).json({success: false, message: invalid});
    }

    Object.assign(existing, payload);
    await existing.save();
    return res.status(200).json({success: true, message: 'Expense updated successfully.', expence: existing});
  } catch (error) {
    console.error('updateExpencesById error:', error);
    return res.status(500).json({success: false, message: error.message || 'Failed to update expense.'});
  }
};

export const deleteExpencesById = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid expense id.'});
    }

    const deleted = await Expence.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({success: false, message: 'Expense not found.'});
    }

    return res.status(200).json({success: true, message: 'Expense deleted successfully.'});
  } catch (error) {
    console.error('deleteExpencesById error:', error);
    return res.status(500).json({success: false, message: error.message || 'Failed to delete expense.'});
  }
};

// Backward-compatible aliases (if any older files import these names)
export const createExpence = addExpencesById;
export const getExpences = getAllExpences;
