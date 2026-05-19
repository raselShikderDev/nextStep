import type {
	NextFunction,
	Request,
	Response,
} from "express";
import type { JwtPayload } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";

import prisma from "@/config/db.config";
import envVar from "@/config/env.config";
import AppError from "@/errorHelper/appError";
import { verifyJwtToken } from "@/utils/jwtHelper";

const auth =
	(...authRoles: string[]) =>
	async (
		req: Request,
		_res: Response,
		next: NextFunction,
	) => {
		try {
			const bearerToken =
				req.headers.authorization;

			const accessToken =
				bearerToken?.startsWith("Bearer ")
					? bearerToken.split(" ")[1]
					: req.cookies?.accessToken;

			if (!accessToken) {
				throw new AppError(
					StatusCodes.UNAUTHORIZED,
					"Access token not found",
				);
			}

			const verifiedToken =
				(await verifyJwtToken(
					accessToken,
					envVar.JWT_ACCESS_SECRET as string,
				)) as JwtPayload;

			if (!verifiedToken) {
				throw new AppError(
					StatusCodes.UNAUTHORIZED,
					"Invalid access token",
				);
			}

			const user =
				await prisma.user.findUnique({
					where: {
						id: verifiedToken.userId,
					},
					select: {
						id: true,
						email: true,
						role: true,
						isActive: true,
						isVerified: true,
					},
				});

			if (!user) {
				throw new AppError(
					StatusCodes.NOT_FOUND,
					"User not found",
				);
			}

			if (!user.isVerified) {
				throw new AppError(
					StatusCodes.FORBIDDEN,
					"Your account is not verified",
				);
			}

			if (!user.isActive) {
				throw new AppError(
					StatusCodes.FORBIDDEN,
					"Your account is inactive",
				);
			}

			if (
				authRoles.length > 0 &&
				!authRoles.includes(user.role)
			) {
				throw new AppError(
					StatusCodes.FORBIDDEN,
					"You are not authorized to access this route",
				);
			}

			req.user = {
				id: user.id,
				email: user.email,
				role: user.role,
				isActive: user.isActive,
			};

			next();
		} catch (error) {
			next(error);
		}
	};

export default auth;