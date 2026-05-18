import prisma from "@/config/db.config";
import AppError from "@/errorHelper/appError";

interface IUpdateUserPayload {
	name?: string;
	phone?: string;
	address?: string;
	avatarUrl?: string;
}


// Update my own profile
const updateOwnProfile = async (
	userId: string,
	payload: IUpdateUserPayload,
) => {
	// CHECK USER EXIST

	const existingUser = await prisma.user.findUnique({
		where: {
			id: userId,
		},

		include: {
			userDetails: true,
		},
	});

	if (!existingUser) {
		throw new AppError(404, "User not found");
	}

	// CHECK PHONE DUPLICATE

	if (payload.phone) {
		const existingPhone = await prisma.userDetails.findFirst({
			where: {
				phone: payload.phone,

				NOT: {
					userId,
				},
			},
		});

		if (existingPhone) {
			throw new AppError(409, "Phone number already exists");
		}
	}

	// UPDATE USER DETAILS

	const updatedUser = await prisma.userDetails.update({
		where: {
			userId,
		},

		data: {
			name: payload.name,

			phone: payload.phone,

			address: payload.address,

			avatarUrl: payload.avatarUrl,
		},

		include: {
			user: {
				select: {
					id: true,

					email: true,

					role: true,

					isActive: true,

					isVerified: true,

					createdAt: true,
				},
			},
		},
	});

	return updatedUser;
};

// Get my own profile
const getMyProfile = async (
	userId: string,
) => {
	const user =
		await prisma.user.findUnique({
			where: {
				id: userId,
			},

			select: {
				id: true,

				email: true,

				role: true,

				isActive: true,

				isVerified: true,

				createdAt: true,

				updatedAt: true,

				userDetails: true,
			},
		});

	if (!user) {
		throw new AppError(
			404,
			"User not found",
		);
	}

	return user;
};

export const UserServices = {
	updateOwnProfile,
    getMyProfile,
};
