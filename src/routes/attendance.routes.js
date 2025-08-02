import { Router } from "express";
import {
  markAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceById,
  getAttendanceByLabourer,
  getAttendanceByProject,
  getAttendanceByDate,
  getLabourerAttendanceSummary,
  getProjectAttendanceSummary,
  bulkAddAttendance,
  bulkDownloadAttendance,
  dashboardStats,
} from "../controllers/attendance.controller.js";

import { isAuthenticated, isAuthorized } from "../middlewares/auth.js"; // Adjust paths as needed

const router = Router();

router.post(
  "/",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  markAttendance
);

router.put(
  "/:id",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  updateAttendance
);

router.delete("/:id", isAuthenticated, isAuthorized("admin"), deleteAttendance);

router.get("/labourer/:labourerId", isAuthenticated, getAttendanceByLabourer);

router.get("/project/:projectId", isAuthenticated, getAttendanceByProject);

router.get("/date", isAuthenticated, getAttendanceByDate);

router.get(
  "/download",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  bulkDownloadAttendance
);

router.get("/:id", isAuthenticated, getAttendanceById);

router.get(
  "/labourer/:labourerId/summary",
  isAuthenticated,
  getLabourerAttendanceSummary
);

router.get(
  "/project/:projectId/summary",
  isAuthenticated,
  getProjectAttendanceSummary
);

router.post(
  "/bulk",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  bulkAddAttendance
);

router.get(
  "/dashboard/stats",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  dashboardStats
);

export default router;
