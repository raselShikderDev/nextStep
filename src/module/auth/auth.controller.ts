import type { Request, Response } from "express";
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
		statusCode: StatusCodes.CREATED,
		success: true,
		message: "User registered successfully",
		data: result,
	});
});

// Login User
const loginUser = asyncHelper(async (req: Request, res: Response) => {
	const validatedData = loginValidationSchema.parse(req.body);
	const result = await AuthServices.loginUser(validatedData);

	if (!result.accessToken || !result.refreshToken) {
		throw new AppError(StatusCodes.FORBIDDEN, "Login unsuccessful");
	}

	await setAuthCookie(res, {
		accessToken: result.accessToken,
		refreshToken: result.refreshToken,
	});

	sendResponse(res, {
		statusCode: StatusCodes.OK,
		success: true,
		message: "Login successful",
		data: result,
	});
});

// Logout user and revoke refresh token
const logoutUser = asyncHelper(async (req: Request, res: Response) => {
	const refreshToken = req.cookies?.refreshToken;

	await AuthServices.logoutUser(refreshToken);

	await removeCookie(res);

	sendResponse(res, {
		statusCode: StatusCodes.OK,
		success: true,
		message: "User successfully logout",
		data: null,
	});
});

// Send OTP for resetting password after forgetting
const forgotPassword = asyncHelper(async (req: Request, res: Response) => {
	const data = await AuthServices.forgotPassword(req.body.email);

	let message = "OTP sent successfully";
	let statusCode = StatusCodes.OK;
	let success = true;

	if (data?.error) {
		message = data.error.message;
		statusCode = data.error.statusCode as number;
		success = data.data !== null;
	}

	sendResponse(res, {
		statusCode,
		success,
		message,
	});
});

// Reset password after forgetting
const resetPassword = asyncHelper(async (req: Request, res: Response) => {
	await AuthServices.resetPassword(req.body);

	sendResponse(res, {
		statusCode: StatusCodes.OK,
		success: true,
		message: "Password reset successful",
	});
});

// Change password for logged-in user
const changePassword = asyncHelper(async (req: Request, res: Response) => {
	await AuthServices.changePassword(req.user.id as string, req.body);

	sendResponse(res, {
		statusCode: StatusCodes.OK,
		success: true,
		message: "Password changed successfully",
	});
});

// Refresh access token and rotate refresh token
const refreshToken = asyncHelper(async (req: Request, res: Response) => {
	const refreshToken = req.cookies?.refreshToken;

	const result = await AuthServices.refreshToken(refreshToken);

	await setAuthCookie(res, {
		accessToken: result.accessToken,
		refreshToken: result.refreshToken,
	});

	sendResponse(res, {
		statusCode: StatusCodes.OK,
		success: true,
		message: "Access token refreshed successfully",
		data: result,
	});
});

// Change initial password
const changeInitialPassword = asyncHelper(
	async (req: Request, res: Response) => {
		await AuthServices.changeInitialPassword(req.user.id, req.body);

		sendResponse(res, {
			statusCode: StatusCodes.OK,
			success: true,
			message: "Password changed successfully",
		});
	},
);

export const AuthControllers = {
	registerUser,
	loginUser,
	logoutUser,
	forgotPassword,
	resetPassword,
	changePassword,
	refreshToken,
	changeInitialPassword,
};