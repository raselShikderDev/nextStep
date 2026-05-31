import type { Request, Response } from "express";
import asyncHelper from "@/middleware/asyncHelper";
import { sendResponse } from "@/utils/response";
import { RequestServices } from "./requests.service";

const getAllRequests = asyncHelper(async (req: Request, res: Response) => {
	const result = await RequestServices.getAllRequests(
		req.query as Record<string, unknown>,
	);

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

export const RequestControllers = {
	getSingleRequest,
	getAllRequests,
};
