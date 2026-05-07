import mongoose from 'mongoose';
import Counter from '../models/counter.model.js';
import Subscription from '../models/subscription.model.js';
import Customer from '../models/customer.model.js';
import {sendSubscriptionCreatedEmail} from '../utils/brevoMailer.js';
import {
  validateSubscriptionCreateBody,
  validateSubscriptionUpdateBody,
} from '../schemas/subscription.schema.js';

const getNextSubscriptionNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    {key: 'subscription_number'},
    {$inc: {value: 1}},
    {new: true, upsert: true, setDefaultsOnInsert: true},
  );
  return counter.value;
};

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const createSubscription = async (req, res) => {
  try {
    const parsed = validateSubscriptionCreateBody(req.body);
    if (!parsed.ok) {
      return res.status(400).json({
        success: false,
        message: parsed.errors.join(' '),
        errors: parsed.errors,
      });
    }

    const nextNumber = await getNextSubscriptionNumber();
    const subscriptionPrefix = 'SUB';
    const subscriptionCode = `${subscriptionPrefix}-${nextNumber}`;

    const staffFromReq = {
      m_staff_id: req.user?.userId ?? null,
      m_staff_name: req.user?.name ?? null,
      m_staff_email: req.user?.email ?? null,
    };

    const createdBy = parsed.data.createdBy ?? staffFromReq;

    const subscription = await Subscription.create({
      subscriptionPrefix,
      subscriptionNumber: nextNumber,
      subscriptionCode,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      invoiceDate: parsed.data.invoiceDate,
      dueDate: parsed.data.dueDate,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      repeatType: parsed.data.repeatType,
      repeatEvery: parsed.data.repeatEvery,
      repeatUnit: parsed.data.repeatUnit,
      salesPersonName: parsed.data.salesPersonName,
      notes: parsed.data.notes,
      status: parsed.data.status,
      items: parsed.data.items,
      subTotal: parsed.data.subTotal,
      discountTotal: parsed.data.discountTotal,
      grandTotal: parsed.data.grandTotal,
      createdBy,
      noOfInvoices: 0,
      nextInvoiceDate: parsed.data.startDate,
    });

    try {
      const customer = await Customer.findOne({
        mobile: parsed.data.customerPhone,
      })
        .select('name email')
        .lean();
      const customerEmail = String(customer?.email ?? '').trim().toLowerCase();

      if (customerEmail && EMAIL_RE.test(customerEmail)) {
        await sendSubscriptionCreatedEmail({
          toEmail: customerEmail,
          customerName: customer?.name || parsed.data.customerName,
          subscriptionCode,
          subscription,
        });
      } else {
        console.warn(
          `createSubscription: email not sent for ${subscriptionCode} (missing/invalid customer email).`,
        );
      }
    } catch (mailError) {
      console.error('createSubscription email error:', mailError);
    }

    return res.status(201).json({
      success: true,
      message: 'Subscription created successfully.',
      subscription,
    });
  } catch (error) {
    console.error('createSubscription error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create subscription.',
    });
  }
};

export const getSubscriptions = async (req, res) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const status = String(req.query.status ?? '').trim().toLowerCase();

    const query = {};
    if (status && status !== 'all') query.status = status;

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        {subscriptionCode: regex},
        {customerName: regex},
        {customerPhone: regex},
      ];
    }

    const subscriptions = await Subscription.find(query)
      .sort({createdAt: -1})
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Subscriptions fetched successfully.',
      subscriptions,
    });
  } catch (error) {
    console.error('getSubscriptions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions.',
    });
  }
};

export const getSubscriptionById = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid id.'});
    }

    const subscription = await Subscription.findById(id).lean();
    if (!subscription) {
      return res.status(404).json({success: false, message: 'Subscription not found.'});
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription fetched successfully.',
      subscription,
    });
  } catch (error) {
    console.error('getSubscriptionById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription.',
    });
  }
};

export const updateSubscription = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid id.'});
    }

    const parsed = validateSubscriptionUpdateBody(req.body);
    if (!parsed.ok) {
      return res.status(400).json({
        success: false,
        message: parsed.errors.join(' '),
        errors: parsed.errors,
      });
    }

    const subscription = await Subscription.findByIdAndUpdate(
      id,
      {$set: parsed.data},
      {new: true},
    );

    if (!subscription) {
      return res.status(404).json({success: false, message: 'Subscription not found.'});
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription updated successfully.',
      subscription,
    });
  } catch (error) {
    console.error('updateSubscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update subscription.',
    });
  }
};

export const deleteSubscription = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid id.'});
    }

    const deleted = await Subscription.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({success: false, message: 'Subscription not found.'});
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription deleted successfully.',
    });
  } catch (error) {
    console.error('deleteSubscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete subscription.',
    });
  }
};
