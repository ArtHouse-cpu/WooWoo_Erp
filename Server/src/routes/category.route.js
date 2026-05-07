import express from "express";
import {
  getCategories,
  addCategories,
  updateCategories,
  deleteCategory,
} from "../controllers/category.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", authenticateUser, getCategories);
router.post("/", authenticateUser, addCategories);
router.patch("/", authenticateUser, updateCategories);
router.delete("/:id", authenticateUser, deleteCategory);

export default router;