import { z } from "zod";

export const uploadRequestIdSchema = z.uuid();

export const uploadDocumentValidationSchema = z.object({
	description: z.string().optional(),
});
