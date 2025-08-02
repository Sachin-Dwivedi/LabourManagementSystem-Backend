import { Router } from "express";
import {
  createNotification,
  listNotificationsByUser,
  getNotificationById,
  updateNotificationStatus,
  deleteNotification,
} from "../controllers/notification.controller.js";

import { isAuthenticated, isAuthorized } from "../middlewares/auth.js";

const router = Router();

router.post(
  "/",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  createNotification
);

router.get("/", isAuthenticated, listNotificationsByUser);

router.get("/:id", isAuthenticated, getNotificationById);

router.patch("/:id/status", isAuthenticated, updateNotificationStatus);

router.delete("/:id", isAuthenticated, deleteNotification);

export default router;
