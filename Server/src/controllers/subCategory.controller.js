import SubCategory from "../models/subCategory.model.js";

export const getSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find().sort({ name: 1 });
    return res.status(200).json({ success: true, subCategories });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addSubCategories = async (req, res) => {
  try {
    const { name, categoryId } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Sub category name is required" });
    }

    const created = await SubCategory.create({
      name: name.trim(),
      categoryId: categoryId?.trim?.() ?? "",
    });
    return res.status(201).json({ success: true, subCategory: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSubCategories = async (req, res) => {
  try {
    const id = req.params.id || req.body?._id;
    if (!id) {
      return res.status(400).json({ success: false, message: "Sub category id is required" });
    }

    const updated = await SubCategory.findByIdAndUpdate(id, req.body, { new: true });
    return res.status(200).json({ success: true, subCategory: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await SubCategory.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: "Sub category deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
