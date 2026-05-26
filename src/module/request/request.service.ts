import prisma from "@/config/db.config";
import AppError from "@/errorHelper/appError";
import QueryBuilder from "@/utils/QueryBuilder";
import {
	ActionType,
	RequestStatus,
	Role,
} from "../../../prisma/generated/prisma/enums";

const getAllRequests = async (query: Record<string, unknown>) => {
	const queryBuilder = new QueryBuilder({}, query)
		.search(["requestNo", "guestName", "guestEmail", "guestPhone"])
		.filter();

	const where = queryBuilder.build();

	const paginationQuery = new QueryBuilder(where, query)
		.sort()
		.paginate()
		.build();

	const requests = await prisma.serviceRequest.findMany({
		...paginationQuery,
		include: {
			service: true,
			assignedTo: true,
			payment: true,
		},
	});

	const total = await prisma.serviceRequest.count({
		where,
	});

	return {
		meta: {
			total,
		},
		data: requests,
	};
};

const getSingleRequest = async (id: string) => {
	const request = await prisma.serviceRequest.findUnique({
		where: {
			id,
		},
		include: {
			service: true,
			payment: true,
			documents: true,
			statusHistory: {
				orderBy: {
					createdAt: "desc",
				},
			},
			user: true,
			assignedTo: true,
		},
	});

	if (!request) {
		throw new AppError(404, "Request not found");
	}

	return request;
};

const assignManager = async (
	id: string,
	payload: {
		assignedToId: string;
	},
	userId: string,
) => {
	const request = await prisma.serviceRequest.findUnique({
		where: {
			id,
		},
	});

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

	const updatedRequest = await prisma.serviceRequest.update({
		where: {
			id,
		},
		data: {
			assignedToId: payload.assignedToId,
		},
	});

	await prisma.requestStatusHistory.create({
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
};

const updateRequestStatus = async (
	id: string,
	payload: {
		status: RequestStatus;
		note?: string;
	},
	userId: string,
) => {
	const request = await prisma.serviceRequest.findUnique({
		where: {
			id,
		},
	});

	if (!request) {
		throw new AppError(404, "Request not found");
	}

	if (request.status === RequestStatus.COMPLETED) {
		throw new AppError(400, "Completed request status cannot be changed");
	}

	const updatedRequest = await prisma.serviceRequest.update({
		where: {
			id,
		},
		data: {
			status: payload.status,
			completedAt:
				payload.status === RequestStatus.COMPLETED ? new Date() : null,
		},
	});

	await prisma.requestStatusHistory.create({
		data: {
			requestId: id,
			changedById: userId,
			fromStatus: request.status,
			toStatus: payload.status,
			note: payload.note,
			action: ActionType.REQUEST_STATUS_CHANGED,
		},
	});

	return updatedRequest;
};

const setQuotation = async (
	id: string,
	payload: {
		quotedPrice: number;
		adminNotes?: string;
	},
	userId: string,
) => {
	const request = await prisma.serviceRequest.findUnique({
		where: {
			id,
		},
	});

	if (!request) {
		throw new AppError(404, "Request not found");
	}

	const updatedRequest = await prisma.serviceRequest.update({
		where: {
			id,
		},
		data: {
			quotedPrice: payload.quotedPrice,
			adminNotes: payload.adminNotes,
			status: RequestStatus.PAYMENT_PENDING,
		},
	});

	await prisma.requestStatusHistory.create({
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
};

const markCompleted = async (id: string, userId: string) => {
	const request = await prisma.serviceRequest.findUnique({
		where: {
			id,
		},
	});

	if (!request) {
		throw new AppError(404, "Request not found");
	}

	const updatedRequest = await prisma.serviceRequest.update({
		where: {
			id,
		},
		data: {
			status: RequestStatus.COMPLETED,
			completedAt: new Date(),
		},
	});

	await prisma.requestStatusHistory.create({
		data: {
			requestId: id,
			changedById: userId,
			fromStatus: request.status,
			toStatus: RequestStatus.COMPLETED,
			note: "Request completed successfully",
			action: ActionType.REQUEST_COMPLETED,
		},
	});

	return updatedRequest;
};

const cancelRequest = async (
	id: string,
	payload: {
		note?: string;
	},
	userId: string,
) => {
	const request = await prisma.serviceRequest.findUnique({
		where: {
			id,
		},
	});

	if (!request) {
		throw new AppError(404, "Request not found");
	}

	const updatedRequest = await prisma.serviceRequest.update({
		where: {
			id,
		},
		data: {
			status: RequestStatus.CANCELLED,
		},
	});

	await prisma.requestStatusHistory.create({
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
};

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

export const RequestServices = {
	getAllRequests,
	getSingleRequest,
	assignManager,
	updateRequestStatus,
	setQuotation,
	markCompleted,
	cancelRequest,
	getRequestAnalytics,
};
