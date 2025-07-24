import { Router } from "express";
import {
  register,
  login,
  logout,
  getCurrentUser,
  updateUser,
  changePassword,
  listAllUsers,
  updateUserRole,
  deleteUser,
} from "../controllers/user.controller.js";
import { isAuthenticated, isAuthorized } from "../middlewares/auth.js";

const router = Router();

// Public routes
router.route("/register").post(register);
router.route("/login").post(login);

// Protected routes (any authenticated user)
router.route("/logout").post(isAuthenticated, logout);
router.route("/profile").get(isAuthenticated, getCurrentUser);
router.route("/profile").put(isAuthenticated, updateUser);
router.route("/change-password").put(isAuthenticated, changePassword);

// Admin-only routes
router.route("/users").get(isAuthenticated, isAuthorized("admin"), listAllUsers);
router.route("/users/role").put(isAuthenticated, isAuthorized("admin"), updateUserRole);
router.route("/users/:userId").delete(isAuthenticated, isAuthorized("admin"), deleteUser);

export default router;
