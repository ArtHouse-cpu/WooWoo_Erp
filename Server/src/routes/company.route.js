import express from "express";
import { 
    createCompany, 
    getMyCompanies, 
    switchActiveCompany, 
    updateCompany 
} from "../controllers/company.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Apply authentication to all company routes
router.use(authenticateUser);

router.post("/", createCompany);
router.get("/", getMyCompanies);
router.patch("/switch", switchActiveCompany);
router.patch("/:id", updateCompany);

export default router;
