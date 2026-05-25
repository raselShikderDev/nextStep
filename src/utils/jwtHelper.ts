import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import type { User } from "../../prisma/generated/prisma/client";

export const createJwtToken = async (
	user: User,
	secret: string,
	expires: string,
) => {
	const jwtPayload: JwtPayload = {
		id: user.id,
		email: user.email,
		role: user.role,
		isActive: user.isActive,
	};
	const token = jwt.sign(jwtPayload, secret, {
		expiresIn: String(expires),
	} as SignOptions);
	return token;
};

export const verifyJwtToken = async (token: string, secret: string) => {
	const verifiedToken = jwt.verify(token, secret);
	return verifiedToken;
};
