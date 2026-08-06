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
	requiresQuotation: z.boolean().optional(),
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


export const updateServiceValidationSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().min(10).optional(),
  price: z.coerce.number().min(0).optional(),
  categoryId: z.string().optional(),
  features: z.array(z.string()).optional(),
  deliverables: z.array(z.string()).optional(),
  turnaround: z.string().optional(),
  currency: z.string().optional(),
  requiresQuotation: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
  sortOrder: z.coerce.number().min(0).optional(),
  slug: z.string().optional(),
  formSchema: z.array(
    z.object({
      name: z.string().min(1),
      label: z.string().min(1),
      type: z.enum([
        "TEXT", "TEXTAREA", "NUMBER", "EMAIL", "PHONE",
        "PASSWORD", "DATE", "FILE", "SELECT", "MULTI_SELECT",
        "RADIO", "CHECKBOX", "URL",
      ]),
      required: z.boolean().default(false),
      placeholder: z.string().optional(),
      options: z.array(z.string()).optional(),
    })
  ).optional(),
});