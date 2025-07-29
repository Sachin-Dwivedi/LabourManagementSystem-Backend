import { Router } from "express";
import {
  createNotification,
  listNotificationsByUser,
  getNotificationById,
  updateNotificationStatus,
  deleteNotification,
} from "../controllers/notification.controller.js";

import { isAuthenticated, isAuthorized } from "../middlewares/auth.js"; // Adjust path as needed

const router = Router();

// Create/send new notification (admin/manager only)
router.post(
  "/",
  isAuthenticated,
  isAuthorized("admin", "manager"),
  createNotification
);

// List all notifications for user(s) (authenticated users)
router.get("/", isAuthenticated, listNotificationsByUser);

// View notification details and status by ID (authenticated users)
router.get("/:id", isAuthenticated, getNotificationById);

// Update notification status (e.g., mark as sent/failed/read) (authenticated users or role-based as needed)
router.patch(
  "/:id/status",
  isAuthenticated,
  updateNotificationStatus
);

// Delete notification (soft delete) — user can delete own, admin can delete any
router.delete(
  "/:id",
  isAuthenticated,
  deleteNotification
);

export default router;
