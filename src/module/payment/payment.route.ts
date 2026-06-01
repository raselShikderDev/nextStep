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

router.get(
	"/",
	authCheck(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER),
	PaymentControllers.getAllPayments,
);

router.get(
	"/:id",
	authCheck(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER),
	PaymentControllers.getSinglePayment,
);

router.get(
	"/analytics",
	authCheck(
		Role.SUPER_ADMIN,
		Role.ADMIN,
		Role.MANAGER,
	),
	PaymentControllers.getPaymentAnalytics,
);

export const PaymentRoutes = router;

// GET /api/v1/payments?status=VERIFIED
// GET /api/v1/payments?status=SUBMITTED
// GET /api/v1/payments?method=BKASH
// GET /api/v1/payments?searchTerm=TXN123
// GET /api/v1/payments?page=1&limit=20
// GET /api/v1/payments?sort=-createdAt
