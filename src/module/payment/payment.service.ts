import prisma from "@/config/db.config";
import AppError from "@/errorHelper/appError";
import generateMeta from "@/utils/generateMeta";
import QueryBuilder from "@/utils/QueryBuilder";
import {
	ActionType,
	PaymentStatus,
	type Prisma,
	RequestStatus,
} from "../../../prisma/generated/prisma/client";

/*
|
| SUBMIT PAYMENT
|
*/
const submitPayment = async (payload: Prisma.PaymentUncheckedCreateInput) => {
	const request = await prisma.serviceRequest.findUnique({
		where: {
			id: payload.requestId,
		},
		include: {
			service: true,
			payment: true,
		},
	});

	if (!request) {
		throw new AppError(404, "Request not found");
	}

	if (request.payment) {
		throw new AppError(409, "Payment already submitted");
	}

	const payableAmount = request.quotedPrice || request.service.price;

	const result = await prisma.$transaction(async (tx) => {
		const payment = await tx.payment.create({
			data: {
				...payload,
				amount: payableAmount,
				currency: request.currency,
				status: PaymentStatus.SUBMITTED,
			},
		});

		await tx.serviceRequest.update({
			where: {
				id: request.id,
			},
			data: {
				status: RequestStatus.PAYMENT_SUBMITTED,
			},
		});

		await tx.requestStatusHistory.create({
			data: {
				requestId: request.id,
				fromStatus: request.status,
				toStatus: RequestStatus.PAYMENT_SUBMITTED,
				note: "Payment submitted successfully",
				action: ActionType.PAYMENT_SUBMITTED,
			},
		});

		return payment;
	});
	return result;
};

/*
|
| VERIFY PAYMENT
|
*/
const verifyPayment = async (
	id: string,
	payload: {
		adminNote?: string;
	},
	userId: string,
) => {
	const payment = await prisma.payment.findUnique({
		where: {
			id,
		},
		include: {
			request: true,
		},
	});

	if (!payment) {
		throw new AppError(404, "Payment not found");
	}
	const userDetails = await prisma.userDetails.findUniqueOrThrow({
		where: { userId },
	});
	const result = await prisma.$transaction(async (tx) => {
		const updatedPayment = await tx.payment.update({
			where: {
				id,
			},
			data: {
				status: PaymentStatus.VERIFIED,
				adminNote: payload.adminNote,
				verifiedAt: new Date(),
				verifiedById: userDetails.id,
			},
		});

		await tx.serviceRequest.update({
			where: {
				id: payment.requestId,
			},
			data: {
				status: RequestStatus.PAYMENT_VERIFIED,
			},
		});

		await tx.requestStatusHistory.create({
			data: {
				requestId: payment.requestId,
				changedById: userDetails.id,
				fromStatus: RequestStatus.PAYMENT_SUBMITTED,
				toStatus: RequestStatus.PAYMENT_VERIFIED,
				note: "Payment verified successfully",
				action: ActionType.PAYMENT_VERIFIED,
			},
		});

		return updatedPayment;
	});
	return result;
};

/*
|
| REJECT PAYMENT
|
*/
const rejectPayment = async (
	id: string,
	payload: {
		rejectionReason: string;
		adminNote?: string;
	},
	userId: string,
) => {
	const payment = await prisma.payment.findUnique({
		where: {
			id,
		},
	});

	if (!payment) {
		throw new AppError(404, "Payment not found");
	}

	const updatedPayment = await prisma.payment.update({
		where: {
			id,
		},
		data: {
			status: PaymentStatus.REJECTED,
			rejectionReason: payload.rejectionReason,
			adminNote: payload.adminNote,
		},
	});

	await prisma.serviceRequest.update({
		where: {
			id: payment.requestId,
		},
		data: {
			status: RequestStatus.PAYMENT_PENDING,
		},
	});

	await prisma.requestStatusHistory.create({
		data: {
			requestId: payment.requestId,
			changedById: userId,
			fromStatus: RequestStatus.PAYMENT_SUBMITTED,
			toStatus: RequestStatus.PAYMENT_PENDING,
			note: payload.rejectionReason,
			action: ActionType.PAYMENT_REJECTED,
		},
	});

	return updatedPayment;
};
/*
|
| GET ALL PAYMENT
|
*/
const getAllPayments = async (query: Record<string, unknown>) => {
	const queryBuilder = new QueryBuilder(query)
		.search(["transactionId", "senderNumber"])
		.filter()
		.sort()
		.paginate();

	const payments = await prisma.payment.findMany({
		...queryBuilder.build(),
		include: {
			request: {
				select: {
					id: true,
					requestNo: true,
					guestName: true,
					guestEmail: true,
					status: true,
				},
			},
			verifiedBy: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	});

	const total = await prisma.payment.count({
		where: queryBuilder.getWhere(),
	});

	return {
		meta: generateMeta({
			total,
			page: Number(query.page) || 1,
			limit: Number(query.limit) || 10,
		}),
		data: payments,
	};
};
/*
|
| GET A PAYMENT
|
*/
const getSinglePayment = async (id: string) => {
	const payment = await prisma.payment.findUnique({
		where: {
			id,
		},
		include: {
			request: {
				include: {
					service: true,
					assignedTo: true,
				},
			},
			verifiedBy: true,
		},
	});

	if (!payment) {
		throw new AppError(404, "Payment not found");
	}

	return payment;
};

const getPaymentAnalytics = async () => {
	const now = new Date();

	const todayStart = new Date();
	todayStart.setHours(0, 0, 0, 0);

	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(now.getDate() - 7);

	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(now.getDate() - 30);

	const [
		totalPayments,
		pendingPayments,
		verifiedPayments,
		rejectedPayments,
		totalRevenue,
		verifiedRevenue,
		todayRevenue,
		last7DaysRevenue,
		last30DaysRevenue,
		methodStats,
	] = await Promise.all([
		prisma.payment.count(),

		prisma.payment.count({
			where: {
				status: PaymentStatus.SUBMITTED,
			},
		}),

		prisma.payment.count({
			where: {
				status: PaymentStatus.VERIFIED,
			},
		}),

		prisma.payment.count({
			where: {
				status: PaymentStatus.REJECTED,
			},
		}),

		prisma.payment.aggregate({
			_sum: {
				amount: true,
			},
		}),

		prisma.payment.aggregate({
			where: {
				status: PaymentStatus.VERIFIED,
			},
			_sum: {
				amount: true,
			},
		}),

		prisma.payment.aggregate({
			where: {
				status: PaymentStatus.VERIFIED,
				verifiedAt: {
					gte: todayStart,
				},
			},
			_sum: {
				amount: true,
			},
		}),

		prisma.payment.aggregate({
			where: {
				status: PaymentStatus.VERIFIED,
				verifiedAt: {
					gte: sevenDaysAgo,
				},
			},
			_sum: {
				amount: true,
			},
		}),

		prisma.payment.aggregate({
			where: {
				status: PaymentStatus.VERIFIED,
				verifiedAt: {
					gte: thirtyDaysAgo,
				},
			},
			_sum: {
				amount: true,
			},
		}),

		prisma.payment.groupBy({
			by: ["method"],
			_count: {
				method: true,
			},
			_sum: {
				amount: true,
			},
		}),
	]);

	const monthlyRevenue = [];

	for (let i = 11; i >= 0; i--) {
		const start = new Date(
			now.getFullYear(),
			now.getMonth() - i,
			1,
		);

		const end = new Date(
			now.getFullYear(),
			now.getMonth() - i + 1,
			1,
		);

		const revenue =
			await prisma.payment.aggregate({
				where: {
					status:
						PaymentStatus.VERIFIED,
					verifiedAt: {
						gte: start,
						lt: end,
					},
				},
				_sum: {
					amount: true,
				},
			});

		monthlyRevenue.push({
			month: start.toLocaleString(
				"default",
				{
					month: "short",
				},
			),
			revenue:
				Number(
					revenue._sum.amount,
				) || 0,
		});
	}

	return {
		totalPayments,
		pendingPayments,
		verifiedPayments,
		rejectedPayments,

		totalRevenue:
			Number(
				totalRevenue._sum.amount,
			) || 0,

		verifiedRevenue:
			Number(
				verifiedRevenue._sum.amount,
			) || 0,

		todayRevenue:
			Number(
				todayRevenue._sum.amount,
			) || 0,

		last7DaysRevenue:
			Number(
				last7DaysRevenue._sum.amount,
			) || 0,

		last30DaysRevenue:
			Number(
				last30DaysRevenue._sum.amount,
			) || 0,

		methodStats,

		monthlyRevenue,
	};
};

export const PaymentServices = {
	submitPayment,
	verifyPayment,
	rejectPayment,
	getAllPayments,
	getSinglePayment,
	getPaymentAnalytics,
};
