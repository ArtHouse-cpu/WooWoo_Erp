import mongoose from "mongoose";
import Vendor from "../models/vendor.model.js";

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
    const vendor = await Vendor.create({
      name: String(name).trim(),
      mobile: String(mobile).trim(),

      email: String(email ?? "").trim(),
      gstin: String(gstin ?? "").trim(),
      companyName: String(companyName ?? "").trim(),

      address: String(address ?? "").trim(),
      pincode: String(pincode ?? "").trim(),

      city: String(city ?? "").trim(),
      state: String(state ?? "").trim(),
      country: String(country ?? "India").trim(),
      adharNumber: String(adharNumber ?? "").trim(),
      dob: dob || null,
      gender: String(gender ?? "").trim(),

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
 