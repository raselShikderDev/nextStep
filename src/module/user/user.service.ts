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
const getMyProfile = async (userId: string) => {
	const user = await prisma.user.findUnique({
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
		throw new AppError(404, "User not found");
	}

	return user;
};


// Role Restricted
const approveEmailChange = async (
	requestedByUserId: string,

	approverRole: string,

	payload: {
		userId: string;

		newEmail: string;
	},
) => {
	// FIND TARGET USER

	const targetUser =
		await prisma.user.findUnique({
			where: {
				id: payload.userId,
			},
		});

	if (!targetUser) {
		throw new AppError(
			404,
			"Target user not found",
		);
	}

	// SUPER ADMIN EMAIL CANNOT CHANGE

	if (
		targetUser.role ===
		"SUPER_ADMIN"
	) {
		throw new AppError(
			403,
			"Super admin email cannot be changed",
		);
	}

	// ROLE BASED APPROVAL LOGIC

	// USER & MANAGER
	if (
		targetUser.role === "USER" ||
		targetUser.role === "MANAGER"
	) {
		if (
			approverRole !== "ADMIN" &&
			approverRole !==
				"SUPER_ADMIN"
		) {
			throw new AppError(
				403,
				"You are not authorized to approve this request",
			);
		}
	}

	// ADMIN
	if (
		targetUser.role === "ADMIN"
	) {
		if (
			approverRole !==
			"SUPER_ADMIN"
		) {
			throw new AppError(
				403,
				"Only super admin can approve admin email changes",
			);
		}
	}

	// CHECK DUPLICATE EMAIL

	const existingEmail =
		await prisma.user.findUnique({
			where: {
				email:
					payload.newEmail,
			},
		});

	if (existingEmail) {
		throw new AppError(
			409,
			"Email already exists",
		);
	}

	// UPDATE EMAIL

	const updatedUser =
		await prisma.user.update({
			where: {
				id: payload.userId,
			},

			data: {
				email:
					payload.newEmail,
			},

			select: {
				id: true,

				email: true,

				role: true,

				isActive: true,

				isVerified: true,
			},
		});

	return updatedUser;
};

export const UserServices = {
	updateOwnProfile,
	getMyProfile,
    approveEmailChange
};
