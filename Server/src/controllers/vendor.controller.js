import mongoose from "mongoose";
import Vendor from "../models/vendor.model.js";

const normalizeVendorGender = raw => {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!value || value === 'not specified' || value === 'n/a' || value === 'na') {
    return '';
  }
  if (value === 'male') return 'Male';
  if (value === 'female') return 'Female';
  if (value === 'other') return 'Other';
  if (['Male', 'Female', 'Other', ''].includes(String(raw ?? '').trim())) {
    return String(raw).trim();
  }
  return '';
};

const normalizeMobile = raw => {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const digits = String(Math.trunc(Math.abs(raw)));
    return digits.length > 10 ? digits.slice(-10) : digits;
  }
  const text = String(raw ?? '').trim();
  if (!text) return '';
  if (/e[+-]?\d+/i.test(text)) {
    const asNum = Number(text);
    if (Number.isFinite(asNum)) return normalizeMobile(asNum);
  }
  const digits = text.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const asTrimmed = (raw, fallback = '') => {
  const text = String(raw ?? '').trim();
  if (!text || /^none$/i.test(text) || text === '-') return fallback;
  return text;
};

const asNumber = (raw, fallback = 0) => {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const text = String(raw ?? '')
    .trim()
    .replace(/[,₹\s]/g, '');
  if (!text || /^none$/i.test(text) || text === '-') return fallback;
  const num = Number(text);
  return Number.isFinite(num) ? num : fallback;
};

/** "22-CHATTISGARH" → "CHATTISGARH" (keeps plain state names as-is) */
const normalizeState = raw => {
  const text = asTrimmed(raw);
  if (!text) return '';
  const match = text.match(/^\d+\s*[-–]\s*(.+)$/);
  return (match?.[1] || text).trim();
};

const joinAddress = (line1, line2) =>
  [asTrimmed(line1), asTrimmed(line2)].filter(Boolean).join(', ');

export const getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, vendors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid vendor id." });
    }
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found." });
    }
    return res.status(200).json({ success: true, vendor });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createVendor = async (req, res) => {
  try {
    const {
      name,
      mobile,
      email,
      gstin,
      companyName,
      address,
      billingAddress1,
      billingAddress2,
      pincode,
      city,
      state,
      country,
      openingBalance,
      debitLimit,
      defaultDueDays,
      closingBalance,
      netBalance,
      notes,
      adharNumber,
      dob,
      gender,
      whatsappNumber,
      AlternateMobile,
      IFSCcode,
      bankName,
      branchName,
      accountNumber,
      panNumber,
      accountHolderName,
      UPIID,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vendor name is required.",
      });
    }

    if (!mobile?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required.",
      });
    }
    const existingVendor = await Vendor.findOne({
      mobile: String(mobile).trim(),
    });

    if (existingVendor) {
      return res.status(409).json({
        success: false,
        message: "Vendor with this mobile number already exists.",
      });
    }

    const line1 = asTrimmed(billingAddress1 ?? address);
    const line2 = asTrimmed(billingAddress2);
    const opening = asNumber(openingBalance, 0);
    const net = asNumber(netBalance, opening);
    const closing = asNumber(closingBalance, net);

    const vendor = await Vendor.create({
      name: String(name).trim(),
      mobile: String(mobile).trim(),

      email: String(email ?? "").trim(),
      gstin: String(gstin ?? "").trim(),
      companyName: String(companyName ?? "").trim(),

      address: joinAddress(line1, line2) || asTrimmed(address),
      billingAddress1: line1,
      billingAddress2: line2,
      pincode: asTrimmed(pincode),

      city: asTrimmed(city),
      state: normalizeState(state),
      country: asTrimmed(country, "India"),

      openingBalance: opening,
      debitLimit: asNumber(debitLimit, 0),
      defaultDueDays: asNumber(defaultDueDays, -1),
      closingBalance: closing,
      netBalance: net,
      notes: asTrimmed(notes),

      adharNumber: String(adharNumber ?? "").trim(),
      dob: dob || null,
      gender: normalizeVendorGender(gender),

      whatsappNumber: String(whatsappNumber ?? "").trim(),
      AlternateMobile: String(AlternateMobile ?? "").trim(),

      IFSCcode: String(IFSCcode ?? "").trim(),
      bankName: String(bankName ?? "").trim(),
      branchName: String(branchName ?? "").trim(),

      accountNumber: String(accountNumber ?? "").trim(),
      accountHolderName: String(accountHolderName ?? "").trim(),

      panNumber: String(panNumber ?? "").trim(),
      UPIID: String(UPIID ?? "").trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Vendor created successfully.",
      vendor,
    });
  } catch (error) {
    console.error("Create Vendor Error:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate entry found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const importVendors = async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.vendors) ? req.body.vendors : [];
    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: 'No vendors provided for import.',
      });
    }

    const summary = {
      total: rows.length,
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };
    const createdVendors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      const rowNo = i + 2;

      try {
        const companyName = asTrimmed(row.companyName ?? row.company);
        const name = asTrimmed(row.name) || companyName;
        const email = asTrimmed(row.email ?? row.mail).toLowerCase();
        const mobile = normalizeMobile(
          row.mobile ?? row.phone ?? row.Phone ?? row.number,
        );
        const gstin = asTrimmed(row.gstin ?? row.gst).toUpperCase();
        const billingAddress1 = asTrimmed(
          row.billingAddress1 ??
            row.billing_address_1 ??
            row.address1 ??
            row.address,
        );
        const billingAddress2 = asTrimmed(
          row.billingAddress2 ?? row.billing_address_2 ?? row.address2,
        );
        const city = asTrimmed(row.city ?? row.billingCity);
        const state = normalizeState(row.state ?? row.billingState);
        const pincode = asTrimmed(row.pincode ?? row.billingPincode);
        const country = asTrimmed(
          row.country ?? row.billingCountry,
          'India',
        );
        const openingBalance = asNumber(
          row.openingBalance ?? row.OpeningBalance,
          0,
        );
        const debitLimit = asNumber(row.debitLimit ?? row.DebitLimit, 0);
        const defaultDueDays = asNumber(
          row.defaultDueDays ?? row.defaultDueDate ?? row.DefaultDueDate,
          -1,
        );
        const netBalance = asNumber(
          row.netBalance ?? row.NetBalance,
          openingBalance,
        );
        const closingBalance = asNumber(
          row.closingBalance ?? row.netBalance ?? row.NetBalance,
          netBalance,
        );
        const notes = asTrimmed(row.notes ?? row.Notes);

        if (!mobile) {
          summary.failed += 1;
          summary.errors.push({
            row: rowNo,
            message: 'Phone/mobile is required.',
          });
          continue;
        }

        if (!name) {
          summary.failed += 1;
          summary.errors.push({
            row: rowNo,
            message: 'Name or Company is required.',
          });
          continue;
        }

        if (!/^[6-9]\d{9}$/.test(mobile)) {
          summary.failed += 1;
          summary.errors.push({
            row: rowNo,
            message: `Invalid mobile: ${mobile}`,
          });
          continue;
        }

        const exists = await Vendor.findOne({mobile}).select('_id');
        if (exists) {
          summary.skipped += 1;
          summary.errors.push({
            row: rowNo,
            message: `Duplicate mobile skipped: ${mobile}`,
          });
          continue;
        }

        const vendor = await Vendor.create({
          name,
          mobile,
          email,
          companyName: companyName || name,
          gstin,
          billingAddress1,
          billingAddress2,
          address: joinAddress(billingAddress1, billingAddress2),
          city,
          state,
          pincode,
          country,
          openingBalance,
          debitLimit,
          defaultDueDays,
          closingBalance,
          netBalance,
          notes,
          gender: '',
        });

        summary.created += 1;
        createdVendors.push(vendor);
      } catch (error) {
        summary.failed += 1;
        summary.errors.push({
          row: rowNo,
          message:
            error?.code === 11000
              ? 'Duplicate mobile'
              : error?.message || 'Failed to import row',
        });
      }
    }

    return res.status(200).json({
      success: summary.created > 0,
      message: `Import finished. Created ${summary.created}, skipped ${summary.skipped}, failed ${summary.failed}.`,
      summary,
      vendors: createdVendors,
    });
  } catch (error) {
    console.error('importVendors error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to import vendors.',
    });
  }
};

export const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid vendor id." });
    }
    const vendor = await Vendor.findByIdAndUpdate(id, { $set: req.body }, { new: true });
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found." });
    }
    return res.status(200).json({ success: true, vendor });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid vendor id." });
    }
    const vendor = await Vendor.findByIdAndDelete(id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found." });
    }
    return res.status(200).json({ success: true, message: "Vendor deleted successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 