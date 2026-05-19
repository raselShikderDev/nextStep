import { Router } from "express";
import { AuthControllers } from "./auth.controller";

const router = Router();

// Register user
router.post("/register", AuthControllers.registerUser);

// Login User
router.post("/login", AuthControllers.loginUser);

// Send otp for reseting password after forgetting
router.post(
	"/forgot-password",
	AuthControllers.forgotPassword,
);

// Reset password after forgeting
router.post(
	"/reset-password",
	AuthControllers.resetPassword,
);

// Chnage password - For logged in user
router.post(
	"/change-password",
	AuthControllers.changePassword,
);

export const authRouter = router;
