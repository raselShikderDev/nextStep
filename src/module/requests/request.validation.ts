import { z } from "zod";

import { RequestStatus } from "../../../prisma/generated/prisma/enums";

export const assignManagerValidationSchema = z.object({
	assignedToId: z.uuid(),
});

export const updateRequestStatusValidationSchema = z.object({
	status: z.enum(RequestStatus),
	note: z.string().optional(),
});

export const setQuotationValidationSchema = z.object({
	quotedPrice: z.number().positive(),
	adminNotes: z.string().optional(),
});

export const cancelRequestValidationSchema = z.object({
	note: z.string().optional(),
});

// export const createServiceRequestValidationSchema = z.object({
// 	serviceId: z.string(),
// 	guestName: z.string().min(2),
// 	guestEmail: z.email(),
// 	guestPhone: z.string().min(11),
// 	guestAddress: z.string().optional(),
// 	guestSource: z.string().optional(),
// 	formData: z.record(z.string(), z.any()),
// 	userNotes: z.string().optional(),
// });


export const createServiceRequestValidationSchema = z.object({
  serviceId: z.string().min(1),
  guestName: z.string().min(2),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(10),
  guestAddress: z.string().optional(),
  guestSource: z.string().optional(),
  formData: z.record(z.string(), z.any()).optional(),
  userNotes: z.string().optional(),
  paymentMethod: z.string().optional(),
  transactionId: z.string().optional(),
  senderNumber: z.string().optional(),
  paymentNote: z.string().optional(),
});