import path from "node:path";
import { StatusCodes } from "http-status-codes";
import prisma from "@/config/db.config";
import envVar from "@/config/env.config";
import AppError from "@/errorHelper/appError";
import generateMeta from "@/utils/generateMeta";
import QueryBuilder from "@/utils/QueryBuilder";
import sendEmail from "@/utils/sendEmail";
import requestReceivedTemplate from "@/utils/templates/requestReceivedTemplate";
import validateAssignedWorker from "@/utils/validateAssignedWorker";
import validateRequestAccess from "@/utils/validateRequestAccess";
import {
	ActionType,
	RequestStatus,
	Role,
} from "../../../prisma/generated/prisma/enums";
import type { CreateRequestPayload } from "./request.types";

// Get all requests
const getAllRequests = async (query: Record<string, unknown>) => {
	const queryBuilder = new QueryBuilder(query)
		.search(["requestNo", "guestName", "guestEmail", "guestPhone"])
		.filter()
		.sort()
		.paginate();

	const requests = await prisma.serviceRequest.findMany({
		...queryBuilder.build(),
		include: {
			service: {
				select: {
					id: true,
					name: true,
					price: true,
					requiresQuotation: true,
				},
			},
			assignedTo: {
				select: {
					id: true,
					name: true,
				},
			},
			payment: {
				select: {
					id: true,
					status: true,
					amount: true,
					method: true,
				},
			},
		},
	});

	const total = await prisma.serviceRequest.count({
		where: queryBuilder.getWhere(),
	});

	return {
		meta: generateMeta({
			total,
			page: Number(query.page) || 1,
			limit: Number(query.limit) || 10,
		}),
		data: requests,
	};
};

// Get singel request
const getSingleRequest = async (id: string) => {
	const request = await prisma.serviceRequest.findUnique({
		where: {
			id,
		},
		include: {
			service: true,
			payment: true,
			documents: true,
			assignedTo: true,
			statusHistory: {
				orderBy: {
					createdAt: "desc",
				},
			},
		},
	});

	if (!request) {
		throw new AppError(404, "Request not found");
	}

	return request;
};

// Assign Worker
const assignManager = async (
	id: string,
	payload: {
		assignedToId: string;
	},
	userId: string,
) => {
	const { request } = await validateRequestAccess(id, userId);

	if (!request) {
		throw new AppError(404, "Request not found");
	}

	const manager = await prisma.userDetails.findUnique({
		where: {
			id: payload.assignedToId,
		},
		include: {
			user: true,
		},
	});

	if (!manager) {
		throw new AppError(404, "Manager not found");
	}

	if (manager.user.role !== Role.MANAGER && manager.user.role !== Role.ADMIN) {
		throw new AppError(400, "Assigned user must be manager or admin");
	}
	const result = await prisma.$transaction(async (tx) => {
		const updatedRequest = await tx.serviceRequest.update({
			where: {
				id,
			},
			data: {
				assignedToId: payload.assignedToId,
			},
		});

		await tx.requestStatusHistory.create({
			data: {
				requestId: id,
				changedById: userId,
				fromStatus: request.status,
				toStatus: request.status,
				note: `Assigned request to ${manager.name}`,
				action: ActionType.REQUEST_ASSIGNED,
			},
		});

		return updatedRequest;
	});
	return result;
};

// Set qotation for some services
const setQuotation = async (
	id: string,
	payload: {
		quotedPrice: number;
		adminNotes?: string;
	},
	userId: string,
) => {
	const { request } = await validateRequestAccess(id, userId);

	if (!request) {
		throw new AppError(404, "Request not found");
	}
	const result = await prisma.$transaction(async (tx) => {
		const updatedRequest = await tx.serviceRequest.update({
			where: {
				id,
			},
			data: {
				quotedPrice: payload.quotedPrice,
				adminNotes: payload.adminNotes,
				status: RequestStatus.PAYMENT_PENDING,
			},
		});
		await tx.requestStatusHistory.create({
			data: {
				requestId: id,
				changedById: userId,
				fromStatus: request.status,
				toStatus: RequestStatus.PAYMENT_PENDING,
				note: "Quotation sent to client",
				action: ActionType.REQUEST_QUOTE_SET,
			},
		});
		return updatedRequest;
	});
	return result;
};

// Mark complete after finishing the job
const markCompleted = async (requestId: string, userId: string) => {
	const { user, request } = await validateAssignedWorker(requestId, userId);

	if (request.status !== RequestStatus.IN_PROGRESS) {
		throw new AppError(400, "Request must be in progress");
	}

	const result = await prisma.$transaction(async (tx) => {
		const updatedRequest = await tx.serviceRequest.update({
			where: {
				id: requestId,
			},
			data: {
				status: RequestStatus.READY_FOR_DELIVERY,
			},
		});

		await tx.requestStatusHistory.create({
			data: {
				requestId,
				changedById: user.id,
				action: ActionType.REQUEST_COMPLETED,
				fromStatus: RequestStatus.IN_PROGRESS,
				toStatus: RequestStatus.READY_FOR_DELIVERY,
				note: "Work completed and ready for delivery",
			},
		});

		return updatedRequest;
	});
	return result;
};

// Cancel a request
const cancelRequest = async (
	id: string,
	payload: {
		note?: string;
	},
	userId: string,
) => {
	const { request } = await validateRequestAccess(id, userId);

	if (!request) {
		throw new AppError(404, "Request not found");
	}
	const result = await prisma.$transaction(async (tx) => {
		const updatedRequest = await tx.serviceRequest.update({
			where: {
				id,
			},
			data: {
				status: RequestStatus.CANCELLED,
			},
		});

		await tx.requestStatusHistory.create({
			data: {
				requestId: id,
				changedById: userId,
				fromStatus: request.status,
				toStatus: RequestStatus.CANCELLED,
				note: payload.note,
				action: ActionType.REQUEST_CANCELLED,
			},
		});

		return updatedRequest;
	});
	return result;
};

// Get request Analytics
const getRequestAnalytics = async () => {
	const [
		totalRequests,
		submittedRequests,
		inProgressRequests,
		completedRequests,
		cancelledRequests,
	] = await Promise.all([
		prisma.serviceRequest.count(),
		prisma.serviceRequest.count({
			where: {
				status: RequestStatus.SUBMITTED,
			},
		}),
		prisma.serviceRequest.count({
			where: {
				status: RequestStatus.IN_PROGRESS,
			},
		}),
		prisma.serviceRequest.count({
			where: {
				status: RequestStatus.COMPLETED,
			},
		}),
		prisma.serviceRequest.count({
			where: {
				status: RequestStatus.CANCELLED,
			},
		}),
	]);

	const graphData = await prisma.$queryRaw`
		SELECT 
			TO_CHAR("createdAt", 'Mon') as month,
			COUNT(*)::int as total
		FROM service_requests
		WHERE "createdAt" >= NOW() - INTERVAL '12 months'
		GROUP BY month
		ORDER BY MIN("createdAt")
	`;

	return {
		totalRequests,
		submittedRequests,
		inProgressRequests,
		completedRequests,
		cancelledRequests,
		graphData,
	};
};

// Assinging a request to myself
const claimRequest = async (requestId: string, userId: string) => {
	const request = await prisma.serviceRequest.findUnique({
		where: {
			id: requestId,
		},
	});

	if (!request) {
		throw new AppError(404, "Request not found");
	}

	if (request.assignedToId) {
		throw new AppError(400, "Request already assigned");
	}

	const user = await prisma.userDetails.findUnique({
		where: {
			userId,
		},
	});

	if (!user) {
		throw new AppError(404, "User not found");
	}
	const result = await prisma.$transaction(async (tx) => {
		const updatedRequest = await tx.serviceRequest.update({
			where: {
				id: requestId,
			},
			data: {
				assignedToId: user.id,
			},
		});

		await tx.requestStatusHistory.create({
			data: {
				requestId,
				changedById: user.id,
				action: ActionType.REQUEST_ASSIGNED,
				toStatus: request.status,
				note: "Request claimed",
			},
		});

		return updatedRequest;
	});
	return result;
};

// STARTING WORK AFTER ASSIGNING
const startWork = async (requestId: string, userId: string) => {
	const { user, request } = await validateAssignedWorker(requestId, userId);
	if (request.status !== RequestStatus.PAYMENT_VERIFIED) {
		throw new AppError(400, "Payment must be verified before starting work");
	}

	if (!request.assignedToId) {
		throw new AppError(400, "Request must be claimed or assigned first");
	}

	const result = await prisma.$transaction(async (tx) => {
		const updatedRequest = await tx.serviceRequest.update({
			where: {
				id: requestId,
			},
			data: {
				status: RequestStatus.IN_PROGRESS,
			},
		});

		await tx.requestStatusHistory.create({
			data: {
				requestId,
				changedById: user.id,
				action: ActionType.REQUEST_STATUS_CHANGED,
				fromStatus: RequestStatus.PAYMENT_VERIFIED,
				toStatus: RequestStatus.IN_PROGRESS,
				note: "Work started",
			},
		});

		return updatedRequest;
	});
	return result;
};

// CREATE SERVICE REQUEST BY GUEST
const createServiceRequest = async (
	payload: CreateRequestPayload,
	files: Express.Multer.File[],
	userId?: string,
	role?: Role,
) => {
	const service = await prisma.service.findUnique({
		where: {
			id: payload.serviceId,
		},
	});

	if (!service) {
		throw new AppError(404, "Service not found");
	}

	if (!service.isActive) {
		throw new AppError(400, "Service is not available");
	}

	const totalRequest = await prisma.serviceRequest.count();

	const requestNo = `NSX-${new Date().getFullYear()}-${String(
		totalRequest + 1,
	).padStart(6, "0")}`;

	let userDetailsId: string | undefined;

	if (userId) {
		const user = await prisma.userDetails.findUnique({
			where: {
				userId,
			},
			select: {
				id: true,
				phone: true,
				user: {
					select: {
						email: true,
					},
				},
			},
		});

		if (!user) {
			throw new AppError(404, "User not found");
		}

		userDetailsId = user.id;
	}

	const result = await prisma.$transaction(async (tx) => {
		const request = await tx.serviceRequest.create({
			data: {
				requestNo,
				userId: userDetailsId,
				serviceId: payload.serviceId,
				isGuest: !userDetailsId,
				guestName: payload.guestName,
				guestEmail: payload.guestEmail,
				guestPhone: payload.guestPhone,
				guestAddress: payload.guestAddress,
				userNotes: payload.userNotes,
				formData: payload.formData,
				status: service.requiresQuotation
					? RequestStatus.UNDER_REVIEW
					: RequestStatus.PAYMENT_PENDING,
				currency: service.currency,
			},
		});

		if (files.length > 0) {
			await tx.requestDocument.createMany({
				data: files.map((file) => ({
					requestId: request.id,
					uploadedById: userDetailsId,
					uploadedByRole: role,
					name: path.parse(file.originalname).name,
					originalName: file.originalname,
					url: `/uploads/requests/${file.filename}`,
					key: file.filename,
					mimeType: file.mimetype,
					size: file.size,
				})),
			});
		}

		await tx.requestStatusHistory.create({
			data: {
				requestId: request.id,
				changedById: userDetailsId,
				action: ActionType.REQUEST_CREATED,
				toStatus: request.status,
				note: "Request submitted successfully",
			},
		});

		const fullRequest = await tx.serviceRequest.findUnique({
			where: {
				id: request.id,
			},
			include: {
				service: true,
				documents: true,
				statusHistory: {
					orderBy: {
						createdAt: "desc",
					},
				},
			},
		});

		return fullRequest;
	});

	try {
		const emailResult = await sendEmail({
			to: payload.guestEmail as string,
			subject: `Request Received - ${requestNo}`,
			html: requestReceivedTemplate({
				name: payload.guestName as string,
				requestNo: requestNo,
				serviceName: service.name,
			}),
		});

		if (emailResult) {
			return emailResult;
		}
	} catch (error) {
		if (envVar.NODE_ENV === "Development") {
			console.error("Sending reset password OTP is failed", error);
		}
		throw new AppError(
			StatusCodes.BAD_GATEWAY,
			"Sending reset password OTP is Unsuccessfull",
		);
	}

	return result;
};

// Deliver request after finishing the job
const deliverRequest = async (
	requestId: string,
	payload: {
		deliveryMessage?: string;
	},
	userId: string,
) => {
	const { request, user } = await validateAssignedWorker(requestId, userId);

	if (!request) {
		throw new AppError(404, "Request not found");
	}

	if (request.status !== RequestStatus.READY_FOR_DELIVERY) {
		throw new AppError(400, "Request is not ready for delivery");
	}

const deliveryMessage = payload?.deliveryMessage || `Not defined by ${user?.name}`

	const result = await prisma.$transaction(async (tx) => {
		const updatedRequest = await tx.serviceRequest.update({
			where: {
				id: requestId,
			},
			data: {
				status: RequestStatus.DELIVERED,
				deliveryMessage ,
				completedAt: new Date(),
			},
		});

		await tx.requestStatusHistory.create({
			data: {
				requestId,
				changedById: user?.id,
				action: ActionType.REQUEST_DELIVERED,
				fromStatus: RequestStatus.READY_FOR_DELIVERY,
				toStatus: RequestStatus.DELIVERED,
				note: deliveryMessage,
			},
		});

		return updatedRequest;
	});
	return result;
};

export const RequestServices = {
	getSingleRequest,
	getAllRequests,
	assignManager,
	setQuotation,
	markCompleted,
	cancelRequest,
	getRequestAnalytics,
	claimRequest,
	startWork,
	createServiceRequest,
	deliverRequest,
};

// GET /api/v1/requests?status=PAYMENT_PENDING
// GET /api/v1/requests?status=IN_PROGRESS
// GET /api/v1/requests?guestEmail=test@gmail.com
// GET /api/v1/requests?searchTerm=NSX
// GET /api/v1/requests?page=1&limit=20
// GET /api/v1/requests?sort=-createdAt
