import express from "express";
import {
    getSubCategories,
    addSubCategories,
    updateSubCategories,
    deleteSubCategory,
} from "../controllers/subCategory.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", authenticateUser, getSubCategories);
router.post("/", authenticateUser, addSubCategories);
router.patch("/:id", authenticateUser, updateSubCategories);
router.delete("/:id", authenticateUser, deleteSubCategory);

export default router;