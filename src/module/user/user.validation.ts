import { z } from "zod";

// biome-ignore lint/suspicious/noUselessEscapeInString: >
const phone = "/^\+\d{1,15}$/";

export const updateUserValidationSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters").optional(),
	phone: z
		.string()
		.regex(new RegExp(phone), "Invalid phone number format")
		.optional(),
	address: z.string().optional(),
	avatarUrl: z.url().optional(),
});


export const requestEmailChangeSchema =
	z.object({
		requestedEmail: z.email(),

		reason:
			z.string().optional(),
	});

export const approveEmailChangeSchema =
	z.object({
		status: z.enum([
			"APPROVED",
			"REJECTED",
		]),

		rejectedReason:
			z.string().optional(),
	});