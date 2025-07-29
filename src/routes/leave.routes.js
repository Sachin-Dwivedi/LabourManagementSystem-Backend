import { Router } from "express";
import {
  applyForLeave,
  approveLeave,
  rejectLeave,
  getLeaveStatusByLabourer,
  listLeaveRequests,
  cancelLeaveRequest,
  addRemarkToLeaveRequest,
} from "../controllers/leave.controller.js";

import { isAuthenticated, isAuthorized } from "../middlewares/auth.js"; // Adjust import path

const router = Router();

// Labourer applies for leave
router.post(
  "/apply",
  isAuthenticated,
  isAuthorized("labourer"),
  applyForLeave
);

// Manager/Admin approves leave request
router.patch(
  "/:id/approve",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  approveLeave
);

// Manager/Admin rejects leave request
router.patch(
  "/:id/reject",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  rejectLeave
);

// View leave status/history for a labourer
router.get(
  "/labourer/:labourerId",
  isAuthenticated,
  getLeaveStatusByLabourer
);

// List all leave requests with filters (admin/manager)
router.get(
  "/",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  listLeaveRequests
);

// Labourer cancels their leave request (only pending allowed)
router.delete(
  "/:id/cancel",
  isAuthenticated,
  isAuthorized("labourer"),
  cancelLeaveRequest
);

// Manager/Admin adds remarks to a leave request
router.put(
  "/:id/remark",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  addRemarkToLeaveRequest
);

export default router;
