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

// Mark attendance (Create)
router.post("/", isAuthenticated, isAuthorized("admin", "manager"), markAttendance);

// Update attendance by ID
router.put("/:id", isAuthenticated, isAuthorized("admin", "manager"), updateAttendance);

// Delete attendance by ID
router.delete("/:id", isAuthenticated, isAuthorized("admin"), deleteAttendance);

// Get attendance by ID
router.get("/:id", isAuthenticated, getAttendanceById);


// List attendance by labourer
router.get("/labourer/:labourerId", isAuthenticated, getAttendanceByLabourer);

// List attendance by project
router.get("/project/:projectId", isAuthenticated, getAttendanceByProject);

// List attendance by date (must specify date)
router.get("/date", isAuthenticated, getAttendanceByDate);

// Labourer attendance summary (aggregated counts)
router.get("/labourer/:labourerId/summary", isAuthenticated, getLabourerAttendanceSummary);

// Project attendance summary (aggregated counts)
router.get("/project/:projectId/summary", isAuthenticated, getProjectAttendanceSummary);

// Bulk add attendance
router.post("/bulk", isAuthenticated, isAuthorized("admin", "manager"), bulkAddAttendance);

// Bulk download attendance as CSV
router.get("/download", isAuthenticated, isAuthorized("admin", "manager"), bulkDownloadAttendance);

// Dashboard summary stats for attendance
router.get("/dashboard/stats", isAuthenticated, isAuthorized("admin", "manager"), dashboardStats);

export default router;
 