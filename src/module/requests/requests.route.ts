import { Router } from "express";
import authCheck from "@/middleware/checkAuth";
import { Role } from "../../../prisma/generated/prisma/enums";
import { RequestControllers } from "./requests.controller";
import requestZodValidator from "@/middleware/requestZodValidator";
import { assignManagerValidationSchema, cancelRequestValidationSchema, setQuotationValidationSchema, updateRequestStatusValidationSchema } from "./request.validation";

const router = Router();

router.get(
	"/",
	authCheck(Role.ADMIN, Role.SUPER_ADMIN, Role.MANAGER),
	RequestControllers.getAllRequests,
);

router.get(
	"/:id",
	authCheck(Role.ADMIN, Role.SUPER_ADMIN, Role.MANAGER),
	RequestControllers.getSingleRequest,
);


router.get(
	"/analytics",
	authCheck(Role.ADMIN, Role.SUPER_ADMIN),
	RequestControllers.getRequestAnalytics,
);



router.patch(
	"/assign/:id",
	authCheck(Role.ADMIN, Role.SUPER_ADMIN),
	requestZodValidator(assignManagerValidationSchema),
	RequestControllers.assignManager,
);

router.patch(
	"/status/:id",
	authCheck(Role.ADMIN, Role.SUPER_ADMIN, Role.MANAGER),
	requestZodValidator(updateRequestStatusValidationSchema),
	RequestControllers.updateRequestStatus,
);

router.patch(
	"/quotation/:id",
	authCheck(Role.ADMIN, Role.SUPER_ADMIN),
	requestZodValidator(setQuotationValidationSchema),
	RequestControllers.setQuotation,
);

router.patch(
	"/mark-completed/:id",
	authCheck(Role.ADMIN, Role.SUPER_ADMIN, Role.MANAGER),
	RequestControllers.markCompleted,
);

router.patch(
	"/cancel/:id",
	authCheck(Role.ADMIN, Role.SUPER_ADMIN),
	requestZodValidator(cancelRequestValidationSchema),
	RequestControllers.cancelRequest,
);

router.patch(
	"/claim-request/:id",
	authCheck(
		Role.MANAGER,
		Role.ADMIN,
		Role.SUPER_ADMIN,
	),
	RequestControllers.claimRequest,
);

export const requestsRouter = router;
