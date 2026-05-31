import prisma from "@/config/db.config";
import AppError from "@/errorHelper/appError";
import generateMeta from "@/utils/generateMeta";
import QueryBuilder from "@/utils/QueryBuilder";
import { ActionType, RequestStatus, Role } from "../../../prisma/generated/prisma/enums";

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


const claimRequest = async (
	requestId: string,
	userId: string,
) => {
	const request =
		await prisma.serviceRequest.findUnique({
			where: {
				id: requestId,
			},
		});

	if (!request) {
		throw new AppError(
			404,
			"Request not found",
		);
	}

	if (request.assignedToId) {
		throw new AppError(
			400,
			"Request already assigned",
		);
	}

	const user =
		await prisma.userDetails.findUnique({
			where: {
				userId,
			},
		});

	if (!user) {
		throw new AppError(
			404,
			"User not found",
		);
	}

	const updatedRequest =
		await prisma.serviceRequest.update({
			where: {
				id: requestId,
			},
			data: {
				assignedToId: user.id,
			},
		});

	await prisma.requestStatusHistory.create({
		data: {
			requestId,
			changedById: user.id,
			action: ActionType.REQUEST_ASSIGNED,
			toStatus: request.status,
			note: "Request claimed",
		},
	});

	return updatedRequest;
};


export const RequestServices = {
	getSingleRequest,
	getAllRequests,
    assignManager,
	updateRequestStatus,
	setQuotation,
	markCompleted,
	cancelRequest,
	getRequestAnalytics,
    claimRequest,
};

// GET /api/v1/requests?status=PAYMENT_PENDING
// GET /api/v1/requests?status=IN_PROGRESS
// GET /api/v1/requests?guestEmail=test@gmail.com
// GET /api/v1/requests?searchTerm=NSX
// GET /api/v1/requests?page=1&limit=20
// GET /api/v1/requests?sort=-createdAt
