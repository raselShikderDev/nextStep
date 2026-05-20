import type { Request, Response } from "express";
import asyncHelper from "@/middleware/asyncHelper";
import { sendResponse } from "@/utils/response";
import { ServiceServices } from "./service.service";

const createCategory = asyncHelper(async (req: Request, res: Response) => {
	const result = await ServiceServices.createCategory(req.body);

	sendResponse(res, {
		statusCode: 201,
		success: true,
		message: "Service category created successfully",
		data: result,
	});
});

const createService = asyncHelper(async (req: Request, res: Response) => {
	const result = await ServiceServices.createService(req.body);

	sendResponse(res, {
		statusCode: 201,
		success: true,
		message: "Service created successfully",
		data: result,
	});
});

const getAllServices = asyncHelper(async (req: Request, res: Response) => {
	const result = await ServiceServices.getAllServices(req.query);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Services fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getSingleService = asyncHelper(async (req: Request, res: Response) => {
	const result = await ServiceServices.getSingleService(
		req.params.slug as string,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Service fetched successfully",
		data: result,
	});
});

const createServiceRequest = asyncHelper(
	async (req: Request, res: Response) => {
		const result = await ServiceServices.createServiceRequest(req.body);

		sendResponse(res, {
			statusCode: 201,
			success: true,
			message: "Service request submitted successfully",
			data: result,
		});
	},
);

export const ServiceControllers = {
	createCategory,
	createService,
	getAllServices,
	getSingleService,
	createServiceRequest,
};
