import mongoose from 'mongoose';
import Membership from '../models/membership.model.js';

const normalizeCustomerDisplay = (input = {}) => ({
  showInApp: input.showInApp !== false,
  badgeLabel: String(input.badgeLabel ?? '').trim(),
  themeKey: String(input.themeKey ?? 'blue').trim(),
  iconKey: String(input.iconKey ?? 'user').trim(),
  cashbackPercent: Math.max(0, Number(input.cashbackPercent ?? 0)),
  storeDiscountPercent: Math.max(0, Number(input.storeDiscountPercent ?? 0)),
  spaceDiscountPercent: Math.max(0, Number(input.spaceDiscountPercent ?? 0)),
  features: Array.isArray(input.features)
    ? input.features
        .map(item => ({
          label: String(item?.label ?? '').trim(),
          was: Math.max(0, Number(item?.was ?? 0)),
        }))
        .filter(item => item.label)
    : [],
});

export const createMembership = async (req, res) => {
  try {
    const {
      planId,
      displayName,
      priority,
      planType,
      description,
      pricing,
      usageLimits,
      insightsLevel,
      status,
      internalNotes,
      customerDisplay,
      createdBy,
    } = req.body;

    if (!planId || !displayName) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID and Display Name are required.',
      });
    }

    const normalizedPlanId = String(planId).trim();
    const existing = await Membership.findOne({ planId: normalizedPlanId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Plan ID already exists.',
      });
    }

    const membership = await Membership.create({
      planId: normalizedPlanId,
      displayName: String(displayName).trim(),
      priority: Number(priority ?? 0),
      planType: String(planType ?? 'Professional').trim(),
      description: String(description ?? '').trim(),
      pricing: {
        period: String(pricing?.period ?? 'Monthly').trim(),
        amount: Number(pricing?.amount ?? 0),
        taxPercent: Number(pricing?.taxPercent ?? 0),
        discountType: String(pricing?.discountType ?? 'Percentage').trim(),
        discountPercent: Number(pricing?.discountPercent ?? 0),
      },
      usageLimits: usageLimits ?? undefined,
      insightsLevel: String(insightsLevel ?? 'Basic').trim(),
      status: String(status ?? 'Active').trim(),
      internalNotes: String(internalNotes ?? '').trim(),
      customerDisplay: normalizeCustomerDisplay(customerDisplay),
      createdBy: createdBy ?? undefined,
    });

    return res.status(201).json({
      success: true,
      message: 'Membership created successfully.',
      membership,
    });
  } catch (error) {
    console.error('createMembership error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create membership.',
    });
  }
};

export const getMemberships = async (req, res) => {
  try {
    const { search = '', planType, status } = req.query;
    const query = {};

    if (planType && String(planType).trim() && String(planType) !== 'All') {
      query.planType = String(planType).trim();
    }
    if (status && String(status).trim() && String(status) !== 'All') {
      query.status = String(status).trim();
    }

    const s = String(search).trim();
    if (s) {
      query.$or = [
        { planId: { $regex: s, $options: 'i' } },
        { displayName: { $regex: s, $options: 'i' } },
      ];
    }

    const memberships = await Membership.find(query).sort({ priority: 1, createdAt: -1 });
    return res.status(200).json({
      success: true,
      message: 'Memberships fetched successfully.',
      memberships,
    });
  } catch (error) {
    console.error('getMemberships error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to fetch memberships.',
    });
  }
};

export const updateMembership = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid membership id.',
      });
    }

    const body = req.body ?? {};
    const patch = {};

    if (body.planId !== undefined) patch.planId = String(body.planId).trim();
    if (body.displayName !== undefined) patch.displayName = String(body.displayName).trim();
    if (body.priority !== undefined) patch.priority = Number(body.priority ?? 0);
    if (body.planType !== undefined) patch.planType = String(body.planType ?? '').trim();
    if (body.description !== undefined) patch.description = String(body.description ?? '').trim();
    if (body.insightsLevel !== undefined) patch.insightsLevel = String(body.insightsLevel ?? '').trim();
    if (body.status !== undefined) patch.status = String(body.status ?? '').trim();
    if (body.internalNotes !== undefined) patch.internalNotes = String(body.internalNotes ?? '').trim();
    if (body.createdBy !== undefined) patch.createdBy = body.createdBy;
    if (body.usageLimits !== undefined) patch.usageLimits = body.usageLimits;
    if (body.customerDisplay !== undefined) {
      patch.customerDisplay = normalizeCustomerDisplay(body.customerDisplay);
    }
    if (body.pricing !== undefined) {
      patch.pricing = {
        period: String(body.pricing?.period ?? 'Monthly').trim(),
        amount: Number(body.pricing?.amount ?? 0),
        taxPercent: Number(body.pricing?.taxPercent ?? 0),
        discountType: String(body.pricing?.discountType ?? 'Percentage').trim(),
        discountPercent: Number(body.pricing?.discountPercent ?? 0),
      };
    }

    if (patch.planId) {
      const exists = await Membership.findOne({
        planId: patch.planId,
        _id: { $ne: id },
      });
      if (exists) {
        return res.status(409).json({
          success: false,
          message: 'Plan ID already exists.',
        });
      }
    }

    const membership = await Membership.findByIdAndUpdate(id, patch, {
      new: true,
      runValidators: true,
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Membership not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Membership updated successfully.',
      membership,
    });
  } catch (error) {
    console.error('updateMembership error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update membership.',
    });
  }
};

export const deleteMembership = async (req, res) => {
  try {
    const { id } = req.params;
    const membership = await Membership.findByIdAndDelete(id);
    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Membership not found.',
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Membership deleted successfully.',
    });
  } catch (error) {
    console.error('deleteMembership error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete membership.',
    });
  }
};