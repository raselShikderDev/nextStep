import bcrypt from "bcryptjs";
import prisma from "@/config/db.config";
import envVar from "@/config/env.config";
import AppError from "@/errorHelper/appError";
import { createJwtToken } from "@/utils/jwtHelper";
import type { User } from "../../../prisma/generated/prisma/client";

// Register user
const registerUser = async (payload: {
	name: string;
	email: string;
	password: string;
}) => {
	const existingUser = await prisma.user.findUnique({
		where: {
			email: payload.email,
		},
	});

	if (existingUser) {
		throw new AppError(409, "User already exists");
	}

	const hashedPassword = await bcrypt.hash(
		payload.password,
		Number(envVar.HASH_ROUND as string),
	);

	const user = await prisma.user.create({
		data: {
			email: payload.email,

			passwordHash: hashedPassword,

			userDetails: {
				create: {
					name: payload.name,
				},
			},
		},

		include: {
			userDetails: true,
		},
	});

	const userInfo = {
		id: user.id,
		email: user.email,
		role: user.role,
		isActive: user.isActive,
		isVerified: user.isVerified,
	};

	return userInfo;
};

// Login User
const loginUser = async (payload: { email: string; password: string }) => {
	const user = await prisma.user.findUnique({
		where: {
			email: payload.email,
		},
		include: {
			userDetails: true,
		},
	});

	if (!user) {
		throw new AppError(404, "User not found");
	}

	if (!user.isActive) {
		throw new AppError(403, "User account is disabled");
	}

	if (!user.isVerified) {
		throw new AppError(403, "User is not verified");
	}

	const isPasswordMatched = await bcrypt.compare(
		payload.password,
		user.passwordHash,
	);

	if (!isPasswordMatched) {
		throw new AppError(401, "Invalid credentials");
	}

	const accessToken = createJwtToken(
		user as User,
		envVar.JWT_ACCESS_SECRET as string,
		envVar.JWT_ACCESS_EXPIRES_IN as string,
	);
	const refreshToken = createJwtToken(
		user as User,
		envVar.JWT_REFRESH_SECRET as string,
		envVar.JWT_REFRESH_SECRET as string,
	);

	return {
		accessToken,
		refreshToken,
		user: {
			id: user.id,
			email: user.email,
			role: user.role,
			isActive: user.isActive,
			isVerified: user.isVerified,
		},
	};
};

export const AuthServices = {
	registerUser,
	loginUser,
};
