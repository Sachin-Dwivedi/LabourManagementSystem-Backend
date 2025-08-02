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

import { isAuthenticated, isAuthorized } from "../middlewares/auth.js";

const router = Router();

router.post(
  "/",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  createPerformanceRecord
);

router.put(
  "/:id",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  updatePerformanceRecord
);

router.get("/:id", isAuthenticated, getPerformanceById);

router.get("/", isAuthenticated, listPerformanceRecords);

router.get("/labourer/:labourerId", isAuthenticated, getPerformanceByLabourer);

router.get("/project/:projectId", isAuthenticated, getPerformanceByProject);

router.delete(
  "/:id",
  isAuthenticated,
  isAuthorized("admin"),
  deletePerformanceRecord
);

export default router;
