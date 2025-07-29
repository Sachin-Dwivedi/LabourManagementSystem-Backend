import { Router } from "express";
import {
  createPerformanceRecord,
  updatePerformanceRecord,
  getPerformanceById,
  listPerformanceRecords,
  getPerformanceByLabourer,
  getPerformanceByProject,
  deletePerformanceRecord,
} from "../controllers/performance.controller.js";

import { isAuthenticated, isAuthorized } from "../middlewares/auth.js"; // Adjust import path as needed

const router = Router();

// Create a new performance record (manager/admin only)
router.post(
  "/",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  createPerformanceRecord
);

// Update an existing performance record by ID (manager/admin only)
router.put(
  "/:id",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  updatePerformanceRecord
);

// Get a single performance record by ID (authenticated users)
router.get("/:id", isAuthenticated, getPerformanceById);

// List all performance records with optional filters and pagination (authenticated users)
router.get("/", isAuthenticated, listPerformanceRecords);

// List performance records by labourer with filters (authenticated users)
router.get("/labourer/:labourerId", isAuthenticated, getPerformanceByLabourer);

// List performance records by project with filters (authenticated users)
router.get("/project/:projectId", isAuthenticated, getPerformanceByProject);

// Delete a performance record by ID (admin only)
router.delete(
  "/:id",
  isAuthenticated,
  isAuthorized("admin"),
  deletePerformanceRecord
);

export default router;
