import prisma from "@/config/db.config";
import AppError from "@/errorHelper/appError";
import { Role } from "../../prisma/generated/prisma/enums";

const validateRequestOwnership = async (
	requestId: string,
	userId: string,
) => {
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

	if (
		user.user.role === Role.ADMIN ||
		user.user.role === Role.SUPER_ADMIN
	) {
		return {
			user,
			request,
		};
	}

	if (request.assignedToId !== user.id) {
		throw new AppError(
			403,
			"You are not assigned to this request",
		);
	}

	return {
		user,
		request,
	};
};

export default validateRequestOwnership