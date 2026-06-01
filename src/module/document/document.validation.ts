import { z } from "zod";

export const uploadDocumentValidationSchema = z.object({
	description: z.string().optional(),
});
