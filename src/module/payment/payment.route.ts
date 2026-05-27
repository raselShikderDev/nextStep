import { Router } from "express";
import authCheck from "@/middleware/checkAuth";
import requestZodValidator from "@/middleware/requestZodValidator";
import { Role } from "../../../prisma/generated/prisma/enums";
import { PaymentControllers } from "./payment.controller";
import {
	rejectPaymentValidationSchema,
	submitPaymentValidationSchema,
	verifyPaymentValidationSchema,
} from "./payment.validation";

const router = Router();

router.post(
	"/submit",
	requestZodValidator(submitPaymentValidationSchema),
	PaymentControllers.submitPayment,
);

router.patch(
	"/verify/:id",
	authCheck(Role.ADMIN, Role.SUPER_ADMIN),
	requestZodValidator(verifyPaymentValidationSchema),
	PaymentControllers.verifyPayment,
);

router.patch(
	"/reject/:id",
	authCheck(Role.ADMIN, Role.SUPER_ADMIN),
	requestZodValidator(rejectPaymentValidationSchema),
	PaymentControllers.rejectPayment,
);

export const PaymentRoutes = router;
