import type { Request, Response } from "express";
import asyncHelper from "@/middleware/asyncHelper";
import { sendResponse } from "@/utils/response";
import { UserServices } from "./user.service";
import { updateUserValidationSchema } from "./user.validation";

// Update own profile
const updateOwnProfile = asyncHelper(async (req: Request, res: Response) => {
  const validatedData = updateUserValidationSchema.parse(req.body);

  const userId = req.user.userId;

  const result = await UserServices.updateOwnProfile(userId, validatedData);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

// Fetch own profile
const getMyProfile = asyncHelper(async (req: Request, res: Response) => {
  const userId = req.user.userId;

  const result = await UserServices.getMyProfile(userId);

  sendResponse(res, {
    statusCode: 200,

    success: true,

    message: "My profile retrieved successfully",

    data: result,
  });
});

// Role Restricted
const approveEmailChange = asyncHelper(async (req, res) => {
  const result = await UserServices.approveEmailChange(
    req.user.userId,
    req.user.role,
    req.body,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Email updated successfully",
    data: result,
  });
});

export const UserControllers = {
  updateOwnProfile,
  getMyProfile,
  approveEmailChange,
};
