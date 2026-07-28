import express from "express";
import {authenticateUser} from "../middlewares/auth.middleware.js";
import {
  attachStaffContext,
  requireAnyPermission,
} from "../middlewares/authorize.middleware.js";
import {PERMISSIONS} from "../constants/permissions.js";
import {enrollCsp, getCSP, updateCsp} from "../controllers/csp.controller.js";

const router = express.Router();

router.use(authenticateUser, attachStaffContext);

router.get(
  "/",
  requireAnyPermission(PERMISSIONS.CSP_READ, PERMISSIONS.CUSTOMER_READ),
  getCSP,
);
router.post(
  "/enroll",
  requireAnyPermission(PERMISSIONS.CSP_WRITE, PERMISSIONS.CUSTOMER_CREATE),
  enrollCsp,
);
router.post(
  "/",
  requireAnyPermission(PERMISSIONS.CSP_WRITE, PERMISSIONS.CUSTOMER_CREATE),
  enrollCsp,
);
router.patch(
  "/:id",
  requireAnyPermission(PERMISSIONS.CSP_WRITE, PERMISSIONS.CUSTOMER_UPDATE),
  updateCsp,
);

export default router;
