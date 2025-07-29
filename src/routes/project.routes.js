import { Router } from "express";
import {
  createProject,
  updateProject,
  getAllProjects,
  getProjectById,
  assignLabourersToProject,
  changeProjectManager,
  deleteProject,
  changeProjectStatus,
  searchProjects,
  listProjectsByManager,
  listProjectsByLabourer,
} from "../controllers/project.controller.js";
import { isAuthenticated, isAuthorized } from "../middlewares/auth.js";

const router = Router();

router.post("/", isAuthenticated, isAuthorized("admin", "manager"), createProject);
router.get("/", isAuthenticated, getAllProjects);
router.get("/search", isAuthenticated, searchProjects);
router.get("/manager/:managerId", isAuthenticated, listProjectsByManager);
router.get("/labourer/:labourerId", isAuthenticated, listProjectsByLabourer);
router.get("/:id", isAuthenticated, getProjectById);
router.put("/:id", isAuthenticated, isAuthorized("admin", "manager"), updateProject);
router.put("/:id/labourers", isAuthenticated, isAuthorized("admin", "manager"), assignLabourersToProject);
router.put("/:id/manager", isAuthenticated, isAuthorized("admin", "manager"), changeProjectManager);
router.patch("/:id/status", isAuthenticated, isAuthorized("admin", "manager"), changeProjectStatus);
router.delete("/:id", isAuthenticated, isAuthorized("admin", "manager"), deleteProject);

export default router;
