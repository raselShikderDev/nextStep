import { Router } from "express";
import authChek from "@/middleware/checkAuth";
import requestZodValidator from "@/middleware/requestZodValidator";
import { ServiceControllers } from "./service.controller";
import {
	createServiceCategoryValidationSchema,
	createServiceRequestValidationSchema,
	createServiceValidationSchema,
} from "./service.validation";

const router = Router();

router.post(
	"/category/create",
	authChek("ADMIN", "SUPER_ADMIN", "MANAGER"),
	requestZodValidator(createServiceCategoryValidationSchema),
	ServiceControllers.createCategory,
);

router.post(
	"/create",
	authChek("ADMIN", "SUPER_ADMIN", "MANAGER"),
	requestZodValidator(createServiceValidationSchema),
	ServiceControllers.createService,
);

router.get("/", ServiceControllers.getAllServices);

router.get("/:slug", ServiceControllers.getSingleService);

router.post(
	"/request/create",
	requestZodValidator(createServiceRequestValidationSchema),
	ServiceControllers.createServiceRequest,
);

export const servicesRouter = router;
