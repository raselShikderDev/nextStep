import prisma from "@/config/db.config";
import AppError from "@/errorHelper/appError";
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

	const updatedPayment = await prisma.payment.update({
		where: {
			id,
		},
		data: {
			status: PaymentStatus.VERIFIED,
			adminNote: payload.adminNote,
			verifiedAt: new Date(),
			verifiedById: userId,
		},
	});

	await prisma.serviceRequest.update({
		where: {
			id: payment.requestId,
		},
		data: {
			status: RequestStatus.PAYMENT_VERIFIED,
		},
	});

	await prisma.requestStatusHistory.create({
		data: {
			requestId: payment.requestId,
			changedById: userId,
			fromStatus: RequestStatus.PAYMENT_SUBMITTED,
			toStatus: RequestStatus.PAYMENT_VERIFIED,
			note: "Payment verified successfully",
			action: ActionType.PAYMENT_VERIFIED,
		},
	});

	return updatedPayment;
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

export const PaymentServices = {
	submitPayment,
	verifyPayment,
	rejectPayment,
};
