import type {
	ErrorRequestHandler,
} from "express";

import envVar from "@/config/env.config";

import {
	Prisma,
} from "../../prisma/generated/prisma/client";

import {
	JsonWebTokenError,
	TokenExpiredError,
} from "jsonwebtoken";

import { ZodError } from "zod";
import handleZodError from "@/errorHelper/handleZodError";
import handlePrismaError from "@/errorHelper/handlePrismaError";
import handleJWTError from "@/errorHelper/handleJWTError";
import AppError from "@/errorHelper/appError";

const globalErrorHandler: ErrorRequestHandler = (
	error,
	req,
	res,
	next,
) => {
	let statusCode = 500;

	let message =
		"Something went wrong";

	let errorSources: {
		path: string;
		message: string;
	}[] = [];

	// ZOD ERROR

	if (error instanceof ZodError) {
		const simplifiedError =
			handleZodError(error);

		statusCode =
			simplifiedError.statusCode;

		message =
			simplifiedError.message;

		errorSources =
			simplifiedError.errorSources;
	}

	// PRISMA ERROR

	else if (
		error instanceof
			Prisma.PrismaClientKnownRequestError ||
		error instanceof
			Prisma.PrismaClientValidationError
	) {
		const simplifiedError =
			handlePrismaError(error);

		statusCode =
			simplifiedError.statusCode;

		message =
			simplifiedError.message;

		errorSources =
			simplifiedError.errorSources;
	}

	// JWT ERROR

	else if (
		error instanceof JsonWebTokenError ||
		error instanceof TokenExpiredError
	) {
		const simplifiedError =
			handleJWTError(error);

		statusCode =
			simplifiedError.statusCode;

		message =
			simplifiedError.message;

		errorSources =
			simplifiedError.errorSources;
	}

	// CUSTOM APP ERROR

	else if (error instanceof AppError) {
		statusCode = error.statusCode;

		message = error.message;
	}

	// NORMAL JS ERROR

	else if (error instanceof Error) {
		message = error.message;
	}

	res.status(statusCode).json({
		success: false,

		message,

		errorSources,

		stack:
			envVar.NODE_ENV ===
			"Development"
				? error.stack
				: null,
	});
};

export default globalErrorHandler;