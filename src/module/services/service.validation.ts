import { z } from "zod";

export const createServiceCategoryValidationSchema = z.object({
	name: z.string().min(2),
	slug: z.string().min(2),
	description: z.string().optional(),
	icon: z.string().optional(),
	sortOrder: z.number().optional(),
});

export const createServiceValidationSchema = z.object({
	categoryId: z.string(),
	name: z.string().min(2),
	slug: z.string().min(2),
	description: z.string().optional(),
	features: z.array(z.string()),
	deliverables: z.array(z.string()),
	turnaround: z.string().optional(),
	price: z.number(),
	currency: z.string().optional(),
	formSchema: z.array(
		z.object({
			name: z.string(),
			label: z.string(),
			type: z.enum([
				"TEXT",
				"TEXTAREA",
				"NUMBER",
				"EMAIL",
				"PHONE",
				"PASSWORD",
				"DATE",
				"FILE",
				"SELECT",
				"MULTI_SELECT",
				"RADIO",
				"CHECKBOX",
				"URL",
			]),
			required: z.boolean(),
			placeholder: z.string().optional(),
			options: z.array(z.string()).optional(),
		}),
	),
});

export const createServiceRequestValidationSchema = z.object({
	serviceId: z.string(),
	guestName: z.string().min(2),
	guestEmail: z.email(),
	guestPhone: z.string().min(11),
	guestAddress: z.string().optional(),
	guestSource: z.string().optional(),
	formData: z.record(z.string(), z.any()),
	userNotes: z.string().optional(),
});
