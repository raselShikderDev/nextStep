import type { Request, Response } from "express";
import asyncHelper from "@/middleware/asyncHelper";
import { sendResponse } from "@/utils/response";
import { AuthServices } from "./auth.service";
import {
  loginValidationSchema,
  registerValidationSchema,
} from "./auth.validation";


// Register user
const registerUser = asyncHelper(async (req: Request, res: Response) => {
  const validatedData = registerValidationSchema.parse(req.body);

  const result = await AuthServices.registerUser(validatedData);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "User registered successfully",
    data: result,
  });
});


// Login User
const loginUser = asyncHelper(async (req: Request, res: Response) => {
  const validatedData = loginValidationSchema.parse(req.body);
  const result = await AuthServices.loginUser(validatedData);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Login successful",
    data: result,
  });
});


// Send otp for reseting password after forgetting
const forgotPassword = asyncHelper(async (req: Request, res: Response) => {

  await AuthServices.forgotPassword(req.body.email);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "If account exists, OTP sent successfully",
  });
});


// Reset password after forgeting
const resetPassword = asyncHelper(async (req: Request, res: Response) => {

  await AuthServices.resetPassword(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Password reset successful",
  });
});


// Chnage password - For logged in user
const changePassword = asyncHelper(async (req: Request, res: Response) => {

  await AuthServices.changePassword(req.user.id as string, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Password changed successfully",
  });
});

export const AuthControllers = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  changePassword,
};
