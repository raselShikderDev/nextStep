import type { Request, Response } from "express";
import asyncHelper from "@/middleware/asyncHelper";
import { sendResponse } from "@/utils/response";
import { UserServices } from "./user.service";
import { updateUserValidationSchema } from "./user.validation";

// Update own profile
const updateOwnProfile = asyncHelper(async (req: Request, res: Response) => {
	const validatedData = updateUserValidationSchema.parse(req.body);

	const userId = req.user.userId;

	const result = await UserServices.updateOwnProfile(userId, validatedData);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Profile updated successfully",
		data: result,
	});
});

// Fetch own profile
const getMyProfile = asyncHelper(async (req: Request, res: Response) => {
	const userId = req.user.userId;

	const result = await UserServices.getMyProfile(userId);

	sendResponse(res, {
		statusCode: 200,

		success: true,

		message: "My profile retrieved successfully",

		data: result,
	});
});

// Role Restricted
const requestEmailChange = asyncHelper(async (req, res) => {
	const result = await UserServices.requestEmailChange(
		req.user.userId,
		req.body,
	);

	sendResponse(res, {
		statusCode: 201,
		success: true,
		message: "Email change request submitted successfully",
		data: result,
	});
});

const getAllPendingEmailRequests = asyncHelper(async (_req, res) => {
	const result = await UserServices.getAllPendingEmailRequests();

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Pending email requests retrieved successfully",
		data: result,
	});
});

const approveEmailChangeRequest = asyncHelper(async (req, res) => {
	const result = await UserServices.approveEmailChangeRequest(
		req.params.id as string,
		req.user.userId,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Email request approved successfully",
		data: result,
	});
});

const rejectEmailChangeRequest = asyncHelper(async (req, res) => {
	const { validatedData } = req.body;
	const result = await UserServices.rejectEmailChangeRequest(
		req.params.id as string,
		req.user.userId,
		validatedData.rejectedReason,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Email request rejected successfully",
		data: result,
	});
});

export const UserControllers = {
	updateOwnProfile,
	getMyProfile,
	requestEmailChange,
	getAllPendingEmailRequests,
	approveEmailChangeRequest,
	rejectEmailChangeRequest,
};
