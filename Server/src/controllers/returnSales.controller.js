import mongoose from 'mongoose';
import Counter from '../models/counter.model.js';
import ReturnSale from '../models/returnSale.model.js';
import {
  validateReturnSaleCreateBody,
  validateReturnSaleUpdateBody,
} from '../schemas/returnSale.schema.js';

const getNextReturnNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    {key: 'return_sales_number'},
    {$inc: {value: 1}},
    {new: true, upsert: true, setDefaultsOnInsert: true},
  );
  return counter.value;
};

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const createReturnSale = async (req, res) => {
  try {
    const parsed = validateReturnSaleCreateBody(req.body);
    if (!parsed.ok) {
      return res.status(400).json({
        success: false,
        message: parsed.errors.join(' '),
        errors: parsed.errors,
      });
    }

    const nextNumber = await getNextReturnNumber();
    const returnPrefix = 'RSRVWAH';
    const returnCode = `${returnPrefix}-${nextNumber}`;

    const staffFromReq = {
      m_staff_id: req.user?.userId ?? null,
      m_staff_name: req.user?.name ?? null,
      m_staff_email: req.user?.email ?? null,
    };

    const createdBy = parsed.data.createdBy ?? staffFromReq;

    let originalInvoiceId = null;
    if (parsed.data.originalInvoiceId) {
      if (!mongoose.Types.ObjectId.isValid(parsed.data.originalInvoiceId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid originalInvoiceId.',
        });
      }
      originalInvoiceId = new mongoose.Types.ObjectId(parsed.data.originalInvoiceId);
    }

    const doc = await ReturnSale.create({
      returnPrefix,
      returnNumber: nextNumber,
      returnCode,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      invoiceDate: parsed.data.invoiceDate,
      dueDate: parsed.data.dueDate,
      salesPersonName: parsed.data.salesPersonName,
      billBy: parsed.data.billBy || '',
      invoiceBy: parsed.data.invoiceBy || {
        staffId: null,
        staffName: '',
        employeeId: '',
        email: '',
      },
      notes: parsed.data.notes,
      status: parsed.data.status,
      items: parsed.data.items,
      subTotal: parsed.data.subTotal,
      discountTotal: parsed.data.discountTotal,
      grandTotal: parsed.data.grandTotal,
      originalInvoiceId,
      createdBy,
    });

    return res.status(201).json({
      success: true,
      message: 'Return sale created successfully.',
      returnSale: doc,
    });
  } catch (error) {
    console.error('createReturnSale error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create return sale.',
    });
  }
};

export const getReturnSales = async (req, res) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const query = {};

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        {returnCode: regex},
        {customerName: regex},
        {customerPhone: regex},
      ];
    }

    const returnSales = await ReturnSale.find(query)
      .sort({createdAt: -1})
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Return sales fetched successfully.',
      returnSales,
    });
  } catch (error) {
    console.error('getReturnSales error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch return sales.',
    });
  }
};

export const getReturnSaleById = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid id.'});
    }

    const returnSale = await ReturnSale.findById(id).lean();
    if (!returnSale) {
      return res.status(404).json({success: false, message: 'Return sale not found.'});
    }

    return res.status(200).json({
      success: true,
      message: 'Return sale fetched successfully.',
      returnSale,
    });
  } catch (error) {
    console.error('getReturnSaleById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch return sale.',
    });
  }
};

export const updateReturnSale = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid id.'});
    }

    const parsed = validateReturnSaleUpdateBody(req.body);
    if (!parsed.ok) {
      return res.status(400).json({
        success: false,
        message: parsed.errors.join(' '),
        errors: parsed.errors,
      });
    }

    const updateData = {...parsed.data};
    if (updateData.originalInvoiceId !== undefined) {
      const v = updateData.originalInvoiceId;
      if (v && !mongoose.Types.ObjectId.isValid(v)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid originalInvoiceId.',
        });
      }
      updateData.originalInvoiceId = v
        ? new mongoose.Types.ObjectId(v)
        : null;
    }

    const returnSale = await ReturnSale.findByIdAndUpdate(
      id,
      {$set: updateData},
      {new: true},
    );

    if (!returnSale) {
      return res.status(404).json({success: false, message: 'Return sale not found.'});
    }

    return res.status(200).json({
      success: true,
      message: 'Return sale updated successfully.',
      returnSale,
    });
  } catch (error) {
    console.error('updateReturnSale error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update return sale.',
    });
  }
};

export const deleteReturnSale = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid id.'});
    }

    const deleted = await ReturnSale.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({success: false, message: 'Return sale not found.'});
    }

    return res.status(200).json({
      success: true,
      message: 'Return sale deleted successfully.',
    });
  } catch (error) {
    console.error('deleteReturnSale error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete return sale.',
    });
  }
};
