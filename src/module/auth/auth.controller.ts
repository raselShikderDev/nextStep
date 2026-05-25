import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "@/errorHelper/appError";
import asyncHelper from "@/middleware/asyncHelper";
import { sendResponse } from "@/utils/response";
import { removeCookie, setAuthCookie } from "@/utils/setCookie";
import { AuthServices } from "./auth.service";
import {
	loginValidationSchema,
	registerValidationSchema,
} from "./auth.validation";

// Register user
const registerUser = asyncHelper(async (req: Request, res: Response) => {
	const validatedData = registerValidationSchema.parse(req.body);

	const result = await AuthServices.registerUser(validatedData);

	sendResponse(res, {
		statusCode: 201,
		success: true,
		message: "User registered successfully",
		data: result,
	});
});

// Login User
const loginUser = asyncHelper(async (req: Request, res: Response) => {
	const validatedData = loginValidationSchema.parse(req.body);
	const result = await AuthServices.loginUser(validatedData);

	if (result.accessToken || result.refreshToken) {
		await setAuthCookie(res, {
			accessToken: result.accessToken,
			refreshToken: result.refreshToken,
		});
	} else {
		throw new AppError(StatusCodes.FORBIDDEN, "Login unsuccessful");
	}
	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Login successful",
		data: result,
	});
});

// Logout user by deleting accessToken and refreshToken from cookies
const logoutUser = asyncHelper(
	async (_req: Request, res: Response, _next: NextFunction) => {
		await removeCookie(res);
		sendResponse(res, {
			statusCode: StatusCodes.OK,
			success: true,
			message: "User successfully logout",
			data: null,
		});
	},
);

// Send otp for reseting password after forgetting
const forgotPassword = asyncHelper(async (req: Request, res: Response) => {
	const data = await AuthServices.forgotPassword(req.body.email);

	let message = "OTP sent successfully";
	let statusCode = 200;
	let success = true;

	if (data?.error) {
		message = data?.error.message;
		statusCode = data.error.statusCode as number;
		success = data?.data !== null;
	}

	sendResponse(res, {
		statusCode,
		success,
		message,
	});
});

// Reset password after forgeting
const resetPassword = asyncHelper(async (req: Request, res: Response) => {
	await AuthServices.resetPassword(req.body);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Password reset successful",
	});
});

// Chnage password - For logged in user
const changePassword = asyncHelper(async (req: Request, res: Response) => {
	await AuthServices.changePassword(req.user.id as string, req.body);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Password changed successfully",
	});
});

export const AuthControllers = {
	registerUser,
	loginUser,
	logoutUser,
	forgotPassword,
	resetPassword,
	changePassword,
};
