import { Router } from "express";
import { register, login, userDetail } from "../controllers/user.controller.js";
import { isAuthenticated,isAuthorized } from "../middlewares/auth.js";


const router = Router();

router.route("/userDetail").get(isAuthenticated, userDetail);
router.route("/register").post(register);
router.route("/login").post(login);

export default router;
