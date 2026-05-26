import type { Request, Response } from "express";
import asyncHelper from "@/middleware/asyncHelper";
import { sendResponse } from "@/utils/response";
import { RequestServices } from "./request.service";

const getAllRequests = asyncHelper(async (req: Request, res: Response) => {
	const result = await RequestServices.getAllRequests(req.query);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Requests fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getSingleRequest = asyncHelper(async (req: Request, res: Response) => {
	const result = await RequestServices.getSingleRequest(
		req.params.id as string,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Request fetched successfully",
		data: result,
	});
});

const assignManager = asyncHelper(async (req: Request, res: Response) => {
	const result = await RequestServices.assignManager(
		req.params.id as string,
		req.body,
		req.user.id,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Manager assigned successfully",
		data: result,
	});
});

const updateRequestStatus = asyncHelper(async (req: Request, res: Response) => {
	const result = await RequestServices.updateRequestStatus(
		req.params.id as string,
		req.body,
		req.user.id,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Request status updated successfully",
		data: result,
	});
});

const setQuotation = asyncHelper(async (req: Request, res: Response) => {
	const result = await RequestServices.setQuotation(
		req.params.id as string,
		req.body,
		req.user.id,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Quotation set successfully",
		data: result,
	});
});

const markCompleted = asyncHelper(async (req: Request, res: Response) => {
	const result = await RequestServices.markCompleted(
		req.params.id as string,
		req.user.id,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Request marked as completed",
		data: result,
	});
});

const cancelRequest = asyncHelper(async (req: Request, res: Response) => {
	const result = await RequestServices.cancelRequest(
		req.params.id as string,
		req.body,
		req.user.id,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Request cancelled successfully",
		data: result,
	});
});

const getRequestAnalytics = asyncHelper(
	async (_req: Request, res: Response) => {
		const result = await RequestServices.getRequestAnalytics();

		sendResponse(res, {
			statusCode: 200,
			success: true,
			message: "Request analytics fetched successfully",
			data: result,
		});
	},
);

export const RequestControllers = {
	getAllRequests,
	getSingleRequest,
	assignManager,
	updateRequestStatus,
	setQuotation,
	markCompleted,
	cancelRequest,
	getRequestAnalytics,
};
