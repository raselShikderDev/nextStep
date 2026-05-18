import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";

import prisma from "@/config/db.config";

import envVar from "@/config/env.config";
import AppError from "@/errorHelper/appError";


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

  const hashedPassword = await bcrypt.hash(payload.password, 10);

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

  return user;
};

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

  const accessToken = jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },

    envVar.JWT_ACCESS_SECRET,

    {
      expiresIn: "7d",
    },
  );

  return {
    accessToken,
    user,
  };
};

export const AuthServices = {
  registerUser,
  loginUser,
};
