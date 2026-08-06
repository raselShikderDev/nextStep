import { Router } from "express";
import authCheck from "@/middleware/checkAuth";
import requestZodValidator from "@/middleware/requestZodValidator";
import { Role } from "../../../prisma/generated/prisma/enums";
import { ServiceControllers } from "./service.controller";
import {
	createServiceCategoryValidationSchema,
	createServiceValidationSchema,
	updateServiceValidationSchema,
} from "./service.validation";

const router = Router();

router.post(
	"/category-create",
	authCheck(Role.ADMIN, Role.SUPER_ADMIN),
	requestZodValidator(createServiceCategoryValidationSchema),
	ServiceControllers.createCategory,
);

router.get("/", ServiceControllers.getAllServices);

//  Update category
router.patch(
	"/category/:id",
	authCheck(Role.ADMIN, Role.SUPER_ADMIN),
	requestZodValidator(createServiceCategoryValidationSchema),
	ServiceControllers.updateCategory,
);

// Toggle active/deactive
router.patch(
	"/category/:id/toggle-status",
	authCheck(Role.ADMIN, Role.SUPER_ADMIN),
	ServiceControllers.toggleCategoryStatus,
);

router.patch(
  "/:id",
  authCheck(Role.SUPER_ADMIN, Role.ADMIN),
  requestZodValidator(updateServiceValidationSchema),
  ServiceControllers.updateService,
);

// TOGGLE SERVICE STATUS
router.patch(
  "/:id/toggle-status",
  authCheck(Role.SUPER_ADMIN, Role.ADMIN),
  ServiceControllers.toggleServiceStatus,
);

router.post(
	"/create",
	authCheck(Role.SUPER_ADMIN, Role.ADMIN),
	requestZodValidator(createServiceValidationSchema),
	ServiceControllers.createService,
);

router.get("/service-category", ServiceControllers.getAllServicesCategory);

router.get("/:slug", ServiceControllers.getSingleService);

export const servicesRouter = router;
