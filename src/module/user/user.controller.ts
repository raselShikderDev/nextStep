import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHelper from "@/middleware/asyncHelper";
import { sendResponse } from "@/utils/response";
import { UserServices } from "./user.service";

// Update own profile
const updateOwnProfile = asyncHelper(async (req: Request, res: Response) => {
	const id = req.user.id;
	const result = await UserServices.updateOwnProfile(id as string, req.body);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Profile updated successfully",
		data: result,
	});
});

// Fetch own profile
const getMyProfile = asyncHelper(async (req: Request, res: Response) => {
	const id = req.user.id;

	const result = await UserServices.getMyProfile(id as string);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "My profile retrieved successfully",
		data: result,
	});
});

// Role Restricted
const requestEmailChange = asyncHelper(async (req, res) => {
	const result = await UserServices.requestEmailChange(req.user.id, req.body);

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

const getAllUsers = asyncHelper(async (req: Request, res: Response) => {
	const result = await UserServices.getAllUsers(req.query);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Users fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getSingleUser = asyncHelper(async (req: Request, res: Response) => {
	const result = await UserServices.getSingleUser(req.params.id as string);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "User fetched successfully",
		data: result,
	});
});

const toggleUserStatus = asyncHelper(async (req: Request, res: Response) => {
	const result = await UserServices.toggleUserStatus(
		req.params.id as string,
		req.body,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "User status updated successfully",
		data: result,
	});
});

const getUserAnalytics = asyncHelper(async (_req: Request, res: Response) => {
	const result = await UserServices.getUserAnalytics();

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "User analytics fetched successfully",
		data: result,
	});
});

const createStaff = asyncHelper(async (req: Request, res: Response) => {
	const result = await UserServices.createStaff(req.body);

	sendResponse(res, {
		statusCode: StatusCodes.CREATED,
		success: true,
		message: "Staff created successfully",
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
	getAllUsers,
	getSingleUser,
	toggleUserStatus,
	getUserAnalytics,
	createStaff,
};
