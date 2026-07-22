import mongoose from 'mongoose';
import Customer from '../models/customer.model.js';
import Wallet from '../models/wallet.model.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localUploadsDir = path.resolve(__dirname, '../../uploads/customers');
const tmpUploadsDir = path.join('/tmp', 'uploads', 'customers');

let uploadsDir = localUploadsDir;
try {
  fs.mkdirSync(localUploadsDir, {recursive: true});
} catch (error) {
  // Fallback for read-only runtime filesystems (common in serverless envs).
  fs.mkdirSync(tmpUploadsDir, {recursive: true});
  uploadsDir = tmpUploadsDir;
}

// Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + '-' + file.originalname.replace(/\s+/g, '');
    cb(null, uniqueName);
  },
});

// File filter (only images)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const isValid = allowedTypes.test(file.mimetype);

  if (isValid) cb(null, true);
  else cb(new Error('Only image files allowed'), false);
};

export const uploadCustomerImage = multer({
  storage,
  fileFilter,
  limits: {fileSize: 2 * 1024 * 1024}, // 2MB
});

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const validMemberships = [
  'none',
  'pro',
  'premium',
  'special',
  'junior',
  'general',
];

const validGenders = ['male', 'female', 'other', ''];

const createCustomer = async (req, res) => {
  try {
    const {
      name,
      mobile,
      email,
      gstin,
      companyName,
      address,
      pincode,
      city,
      state,
      country,
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
      membershipType
    } = req.body;
    console.log(req.body);

    if (!name || !mobile) {
      return res.status(400).json({
        success: false,
        message: 'Name and mobile are required.',
      });
    }

    if (!/^[6-9]\d{9}$/.test(String(mobile).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number',
      });
    }

    const membership = (membershipType || 'none').toLowerCase()||'none';
    if (!validMemberships.includes(membership)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid membership type.',
      });
    }

    if (adharNumber && !/^\d{12}$/.test(String(adharNumber).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Aadhar number',
      });
    }

    const panNorm = panNumber ? String(panNumber).trim().toUpperCase() : '';
    if (panNorm && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNorm)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PAN number',
      });
    }

    const genderVal = String(gender ?? '').trim().toLowerCase();
    const genderNorm =
      genderVal === ''
        ? ''
        : validGenders.includes(genderVal)
          ? genderVal
          : null;
    if (genderNorm === null) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gender value.',
      });
    }

    let profileImage = req.file
      ? `/uploads/customers/${req.file.filename}`
      : '';

    if (req.file) {
      const cloudinaryUrl = await uploadOnCloudinary(req.file.path);
      if (cloudinaryUrl) {
        profileImage = cloudinaryUrl;
      }
    }

    const customer = await Customer.create({
      name: String(name).trim(),
      mobile: String(mobile).trim(),
      email: String(email ?? '').trim(),
      gstin: String(gstin ?? '').trim(),
      companyName: String(companyName ?? '').trim(),
      address: String(address ?? '').trim(),
      pincode: String(pincode ?? '').trim(),
      city: String(city ?? '').trim(),
      state: String(state ?? '').trim(),
      country: String(country ?? '').trim(),

      membershipType: membership,

      adharNumber: String(adharNumber ?? '').trim(),
      dob: dob ? new Date(dob) : null,
      gender: genderNorm,
      whatsappNumber: String(whatsappNumber ?? '').trim(),
      AlternateMobile: String(AlternateMobile ?? '').trim(),

      IFSCcode: String(IFSCcode ?? '').trim(),
      bankName: String(bankName ?? '').trim(),
      branchName: String(branchName ?? '').trim(),
      accountNumber: String(accountNumber ?? '').trim(),
      panNumber: panNorm,
      accountHolderName: String(accountHolderName ?? '').trim(),
      UPIID: String(UPIID ?? '').trim(),

      profileImage,

      createdBy: {
        m_staff_id: req.user?.userId ?? null,
        m_staff_name: req.user?.m_staff_name ?? null,
        m_staff_email: req.user?.m_staff_email ?? null,
      },
    });

    // Automatically create a wallet for the customer and credit ₹25 joining bonus
    await Wallet.create({
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.mobile,
      walletAmount: 25,
      transactions: [{
        type: "credit",
        amount: 25,
        note: "Joining Bonus",
        referenceType: "JoiningBonus",
        closingBalance: 25,
        createdBy: {
          m_staff_id: req.user?.userId ?? null,
          m_staff_name: req.user?.m_staff_name ?? req.user?.name ?? null,
          m_staff_email: req.user?.m_staff_email ?? req.user?.email ?? null,
        }
      }]
    });

    // Sync walletAmount and closingBalance in the Customer document
    const updatedCustomer = await Customer.findByIdAndUpdate(
      customer._id,
      {
        $set: {
          walletAmount: 25,
          closingBalance: 25,
        },
      },
      { new: true }
    );

    return res.status(201).json({
      success: true,
      message: 'Customer created successfully with ₹25 Joining Bonus credited to wallet.',
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error('createCustomer error:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A customer with this mobile number already exists.',
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create customer.',
    });
  }
};

const getCustomers = async (req, res) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
    const query = {};

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        {name: regex},
        {mobile: regex},
        {email: regex},
        {companyName: regex},
        {gstin: regex},
        {referralCode: regex},
      ];
    }

    const customers = await Customer.find(query)
      .sort({createdAt: -1})
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: 'Customers fetched successfully.',
      customers,
    });
  } catch (error) {
    console.error('getCustomers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customers.',
    });
  }
};

const editCustomer = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid customer id.'});
    }

    const existing = await Customer.findById(id);
    if (!existing) {
      return res.status(404).json({success: false, message: 'Customer not found.'});
    }

    const b = req.body;
    const update = {};

    if (b.name !== undefined) {
      if (!String(b.name).trim()) {
        return res.status(400).json({success: false, message: 'Name cannot be empty.'});
      }
      update.name = String(b.name).trim();
    }
    if (b.mobile !== undefined) {
      const m = String(b.mobile).trim();
      if (!/^[6-9]\d{9}$/.test(m)) {
        return res.status(400).json({success: false, message: 'Invalid mobile number.'});
      }
      update.mobile = m;
    }
    if (b.email !== undefined) update.email = String(b.email ?? '').trim();
    if (b.gstin !== undefined) update.gstin = String(b.gstin ?? '').trim();
    if (b.companyName !== undefined) {
      update.companyName = String(b.companyName ?? '').trim();
    }
    if (b.address !== undefined) update.address = String(b.address ?? '').trim();
    if (b.pincode !== undefined) update.pincode = String(b.pincode ?? '').trim();
    if (b.city !== undefined) update.city = String(b.city ?? '').trim();
    if (b.state !== undefined) update.state = String(b.state ?? '').trim();
    if (b.country !== undefined) update.country = String(b.country ?? '').trim();

    if (b.membershipType !== undefined) {
      const membership = String(b.membershipType).toLowerCase();
      if (!validMemberships.includes(membership)) {
        return res.status(400).json({success: false, message: 'Invalid membership type.'});
      }
      update.membershipType = membership;
    }

    if (b.adharNumber !== undefined) {
      const a = String(b.adharNumber ?? '').trim();
      if (a && !/^\d{12}$/.test(a)) {
        return res.status(400).json({success: false, message: 'Invalid Aadhar number.'});
      }
      update.adharNumber = a;
    }
    if (b.dob !== undefined) {
      update.dob = b.dob ? new Date(b.dob) : null;
    }
    if (b.gender !== undefined) {
      const genderVal = String(b.gender ?? '').trim().toLowerCase();
      if (genderVal !== '' && !validGenders.includes(genderVal)) {
        return res.status(400).json({success: false, message: 'Invalid gender value.'});
      }
      update.gender = genderVal;
    }
    if (b.whatsappNumber !== undefined) {
      update.whatsappNumber = String(b.whatsappNumber ?? '').trim();
    }
    if (b.AlternateMobile !== undefined) {
      update.AlternateMobile = String(b.AlternateMobile ?? '').trim();
    }

    if (b.IFSCcode !== undefined) update.IFSCcode = String(b.IFSCcode ?? '').trim();
    if (b.bankName !== undefined) update.bankName = String(b.bankName ?? '').trim();
    if (b.branchName !== undefined) update.branchName = String(b.branchName ?? '').trim();
    if (b.accountNumber !== undefined) {
      update.accountNumber = String(b.accountNumber ?? '').trim();
    }
    if (b.panNumber !== undefined) {
      const panNorm = String(b.panNumber ?? '').trim().toUpperCase();
      if (panNorm && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNorm)) {
        return res.status(400).json({success: false, message: 'Invalid PAN number.'});
      }
      update.panNumber = panNorm;
    }
    if (b.accountHolderName !== undefined) {
      update.accountHolderName = String(b.accountHolderName ?? '').trim();
    }
    if (b.UPIID !== undefined) update.UPIID = String(b.UPIID ?? '').trim();

    if (req.file) {
      const cloudinaryUrl = await uploadOnCloudinary(req.file.path);
      if (cloudinaryUrl) {
        update.profileImage = cloudinaryUrl;
      } else {
        update.profileImage = `/uploads/customers/${req.file.filename}`;
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update.',
      });
    }

    const customer = await Customer.findByIdAndUpdate(id, {$set: update}, {new: true});

    return res.status(200).json({
      success: true,
      message: 'Customer updated successfully.',
      customer,
    });
  } catch (error) {
    console.error('editCustomer error:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A customer with this mobile number already exists.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to update customer.',
    });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const {id} = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid customer id.'});
    }

    const deletedCustomer = await Customer.findByIdAndDelete(id);

    if (!deletedCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    console.error('deleteCustomer error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete customer',
    });
  }
};

export {createCustomer, getCustomers, editCustomer, deleteCustomer};
