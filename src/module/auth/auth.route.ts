import { Router } from "express";
import authCheck from "@/middleware/checkAuth";
import requestZodValidator from "@/middleware/requestZodValidator";
import { Role } from "../../../prisma/generated/prisma/enums";
import { AuthControllers } from "./auth.controller";
import {
	changePasswordValidationSchema,
	forgotPasswordValidationSchema,
	loginValidationSchema,
	registerValidationSchema,
	resetPasswordValidationSchema,
} from "./auth.validation";

const router = Router();

// Register user
router.post(
	"/register",
	requestZodValidator(registerValidationSchema),
	AuthControllers.registerUser,
);

// Login User
router.post(
	"/login",
	requestZodValidator(loginValidationSchema),
	AuthControllers.loginUser,
);

// LogOut User
router.post(
	"/logout",
	authCheck(...Object.values(Role)),
	AuthControllers.logoutUser,
);

// Send otp for reseting password after forgetting
router.post(
	"/forgot-password",
	requestZodValidator(forgotPasswordValidationSchema),
	AuthControllers.forgotPassword,
);

// Reset password after forgeting
router.post(
	"/reset-password",
	requestZodValidator(resetPasswordValidationSchema),
	authCheck(...Object.values(Role)),
	AuthControllers.resetPassword,
);

// Chnage password - For logged in user
router.post(
	"/change-password",
	requestZodValidator(changePasswordValidationSchema),
	authCheck(...Object.values(Role)),
	AuthControllers.changePassword,
);

router.post("/refresh-token", AuthControllers.refreshToken);

export const authRouter = router;
