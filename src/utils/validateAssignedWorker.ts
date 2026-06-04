import prisma from "@/config/db.config";
import AppError from "@/errorHelper/appError";
import { Role } from "../../prisma/generated/prisma/enums";

const validateAssignedWorker = async (requestId: string, userId: string) => {
	const user = await prisma.userDetails.findUnique({
		where: {
			userId,
		},
		include: {
			user: true,
		},
	});

	if (!user) {
		throw new AppError(404, "User not found");
	}

	const request = await prisma.serviceRequest.findUnique({
		where: {
			id: requestId,
		},
	});

	if (!request) {
		throw new AppError(404, "Request not found");
	}

	if (!request.assignedToId) {
		throw new AppError(400, "Request must be assigned first");
	}

	if (request.assignedToId !== user.id && user.user.role !== Role.SUPER_ADMIN) {
		throw new AppError(403, "Only assigned worker can perform this action");
	}

	return {
		user,
		request,
	};
};

export default validateAssignedWorker;
