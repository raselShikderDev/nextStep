import { Router } from "express";
import authCheck from "@/middleware/checkAuth";
import requestZodValidator from "@/middleware/requestZodValidator";
import { Role } from "../../../prisma/generated/prisma/enums";
import { ServiceControllers } from "./service.controller";
import {
	createServiceCategoryValidationSchema,
	createServiceValidationSchema,
} from "./service.validation";

const router = Router();

router.post(
	"/category-create",
	authCheck(Role.ADMIN, Role.SUPER_ADMIN),
	requestZodValidator(createServiceCategoryValidationSchema),
	ServiceControllers.createCategory,
);

router.post(
	"/create",
	authCheck(Role.SUPER_ADMIN, Role.ADMIN),
	requestZodValidator(createServiceValidationSchema),
	ServiceControllers.createService,
);

router.get("/", ServiceControllers.getAllServices);

router.get("/:slug", ServiceControllers.getSingleService);

export const servicesRouter = router;
