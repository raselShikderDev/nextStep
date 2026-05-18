import type { Request, Response } from "express";
import { AuthServices } from "./auth.service";

import {
  loginValidationSchema,
  registerValidationSchema,
} from "./auth.validation";
import asyncHelper from "@/middleware/asyncHelper";
import { sendResponse } from "@/utils/response";

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

export const AuthControllers = {
  registerUser,
  loginUser,
};
