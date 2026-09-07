import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { StatusCodes } from "http-status-codes";
import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import otpGenerator from "otp-generator";
import prisma from "@/config/db.config";
import envVar from "@/config/env.config";
import redisClient from "@/config/redis.config";
import AppError from "@/errorHelper/appError";
import { createJwtToken } from "@/utils/jwtHelper";
import sendEmail from "@/utils/sendEmail";
import resetPasswordTemplate from "@/utils/templates/resetPasswordTemplate";
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
			isVerified: true,
			mustChangePassword: false,
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

	const accessToken = await createJwtToken(
		user as User,
		envVar.JWT_ACCESS_SECRET as string,
		envVar.JWT_ACCESS_EXPIRES_IN as string,
	);

	const jti = crypto.randomUUID();

	const refreshToken = await createJwtToken(
		user as User,
		envVar.JWT_REFRESH_SECRET as string,
		envVar.JWT_REFRESH_EXPIRES_IN as string,
		jti,
	);

	const tokenHash = await bcrypt.hash(refreshToken, 10);

	await prisma.refreshToken.create({
		data: {
			tokenHash,
			jti,
			userId: user.id,
			expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
		},
	});

	return {
		accessToken,
		refreshToken,
		user: {
			id: user.id,
			email: user.email,
			role: user.role,
			isActive: user.isActive,
			isVerified: user.isVerified,
			mustChangePassword: user.mustChangePassword,
		},
	};
};

// Send OTP for resetting password after forgetting
const forgotPassword = async (email: string) => {
	const user = await prisma.user.findUnique({
		where: {
			email,
		},
	});

	if (!user) {
		return;
	}

	if (!user.isActive) {
		throw new AppError(403, "User account is disabled");
	}

	if (!user.isVerified) {
		throw new AppError(403, "User is not verified");
	}

	const otp = otpGenerator.generate(6, {
		upperCaseAlphabets: false,
		lowerCaseAlphabets: false,
		specialChars: false,
	});

	await redisClient.set(`forgot-password:${email}`, otp, "EX", 60 * 10);

	try {
		const emailResult = await sendEmail({
			to: email,
			subject: "Reset Password OTP",
			html: resetPasswordTemplate(otp),
		});

		if (emailResult) {
			return emailResult;
		}
	} catch (error) {
		if (envVar.NODE_ENV === "Development") {
			console.error("Sending reset password OTP is failed", error);
		}

		throw new AppError(
			StatusCodes.BAD_GATEWAY,
			"Sending reset password OTP is Unsuccessfull",
		);
	}

	console.log({ otp, email });

	return;
};

// Reset password after forgetting
const resetPassword = async (payload: {
	email: string;
	otp: string;
	newPassword: string;
}) => {
	const { email, otp, newPassword } = payload;

	const user = await prisma.user.findUnique({
		where: {
			email,
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

	const storedOtp = await redisClient.get(`forgot-password:${email}`);

	if (!storedOtp) {
		throw new AppError(400, "OTP expired");
	}

	if (storedOtp !== otp) {
		throw new AppError(400, "Invalid OTP");
	}

	const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);

	if (isSamePassword) {
		throw new AppError(400, "New password cannot be same as old password");
	}

	const hashedPassword = await bcrypt.hash(newPassword, 12);

	await prisma.user.update({
		where: {
			id: user.id,
		},
		data: {
			passwordHash: hashedPassword,
		},
	});

	// Revoke all existing refresh tokens after password reset
	await prisma.refreshToken.deleteMany({
		where: {
			userId: user.id,
		},
	});

	await redisClient.del(`forgot-password:${email}`);
};

// Change password for logged-in user
const changePassword = async (
	userId: string,
	payload: {
		oldPassword: string;
		newPassword: string;
	},
) => {
	const { oldPassword, newPassword } = payload;

	const user = await prisma.user.findUnique({
		where: {
			id: userId,
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

	const isOldPasswordMatched = await bcrypt.compare(
		oldPassword,
		user.passwordHash,
	);

	if (!isOldPasswordMatched) {
		throw new AppError(400, "Old password is incorrect");
	}

	const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);

	if (isSamePassword) {
		throw new AppError(400, "New password cannot be same as old password");
	}

	const hashedPassword = await bcrypt.hash(newPassword, 12);

	await prisma.user.update({
		where: {
			id: userId,
		},
		data: {
			passwordHash: hashedPassword,
			mustChangePassword: false,
		},
	});

	// Revoke all existing refresh tokens after password change
	await prisma.refreshToken.deleteMany({
		where: {
			userId,
		},
	});
};

// Refresh access token and rotate refresh token
const refreshToken = async (token: string) => {
	if (!token) {
		throw new AppError(401, "Refresh token is required");
	}

	const decoded = jwt.verify(
		token,
		envVar.JWT_REFRESH_SECRET as string,
	) as JwtPayload;

	if (!decoded.id || !decoded.jti) {
		throw new AppError(401, "Invalid refresh token");
	}

	const user = await prisma.user.findUnique({
		where: {
			id: decoded.id,
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

	const storedToken = await prisma.refreshToken.findFirst({
		where: {
			userId: user.id,
			jti: decoded.jti,
		},
	});

	if (!storedToken) {
		throw new AppError(401, "Invalid refresh token");
	}

	const isTokenValid = await bcrypt.compare(token, storedToken.tokenHash);

	if (!isTokenValid) {
		throw new AppError(401, "Invalid refresh token");
	}

	if (storedToken.expiresAt < new Date()) {
		await prisma.refreshToken.delete({
			where: {
				id: storedToken.id,
			},
		});

		throw new AppError(401, "Refresh token expired");
	}

	// Delete old refresh token before issuing a new one
	await prisma.refreshToken.delete({
		where: {
			id: storedToken.id,
		},
	});

	// Generate new JTI BEFORE generating the new refresh token
	const newJti = crypto.randomUUID();

	const newRefreshToken = await createJwtToken(
		user,
		envVar.JWT_REFRESH_SECRET as string,
		envVar.JWT_REFRESH_EXPIRES_IN as string,
		newJti,
	);

	const newTokenHash = await bcrypt.hash(newRefreshToken, 10);

	await prisma.refreshToken.create({
		data: {
			tokenHash: newTokenHash,
			jti: newJti,
			userId: user.id,
			expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
		},
	});

	const accessToken = await createJwtToken(
		user,
		envVar.JWT_ACCESS_SECRET as string,
		envVar.JWT_ACCESS_EXPIRES_IN as string,
	);

	return {
		accessToken,
		refreshToken: newRefreshToken,
	};
};

// Change initial password after created by admin or super admin
const changeInitialPassword = async (
	userId: string,
	payload: {
		currentPassword: string;
		newPassword: string;
	},
) => {
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
	});

	if (!user) {
		throw new AppError(404, "User not found");
	}

	if (!user.mustChangePassword) {
		throw new AppError(400, "Initial password already changed");
	}

	const matched = await bcrypt.compare(
		payload.currentPassword,
		user.passwordHash,
	);

	if (!matched) {
		throw new AppError(400, "Invalid password");
	}

	const passwordHash = await bcrypt.hash(payload.newPassword, 10);

	await prisma.user.update({
		where: {
			id: userId,
		},
		data: {
			passwordHash,
			mustChangePassword: false,
		},
	});

	// Revoke all existing refresh tokens after initial password change
	await prisma.refreshToken.deleteMany({
		where: {
			userId,
		},
	});
};

// Logout user and revoke current refresh token
const logoutUser = async (token: string) => {
	if (!token) {
		return;
	}

	try {
		const decoded = jwt.verify(
			token,
			envVar.JWT_REFRESH_SECRET as string,
		) as JwtPayload;

		if (!decoded.jti) {
			return;
		}

		await prisma.refreshToken.deleteMany({
			where: {
				jti: decoded.jti,
			},
		});
	} catch {
		// Always allow logout to clear cookies even if the refresh token
		// is already expired or invalid.
		return;
	}
};

export const AuthServices = {
	registerUser,
	loginUser,
	forgotPassword,
	resetPassword,
	changePassword,
	refreshToken,
	changeInitialPassword,
	logoutUser,
};