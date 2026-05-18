import type { Request, Response } from "express";
import asyncHelper from "@/middleware/asyncHelper";
import { sendResponse } from "@/utils/response";
import { UserServices } from "./user.service";
import { updateUserValidationSchema } from "./user.validation";

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

export const UserControllers = {
	updateOwnProfile,
};
