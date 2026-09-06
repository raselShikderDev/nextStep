import fs from "node:fs";
import path from "node:path";
import prisma from "@/config/db.config";
import AppError from "@/errorHelper/appError";
import {
	Role,
	type Role as RoleType,
} from "../../../prisma/generated/prisma/enums";
import { uploadRequestIdSchema } from "./document.validation";

const uploadDocuments = async (
	files: Express.Multer.File[],
	requestId: string,
	userId?: string,
	role?: RoleType,
	description?: string,
) => {
	const parsedRequestId = uploadRequestIdSchema.safeParse(requestId);

	if (!parsedRequestId.success) {
		throw new AppError(400, "Invalid request ID");
	}

	if (!userId || !role) {
		throw new AppError(401, "Authentication required");
	}

	const user = await prisma.userDetails.findUnique({
		where: {
			userId,
		},
		select: {
			id: true,
		},
	});

	if (!user) {
		throw new AppError(404, "User not found");
	}

	const request = await prisma.serviceRequest.findUnique({
		where: {
			id: parsedRequestId.data,
		},
		select: {
			id: true,
			userId: true,
			assignedToId: true,
		},
	});

	if (!request) {
		throw new AppError(404, "Request not found");
	}

	const isRequestOwner = request.userId === user.id;
	const isAssignedManager = request.assignedToId === user.id;
	const isPrivilegedRole = role === Role.ADMIN || role === Role.SUPER_ADMIN;

	if (!isRequestOwner && !isAssignedManager && !isPrivilegedRole) {
		throw new AppError(
			403,
			"You are not authorized to upload documents to this request",
		);
	}

	try {
		const documents = await Promise.all(
			files.map((file) =>
				prisma.requestDocument.create({
					data: {
						requestId: parsedRequestId.data,
						uploadedById: user.id,
						uploadedByRole: role,
						name: path.parse(file.originalname).name,
						originalName: file.originalname,
						url: `/private/requests/${parsedRequestId.data}/${file.filename}`,
						key: file.filename,
						mimeType: file.mimetype,
						size: file.size,
						description,
					},
				}),
			),
		);

		return documents;
	} catch (error) {
		for (const file of files) {
			if (file.path && fs.existsSync(file.path)) {
				fs.unlinkSync(file.path);
			}
		}

		throw error;
	}
};

const getRequestDocuments = async (requestId: string) => {
	const request = await prisma.serviceRequest.findUnique({
		where: {
			id: requestId,
		},
		select: {
			id: true,
		},
	});

	if (!request) {
		throw new AppError(404, "Request not found");
	}

	return prisma.requestDocument.findMany({
		where: {
			requestId,
		},
		orderBy: {
			createdAt: "desc",
		},
	});
};

const deleteDocument = async (documentId: string) => {
	const document = await prisma.requestDocument.findUnique({
		where: {
			id: documentId,
		},
	});

	if (!document) {
		throw new AppError(404, "Document not found");
	}

	const filePath = path.join(
		process.cwd(),
		"private_uploads",
		"requests",
		document.key,
	);

	await prisma.requestDocument.delete({
		where: {
			id: documentId,
		},
	});

	if (fs.existsSync(filePath)) {
		fs.unlinkSync(filePath);
	}

	return null;
};

export const DocumentServices = {
	uploadDocuments,
	getRequestDocuments,
	deleteDocument,
};
