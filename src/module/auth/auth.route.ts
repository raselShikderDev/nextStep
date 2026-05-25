import { Router } from "express";
import authCheck from "@/middleware/checkAuth";
import { Role } from "../../../prisma/generated/prisma/enums";
import { AuthControllers } from "./auth.controller";

const router = Router();

// Register user
router.post("/register", AuthControllers.registerUser);

// Login User
router.post("/login", AuthControllers.loginUser);

// LogOut User
router.post("/logout", AuthControllers.logoutUser);

// Send otp for reseting password after forgetting
router.post("/forgot-password", AuthControllers.forgotPassword);

// Reset password after forgeting
router.post(
	"/reset-password",
	authCheck(...Object.values(Role)),
	AuthControllers.resetPassword,
);

// Chnage password - For logged in user
router.post(
	"/change-password",
	authCheck(...Object.values(Role)),
	AuthControllers.changePassword,
);

export const authRouter = router;
