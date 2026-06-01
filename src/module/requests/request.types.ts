import type { Prisma } from "../../../prisma/generated/prisma/client";

export type CreateRequestPayload = {
	serviceId: string;
	guestName?: string;
	guestEmail?: string;
	guestPhone?: string;
	guestAddress?: string;
	userNotes?: string;
	formData: Prisma.InputJsonValue;
};
