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

const getAllServicesCategory = asyncHelper(async (req: Request, res: Response) => {
	const result = await ServiceServices.getAllServicesCategory(req.query);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Service Categories fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

// 
const updateCategory = asyncHelper(async (req: Request, res: Response) => {
	const result = await ServiceServices.updateCategory(req.params.id as string, req.body);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Service category updated successfully",
		data: result,
	});
});

// 
const toggleCategoryStatus = asyncHelper(async (req: Request, res: Response) => {
	const result = await ServiceServices.toggleCategoryStatus(req.params.id as string);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: `Service category ${result.isActive ? "activated" : "deactivated"} successfully`,
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

export const ServiceControllers = {
	createCategory,
	createService,
	getAllServices,
	getSingleService,
	getAllServicesCategory,
	toggleCategoryStatus,
	updateCategory,
};
