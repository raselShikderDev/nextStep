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
