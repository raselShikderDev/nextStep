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
