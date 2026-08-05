import mongoose from 'mongoose';
import InvoicedBy from '../models/invoicedBy.model.js';

export const getInvoicedBy = async (_req, res) => {
  try {
    const list = await InvoicedBy.find({ isActive: { $ne: false } })
      .sort({ name: 1 })
      .lean();
    return res.status(200).json({
      success: true,
      invoicedBy: list,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch invoiced by list.',
    });
  }
};

export const getInvoicedByById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid id.' });
    }
    const row = await InvoicedBy.findById(id).lean();
    if (!row) {
      return res.status(404).json({ success: false, message: 'Invoiced by not found.' });
    }
    return res.status(200).json({ success: true, invoicedBy: row });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch invoiced by.',
    });
  }
};

export const createInvoicedBy = async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required.',
      });
    }

    const existing = await InvoicedBy.findOne({
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    }).lean();
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Already exists.',
        invoicedBy: existing,
      });
    }

    const created = await InvoicedBy.create({ name });
    return res.status(201).json({
      success: true,
      message: 'Invoiced by created.',
      invoicedBy: created,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const again = await InvoicedBy.findOne({
        name: String(req.body?.name ?? '').trim(),
      }).lean();
      if (again) {
        return res.status(200).json({
          success: true,
          message: 'Already exists.',
          invoicedBy: again,
        });
      }
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create invoiced by.',
    });
  }
};

export const updateInvoicedBy = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid id.' });
    }

    const name = String(req.body?.name ?? '').trim();
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required.',
      });
    }

    const duplicate = await InvoicedBy.findOne({
      _id: { $ne: id },
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    }).lean();
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'Another entry with this name already exists.',
      });
    }

    const updated = await InvoicedBy.findByIdAndUpdate(
      id,
      { $set: { name } },
      { new: true, runValidators: true },
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Invoiced by not found.' });
    }
    return res.status(200).json({
      success: true,
      message: 'Invoiced by updated.',
      invoicedBy: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update invoiced by.',
    });
  }
};

export const deleteInvoicedBy = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid id.' });
    }
    const deleted = await InvoicedBy.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Invoiced by not found.' });
    }
    return res.status(200).json({
      success: true,
      message: 'Invoiced by deleted.',
      invoicedBy: deleted,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete invoiced by.',
    });
  }
};
