import { Router } from "express";
import authChek from "@/middleware/checkAuth";
import requestZodValidator from "@/middleware/requestZodValidator";
import { Role } from "../../../prisma/generated/prisma/enums";
import { ServiceControllers } from "./service.controller";
import {
	createServiceCategoryValidationSchema,
	createServiceRequestValidationSchema,
	createServiceValidationSchema,
} from "./service.validation";

const router = Router();
console.log("in service catogry");

router.post(
	"/category-create",
	authChek(Role.ADMIN, Role.SUPER_ADMIN),
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
