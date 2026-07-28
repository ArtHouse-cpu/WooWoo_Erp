import mongoose from 'mongoose';
import Customer from '../models/customer.model.js';
import Vendor from '../models/vendor.model.js';
import CustomerSellerProgram from '../models/customerSellerProgram.model.js';

const getSellerSharePercent = () => {
  const n = Number(process.env.CSP_SELLER_SHARE_PERCENT ?? 70);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 70;
};

const getPlatformSharePercent = () => {
  const n = Number(process.env.CSP_PLATFORM_SHARE_PERCENT ?? 30);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 30;
};

const normalizeMobile = raw => {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    const ten = digits.slice(2);
    return /^[6-9]\d{9}$/.test(ten) ? ten : null;
  }
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) return digits;
  // Vendors sometimes store non-strict mobiles; keep last 10 digits if present
  if (digits.length >= 10) return digits.slice(-10);
  return digits || null;
};

const formatCspLabel = name => {
  const n = String(name || '').trim() || 'Sailor';
  return `CSP · ${n}`;
};

/** CSP enrollment requires Premium membership only. */
const isPremiumMembership = membershipType => {
  const v = String(membershipType ?? '')
    .trim()
    .toLowerCase();
  return v === 'premium';
};

const assertPremiumForCsp = customer => {
  if (!isPremiumMembership(customer?.membershipType)) {
    const error = new Error(
      'Only customers with Premium membership can become CSP sellers. Activate Premium membership first.',
    );
    error.status = 400;
    throw error;
  }
};

const toEnrollmentDto = doc => {
  const plain = doc?.toObject ? doc.toObject() : doc;
  const customer =
    plain?.customerId && typeof plain.customerId === 'object'
      ? plain.customerId
      : null;
  const vendor =
    plain?.vendorId && typeof plain.vendorId === 'object' ? plain.vendorId : null;
  const displayName =
    String(plain?.displayName || '').trim() ||
    String(customer?.name || vendor?.name || '').trim() ||
    'Sailor';
  const mobile =
    String(plain?.mobile || '').trim() ||
    String(customer?.mobile || vendor?.mobile || '').trim();

  return {
    ...plain,
    customerId: customer?._id || plain?.customerId || null,
    vendorId: vendor?._id || plain?.vendorId || null,
    customer,
    vendor,
    displayName,
    mobile,
    label: formatCspLabel(displayName),
  };
};

const populateEnrollment = query =>
  query
    .populate('customerId', 'name mobile email walletAmount membershipType')
    .populate('vendorId', 'name mobile email companyName');

/**
 * GET /csp
 * List CSP enrollments (default: active only).
 */
export const getCSP = async (req, res) => {
  try {
    const status = String(req.query.status ?? 'active').trim().toLowerCase();
    const search = String(req.query.search ?? '').trim();
    const query = {};

    if (status === 'active' || status === 'inactive') {
      query.status = status;
    } else if (status !== 'all') {
      query.status = 'active';
    }

    if (search) {
      const regex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      query.$or = [{displayName: regex}, {mobile: regex}];
    }

    const rows = await populateEnrollment(
      CustomerSellerProgram.find(query).sort({createdAt: -1}),
    );

    return res.status(200).json({
      success: true,
      message: 'CSP list fetched successfully.',
      enrollments: rows.map(toEnrollmentDto),
      // backward-compatible alias
      csps: rows.map(toEnrollmentDto),
    });
  } catch (error) {
    console.error('getCSP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch CSP enrollments.',
    });
  }
};

/**
 * POST /csp/enroll
 * Enroll an existing customer (or create one) and auto create/link Vendor.
 */
export const enrollCsp = async (req, res) => {
  try {
    const {
      customerId,
      vendorId,
      name,
      mobile,
      email,
      companyName,
      address,
      city,
      state,
      pincode,
      sellerSharePercent,
      platformSharePercent,
    } = req.body || {};

    let customer = null;
    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      customer = await Customer.findOne({
        _id: customerId,
        isDeleted: {$ne: true},
      });
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found.',
        });
      }
    } else {
      const mobileNorm = normalizeMobile(mobile);
      const nameNorm = String(name ?? '').trim();
      if (!nameNorm || !mobileNorm) {
        return res.status(400).json({
          success: false,
          message: 'customerId or (name + mobile) is required to enroll CSP.',
        });
      }

      customer = await Customer.findOne({
        mobile: mobileNorm,
        isDeleted: {$ne: true},
      });
      if (!customer) {
        return res.status(400).json({
          success: false,
          message:
            'Customer not found. Create the customer and activate Premium membership before CSP enrollment.',
        });
      }
    }

    try {
      assertPremiumForCsp(customer);
    } catch (premiumError) {
      return res.status(premiumError.status || 400).json({
        success: false,
        message: premiumError.message,
        membershipType: customer?.membershipType || 'none',
      });
    }

    const existingActive = await CustomerSellerProgram.findOne({
      customerId: customer._id,
      status: 'active',
    });
    if (existingActive) {
      const populated = await populateEnrollment(
        CustomerSellerProgram.findById(existingActive._id),
      );
      return res.status(409).json({
        success: false,
        message: 'Customer is already enrolled in CSP.',
        enrollment: toEnrollmentDto(populated),
      });
    }

    let vendor = null;
    if (vendorId && mongoose.Types.ObjectId.isValid(vendorId)) {
      vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found.',
        });
      }
    } else {
      const vendorMobile =
        normalizeMobile(customer.mobile) ||
        normalizeMobile(mobile) ||
        String(customer.mobile || '').trim();
      if (!vendorMobile) {
        return res.status(400).json({
          success: false,
          message: 'Valid mobile is required to link/create CSP vendor.',
        });
      }

      vendor = await Vendor.findOne({mobile: vendorMobile});
      if (!vendor) {
        // Also try exact customer mobile string
        vendor = await Vendor.findOne({
          mobile: String(customer.mobile || '').trim(),
        });
      }
      if (!vendor) {
        vendor = await Vendor.create({
          name: String(customer.name || name || 'CSP Sailor').trim(),
          mobile: vendorMobile,
          email: String(customer.email || email || '').trim(),
          companyName: String(customer.companyName || companyName || '').trim(),
          address: String(customer.address || address || '').trim(),
          city: String(customer.city || city || '').trim(),
          state: String(customer.state || state || '').trim(),
          pincode: String(customer.pincode || pincode || '').trim(),
          country: 'India',
          notes: 'Auto-created for Customer Sailor Program (CSP)',
        });
      }
    }

    const vendorActive = await CustomerSellerProgram.findOne({
      vendorId: vendor._id,
      status: 'active',
    });
    if (vendorActive) {
      return res.status(409).json({
        success: false,
        message: 'Vendor is already linked to another active CSP enrollment.',
      });
    }

    const sellerShare = Number.isFinite(Number(sellerSharePercent))
      ? Number(sellerSharePercent)
      : getSellerSharePercent();
    const platformShare = Number.isFinite(Number(platformSharePercent))
      ? Number(platformSharePercent)
      : getPlatformSharePercent();

    const enrollment = await CustomerSellerProgram.create({
      customerId: customer._id,
      vendorId: vendor._id,
      status: 'active',
      sellerSharePercent: sellerShare,
      platformSharePercent: platformShare,
      displayName: String(customer.name || '').trim(),
      mobile: String(customer.mobile || '').trim(),
    });

    const populated = await populateEnrollment(
      CustomerSellerProgram.findById(enrollment._id),
    );

    return res.status(201).json({
      success: true,
      message: 'CSP sailor enrolled successfully.',
      enrollment: toEnrollmentDto(populated),
    });
  } catch (error) {
    console.error('enrollCsp error:', error);
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'CSP enrollment already exists for this customer or vendor.',
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to enroll CSP sailor.',
    });
  }
};

/**
 * PATCH /csp/:id
 * Activate / deactivate or update share percents / display.
 */
export const updateCsp = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CSP enrollment id.',
      });
    }

    const enrollment = await CustomerSellerProgram.findById(id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'CSP enrollment not found.',
      });
    }

    const {
      status,
      sellerSharePercent,
      platformSharePercent,
      displayName,
      mobile,
    } = req.body || {};

    if (status !== undefined) {
      const next = String(status).trim().toLowerCase();
      if (!['active', 'inactive'].includes(next)) {
        return res.status(400).json({
          success: false,
          message: 'status must be active or inactive.',
        });
      }
      if (next === 'active') {
        const customer = await Customer.findOne({
          _id: enrollment.customerId,
          isDeleted: {$ne: true},
        }).select('membershipType name');
        try {
          assertPremiumForCsp(customer);
        } catch (premiumError) {
          return res.status(premiumError.status || 400).json({
            success: false,
            message: premiumError.message,
            membershipType: customer?.membershipType || 'none',
          });
        }

        const clashCustomer = await CustomerSellerProgram.findOne({
          _id: {$ne: enrollment._id},
          customerId: enrollment.customerId,
          status: 'active',
        });
        if (clashCustomer) {
          return res.status(409).json({
            success: false,
            message: 'Another active CSP enrollment exists for this customer.',
          });
        }
        const clashVendor = await CustomerSellerProgram.findOne({
          _id: {$ne: enrollment._id},
          vendorId: enrollment.vendorId,
          status: 'active',
        });
        if (clashVendor) {
          return res.status(409).json({
            success: false,
            message: 'Another active CSP enrollment exists for this vendor.',
          });
        }
      }
      enrollment.status = next;
    }

    if (sellerSharePercent !== undefined) {
      const n = Number(sellerSharePercent);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return res.status(400).json({
          success: false,
          message: 'sellerSharePercent must be 0–100.',
        });
      }
      enrollment.sellerSharePercent = n;
    }

    if (platformSharePercent !== undefined) {
      const n = Number(platformSharePercent);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return res.status(400).json({
          success: false,
          message: 'platformSharePercent must be 0–100.',
        });
      }
      enrollment.platformSharePercent = n;
    }

    if (displayName !== undefined) {
      enrollment.displayName = String(displayName ?? '').trim();
    }
    if (mobile !== undefined) {
      enrollment.mobile = String(mobile ?? '').trim();
    }

    await enrollment.save();
    const populated = await populateEnrollment(
      CustomerSellerProgram.findById(enrollment._id),
    );

    return res.status(200).json({
      success: true,
      message: 'CSP enrollment updated successfully.',
      enrollment: toEnrollmentDto(populated),
    });
  } catch (error) {
    console.error('updateCsp error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update CSP enrollment.',
    });
  }
};

/** @deprecated Use enrollCsp — kept for older clients that posted name/phone only. */
export const postCsp = enrollCsp;
