import envVar from "@/config/env.config";
import type { User } from "../../prisma/generated/prisma/client";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

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
  const accessToken = jwt.sign(jwtPayload, secret, {
    expiresIn: expires,
  } as SignOptions);
  return accessToken;
};

export const verifyJwtToken = async (token: string, secret: string) => {
  const verifiedToken = jwt.verify(token, secret);
  return verifiedToken;
};
