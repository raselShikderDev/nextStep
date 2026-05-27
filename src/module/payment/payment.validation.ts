import { z } from "zod";
import { PaymentMethod } from "../../../prisma/generated/prisma/enums";

export const submitPaymentValidationSchema = z.object({
	requestId: z.uuid(),
	method: z.enum(PaymentMethod),
	transactionId: z.string().min(3),
	senderNumber: z.string().optional(),
	screenshotUrl: z.string().optional(),
	screenshotKey: z.string().optional(),
	userNote: z.string().optional(),
});

export const verifyPaymentValidationSchema = z.object({
	adminNote: z.string().optional(),
});

export const rejectPaymentValidationSchema = z.object({
	rejectionReason: z.string().min(3),
	adminNote: z.string().optional(),
});
