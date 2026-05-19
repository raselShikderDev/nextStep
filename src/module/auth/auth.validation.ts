import { z } from "zod";

export const registerValidationSchema = z.object({
	name: z.string().min(2),
	email: z.email(),
	password: z.string().min(6),
});

export const loginValidationSchema = z.object({
	email: z.email(),
	password: z.string().min(6),
});

export const forgotPasswordValidationSchema = z.object({
	email: z.email(),
});

export const resetPasswordValidationSchema = z.object({
	email: z.email(),
	otp: z.string().length(6),
	newPassword: z.string().min(8),
});

export const changePasswordValidationSchema = z.object({
	oldPassword: z.string(),
	newPassword: z.string().min(8),
});
