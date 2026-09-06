import type { Request, Response } from "express";
import asyncHelper from "@/middleware/asyncHelper";
import { sendResponse } from "@/utils/response";
import { DocumentServices } from "./document.service";

const uploadDocuments = asyncHelper(async (req: Request, res: Response) => {
	// requestId comes from route params: /upload/:requestId
	const { requestId } = req.params;

	// userId and role come from authCheck middleware
	const userId = req.user?.id;
	const userRole = req.user?.role;

	const result = await DocumentServices.uploadDocuments(
		req.files as Express.Multer.File[],
		requestId as string,
		userId,
		userRole,
		req.body.description,
	);

	sendResponse(res, {
		statusCode: 201,
		success: true,
		message: "Documents uploaded successfully",
		data: result,
	});
});

const getRequestDocuments = asyncHelper(async (req: Request, res: Response) => {
	const result = await DocumentServices.getRequestDocuments(
		req.params.requestId as string,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Documents fetched successfully",
		data: result,
	});
});

const deleteDocument = asyncHelper(async (req: Request, res: Response) => {
	await DocumentServices.deleteDocument(req.params.id as string);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Document deleted successfully",
	});
});

export const DocumentControllers = {
	uploadDocuments,
	getRequestDocuments,
	deleteDocument,
};
