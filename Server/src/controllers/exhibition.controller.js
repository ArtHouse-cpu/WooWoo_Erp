import mongoose from 'mongoose';
import Exhibition from '../models/exhibition.model.js';

export const createExhibition = async (req, res) => {
  try {
    const passes = req.body;

    if (!Array.isArray(passes)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be an array',
      });
    }

    if (passes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one pass is required',
      });
    }

    const createdPasses = await Exhibition.insertMany(passes);

    return res.status(201).json({
      success: true,
      message: `${createdPasses.length} passes created successfully`,
      data: createdPasses,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

export const getExhibitionById = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid id'});
    }
    const exhibition = await Exhibition.findById(id).lean();
    if (!exhibition) {
      return res
        .status(404)
        .json({success: false, message: 'Exhibition not found'});
    }
    res.status(200).json({success: true ,message: 'Exhibition fetched successfully', exhibition});
  } catch (error) {
    res.status(500).json({success: false, message: error.message});
  }
};

export const updateExhibition = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid id'});
    }
    const updatedExhibition = await Exhibition.findByIdAndUpdate(
      id,
      {$set: req.body},
      {new: true},
    );
    res.status(200).json({
      success: true,
      message: 'Exhibition updated successfully',
    updatedExhibition});
  } catch (error) {
    res.status(500).json({success: false, message: error.message});
  }
};

export const getExhibitions = async (req, res) => {
  try {
    const exhibitions = await Exhibition.find().lean();
    res.status(200).json({
      success: true,
      message: 'Exhibitions fetched successfully',
    exhibitions});
  } catch (error) {
    res.status(500).json({success: false, message: error.message});
  }
};

export const deleteExhibition = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid id'});
    }
    const deletedExhibition = await Exhibition.findByIdAndDelete(id);
    res.status(200).json(
      {
        message: 'Exhibition deleted successfully',
    
      deletedExhibition,
      });
  } catch (error) {
    res.status(500).json({success: false, message: error.message});
  }
};
