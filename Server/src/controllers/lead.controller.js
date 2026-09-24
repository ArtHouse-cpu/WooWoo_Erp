import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Lead from '../models/lead.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localUploadsDir = path.resolve(__dirname, '../../uploads/leads');
const tmpUploadsDir = path.join('/tmp', 'uploads', 'leads');

let uploadsDir = localUploadsDir;
try {
  fs.mkdirSync(localUploadsDir, { recursive: true });
} catch (error) {
  fs.mkdirSync(tmpUploadsDir, { recursive: true });
  uploadsDir = tmpUploadsDir;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '')}`;
    cb(null, uniqueName);
  },
});

export const uploadLeadAttachments = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max per file
});

const uploadLeadFiles = async (files) => {
  if (!files || !files.length) return [];
  const uploaded = [];
  for (const file of files) {
    try {
      const cloudinaryUrl = await uploadOnCloudinary(file.path, {
        folder: 'woowoo/leads',
      });
      uploaded.push({
        url: cloudinaryUrl || `/uploads/leads/${file.filename}`,
        name: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      });
    } catch (err) {
      console.error('Lead attachment upload error:', err);
      uploaded.push({
        url: `/uploads/leads/${file.filename}`,
        name: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      });
    }
  }
  return uploaded;
};

const normalizeAttachments = (items) => {
  if (!items) return [];
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch {
      items = [items];
    }
  }
  if (!Array.isArray(items)) items = [items];
  return items
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') {
        const parts = item.split('/');
        return {
          url: item,
          name: parts[parts.length - 1] || 'attachment',
          mimeType: '',
          size: 0,
        };
      }
      if (typeof item === 'object' && item.url) {
        return {
          url: item.url,
          name: item.name || item.url.split('/').pop() || 'attachment',
          mimeType: item.mimeType || '',
          size: Number(item.size) || 0,
        };
      }
      return null;
    })
    .filter(Boolean);
};

const parseMaybeJson = (value) => {
  if (value == null || value === '') return undefined;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const getLead = async (req, res) => {
  try {
    const { fromDate, toDate, purpose, status, source, assignedTo } = req.query;
    const filter = {};

    if (purpose && purpose !== 'all') {
      filter.purpose = purpose.trim();
    }
    if (status && status !== 'all') {
      filter.status = status.trim();
    }
    if (source && source !== 'all') {
      filter.source = source.trim();
    }
    if (assignedTo && assignedTo !== 'all') {
      if (assignedTo === 'unassigned') {
        filter.$or = [
          { 'assignedTo.m_staff_name': null },
          { 'assignedTo.m_staff_name': '' },
          { assignedTo: { $exists: false } },
          { assignedTo: null },
        ];
      } else if (assignedTo === 'assigned') {
        filter.$or = [
          { 'assignedTo.m_staff_name': { $exists: true, $nin: [null, ''] } },
          { 'assignedTo.m_staff_id': { $exists: true, $nin: [null, ''] } },
        ];
      } else {
        const rx = new RegExp(`^${assignedTo.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        filter.$or = [
          { 'assignedTo.m_staff_name': rx },
          { 'assignedTo.m_staff_id': assignedTo.trim() },
        ];
      }
    }

    //fromdate

       if (fromDate || toDate) {
      filter.createdAt = {};

      // From date
      if (fromDate) {
        const startDate = new Date(`${fromDate}T00:00:00.000Z`);

        if (isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid fromDate",
          });
        }

        filter.createdAt.$gte = startDate;
      }

      // To date
      if (toDate) {
        const endDate = new Date(`${toDate}T23:59:59.999Z`);

        if (isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid toDate",
          });
        }

        filter.createdAt.$lte = endDate;
      }
    }
    const leads = await Lead.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Leads fetched successfully",
      data: leads,
    });
  } catch (error) {
    console.error("Get Leads Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch leads",
      error: error.message,
    });
  }
};
//Get By Id
export const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check valid MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Lead fetched successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Get Lead By ID Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch lead",
      error: error.message,
    });
  }
};
// Patch
export const updateLead = async (req, res) => {
  try {
    const id = req.params.id || req.body.id || req.body._id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    if (req.body.name !== undefined) {
      lead.name = req.body.name;
    }

    if (req.body.phone !== undefined) {
      lead.phone = req.body.phone;
    }

    if (req.body.status !== undefined) {
      lead.status = req.body.status;
    }

    if (req.body.source !== undefined) {
      lead.source = req.body.source;
    }

    if (req.body.purpose !== undefined) {
      lead.purpose = req.body.purpose;
    }

    if (req.body.reasonNote !== undefined) {
      lead.reasonNote = req.body.reasonNote;
    }

    if (req.body.url !== undefined) {
      lead.url = req.body.url != null ? String(req.body.url).trim() : "";
    }

    if (req.body.assignedTo !== undefined) {
      lead.assignedTo = parseMaybeJson(req.body.assignedTo);
    }

    if (req.body.createdBy !== undefined) {
      lead.createdBy = parseMaybeJson(req.body.createdBy);
    }

    // Handle attachments (existing + newly uploaded)
    if (req.body.attachments !== undefined || (req.files && req.files.length > 0)) {
      const existingAttachments = req.body.attachments !== undefined
        ? normalizeAttachments(req.body.attachments)
        : (lead.attachments || []);
      const newAttachments = await uploadLeadFiles(req.files);
      lead.attachments = [...existingAttachments, ...newAttachments];
    }

    const updatedLead = await lead.save();

    res.status(200).json({
      success: true,
      message: "Lead updated successfully",
      data: updatedLead,
    });
  } catch (error) {
    console.error("Update Lead Error:", error);

    // Mongoose validation error
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.values(error.errors).map(
          (err) => err.message
        ),
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update lead",
      error: error.message,
    });
  }
};
//Post

export const createLead = async (req, res) => {
  try {
    const {
      name,
      phone,
      status,
      source,
      purpose,
      reasonNote,
      url,
      createdBy,
      assignedTo,
      attachments,
    } = req.body;

    // Name validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    // Phone validation
    const phoneTrimmed = phone?.trim() || "";
    if (!phoneTrimmed) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    if (!/^\d{10}$/.test(phoneTrimmed)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be a valid 10-digit number",
      });
    }

    const createdByParsed = parseMaybeJson(createdBy);
    const assignedToParsed = parseMaybeJson(assignedTo);

    const existingAttachments = normalizeAttachments(attachments);
    const newAttachments = await uploadLeadFiles(req.files);
    const allAttachments = [...existingAttachments, ...newAttachments];

    const lead = await Lead.create({
      name: name.trim(),
      phone: phoneTrimmed,
      status: status || "New",
      source: source?.trim() || "",
      purpose: purpose?.trim() || "",
      reasonNote: reasonNote?.trim() || "",
      url: url?.trim() || "",
      attachments: allAttachments,
      createdBy: createdByParsed || undefined,
      assignedTo: assignedToParsed || undefined,
    });

    res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Create Lead Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create lead",
      error: error.message,
    });
  }
};
//Delete

export const deleteLead = async (req, res) => {
  try {
    const id = req.params.id || req.body.id || req.body._id;

    // Check valid MongoDB ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const deletedLead = await Lead.findByIdAndDelete(id);

    if (!deletedLead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Lead deleted successfully",
      data: deletedLead,
    });
  } catch (error) {
    console.error("Delete Lead Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete lead",
      error: error.message,
    });
  }
};