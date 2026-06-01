import fs from "node:fs";
import path from "node:path";

import prisma from "@/config/db.config";
import AppError from "@/errorHelper/appError";
import type { Role } from "../../../prisma/generated/prisma/enums";

const uploadDocuments = async (
	requestId: string,
	files: Express.Multer.File[],
	userId: string,
	role: Role,
	description?: string,
) => {
	const request = await prisma.serviceRequest.findUnique({
		where: {
			id: requestId,
		},
	});

	if (!request) {
		throw new AppError(404, "Request not found");
	}

	const user = await prisma.userDetails.findUnique({
		where: {
			userId,
		},
	});

	if (!user) {
		throw new AppError(404, "User not found");
	}

	const documents = await Promise.all(
		files.map((file) =>
			prisma.requestDocument.create({
				data: {
					requestId,
					uploadedById: user.id,
					uploadedByRole: role,

					name: path.parse(file.originalname).name,

					originalName: file.originalname,

					url: `/uploads/requests/${file.filename}`,

					key: file.filename,

					mimeType: file.mimetype,

					size: file.size,

					description,
				},
			}),
		),
	);

	return documents;
};

const getRequestDocuments = async (requestId: string) => {
	const request = await prisma.serviceRequest.findUnique({
		where: {
			id: requestId,
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
		"uploads",
		"requests",
		document.key,
	);

	if (fs.existsSync(filePath)) {
		fs.unlinkSync(filePath);
	}

	await prisma.requestDocument.delete({
		where: {
			id: documentId,
		},
	});

	return null;
};

export const DocumentServices = {
	uploadDocuments,
	getRequestDocuments,
	deleteDocument,
};
