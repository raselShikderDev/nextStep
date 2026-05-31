import prisma from "@/config/db.config";
import AppError from "@/errorHelper/appError";
import generateMeta from "@/utils/generateMeta";
import QueryBuilder from "@/utils/QueryBuilder";

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

export const RequestServices = {
	getSingleRequest,
	getAllRequests,
};

// GET /api/v1/requests?status=PAYMENT_PENDING
// GET /api/v1/requests?status=IN_PROGRESS
// GET /api/v1/requests?guestEmail=test@gmail.com
// GET /api/v1/requests?searchTerm=NSX
// GET /api/v1/requests?page=1&limit=20
// GET /api/v1/requests?sort=-createdAt
