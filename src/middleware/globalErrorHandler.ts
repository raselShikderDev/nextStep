import type {
	ErrorRequestHandler,
} from "express";

import envVar from "@/config/env.config";
import AppError from "@/errorHelper/appError";


const globalErrorHandler: ErrorRequestHandler = (
	error,
	req,
	res,
	next,
) => {
	let statusCode = 500;

	let message = "Something went wrong";

	if (error instanceof AppError) {
		statusCode = error.statusCode;

		message = error.message;
	} else if (error instanceof Error) {
		message = error.message;
	}

	res.status(statusCode).json({
		success: false,
		message,

		error:
			envVar.NODE_ENV === "Development"
				? error
				: undefined,

		stack:
			envVar.NODE_ENV === "Development"
				? error.stack
				: undefined,
	});
};

export default globalErrorHandler;