import type { Request, Response } from "express";
import asyncHelper from "@/middleware/asyncHelper";
import { sendResponse } from "@/utils/response";
import { PaymentServices } from "./payment.service";

/*
|
| SUBMIT PAYMENT
|
*/
const submitPayment = asyncHelper(async (req: Request, res: Response) => {
	const result = await PaymentServices.submitPayment(req.body);

	sendResponse(res, {
		statusCode: 201,
		success: true,
		message: "Payment submitted successfully",
		data: result,
	});
});

/*
|
| VERIFY PAYMENT
|
*/
const verifyPayment = asyncHelper(async (req: Request, res: Response) => {
	const result = await PaymentServices.verifyPayment(
		req.params.id as string,
		req.body,
		req.user.id as string,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Payment verified successfully",
		data: result,
	});
});

/*
|
| REJECT PAYMENT
|
*/
const rejectPayment = asyncHelper(async (req: Request, res: Response) => {
	const result = await PaymentServices.rejectPayment(
		req.params.id as string,
		req.body,
		req.user.id,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Payment rejected successfully",
		data: result,
	});
});

const getAllPayments = asyncHelper(async (req: Request, res: Response) => {
	const result = await PaymentServices.getAllPayments(
		req.query as Record<string, unknown>,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Payments fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getSinglePayment = asyncHelper(async (req: Request, res: Response) => {
	const result = await PaymentServices.getSinglePayment(
		req.params.id as string,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Payment fetched successfully",
		data: result,
	});
});

const getPaymentAnalytics = asyncHelper(async (_req, res) => {
	const result = await PaymentServices.getPaymentAnalytics();

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Payment analytics fetched successfully",
		data: result,
	});
});

export const PaymentControllers = {
	submitPayment,
	verifyPayment,
	rejectPayment,
	getAllPayments,
	getSinglePayment,
	getPaymentAnalytics,
};
