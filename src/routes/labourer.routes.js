import { Router } from "express";
import upload from "../middlewares/multer.js";

import {
  createLabourer,
  getLabourerById,
  listLabourers,
  updateLabourer,
  deleteLabourer,
  assignLabourerToProject,
  changeLabourerStatus,
  searchLabourers,
  listLabourersByProject,
  attendanceSummary,
} from "../controllers/labourer.controller.js";

import { isAuthenticated, isAuthorized } from "../middlewares/auth.js";

const router = Router();

router.post("/", isAuthenticated, isAuthorized("admin", "manager"), createLabourer);
router.get("/", isAuthenticated, isAuthorized("admin", "manager"), listLabourers);
router.get("/search", isAuthenticated, isAuthorized("admin", "manager"), searchLabourers);
router.get("/project/:projectId", isAuthenticated, isAuthorized("admin", "manager"), listLabourersByProject);
router.get("/:id", isAuthenticated, isAuthorized("admin", "manager"), getLabourerById);
router.put("/:id", isAuthenticated, isAuthorized("admin", "manager"), updateLabourer);
router.delete("/:id", isAuthenticated, isAuthorized("admin", "manager"), deleteLabourer);
router.patch("/:id/status", isAuthenticated, isAuthorized("admin", "manager"), changeLabourerStatus);
router.put("/:labourerId/project", isAuthenticated, isAuthorized("admin", "manager"), assignLabourerToProject);
//router.put("/:id/profile-photo", isAuthenticated, isAuthorized("admin", "manager"), upload.single("photo"), updateProfilePhoto);
router.get("/:labourerId/attendance-summary", isAuthenticated, isAuthorized("admin", "manager"), attendanceSummary);

export default router;
