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

import { isAuthenticated, isAuthorized } from "../middlewares/auth.js";

const router = Router();

router.post("/apply", isAuthenticated, isAuthorized("labourer"), applyForLeave);

router.patch(
  "/:id/approve",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  approveLeave
);

router.patch(
  "/:id/reject",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  rejectLeave
);

router.get("/labourer/:labourerId", isAuthenticated, getLeaveStatusByLabourer);

router.get(
  "/",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  listLeaveRequests
);

router.delete(
  "/:id/cancel",
  isAuthenticated,
  isAuthorized("labourer"),
  cancelLeaveRequest
);

router.put(
  "/:id/remark",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  addRemarkToLeaveRequest
);

export default router;
