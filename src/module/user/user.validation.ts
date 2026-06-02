import { z } from "zod";
import { Role } from "../../../prisma/generated/prisma/enums";

export const updateUserValidationSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters").optional(),
	phone: z
		.string()
		.regex(/^(?:\+8801|01)[3-9]\d{8}$/, "Invalid phone number format")
		.optional(),
	address: z.string().optional(),
	avatarUrl: z.string().url().optional(),
});

export const requestEmailChangeSchema = z.object({
	requestedEmail: z.email(),
	currentPassword: z.string().min(8),
	reason: z.string().optional(),
});

export const approveEmailChangeSchema = z.object({
	status: z.enum(["APPROVED", "REJECTED"]),

	rejectedReason: z.string().optional(),
});


export const createStaffValidationSchema =
	z.object({
		name: z.string(),
		email: z.email(),
		phone: z.string().optional(),
		role: z.enum([
			Role.ADMIN,
			Role.MANAGER,
			Role.USER,
		]),
	});
