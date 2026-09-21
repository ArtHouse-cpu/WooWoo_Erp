import mongoose from 'mongoose';
import Lead from '../models/lead.model.js';

export const getLead = async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });

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

    // Check valid MongoDB ID
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

    if (req.body.email !== undefined) {
      lead.email = req.body.email;
    }

    if (req.body.status !== undefined) {
      lead.status = req.body.status;
    }

    if (req.body.source !== undefined) {
      lead.source = req.body.source;
    }

    if (req.body.reasonNote !== undefined) {
      lead.reasonNote = req.body.reasonNote;
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
      email,
      status,
      source,
      reasonNote,
    } = req.body;

    // Name validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    // Phone OR Email validation
    if (
      (!phone || !phone.trim()) &&
      (!email || !email.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Either phone number or email is required",
      });
    }

    const lead = await Lead.create({
      name: name.trim(),
      phone: phone?.trim() || "",
      email: email?.trim() || "",
      status: status || "New",
      source: source?.trim() || "",
      reasonNote: reasonNote?.trim() || "",
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