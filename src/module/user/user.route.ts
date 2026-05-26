import { Router } from "express";
import authCheck from "@/middleware/checkAuth";
import requestZodValidator from "@/middleware/requestZodValidator";
import { Role } from "../../../prisma/generated/prisma/enums";
import { UserControllers } from "./user.controller";
import {
	approveEmailChangeSchema,
	requestEmailChangeSchema,
	updateUserValidationSchema,
} from "./user.validation";

const router = Router();

router.get(
	"/me",
	authCheck(...Object.values(Role)),
	UserControllers.getMyProfile,
);

router.patch(
	"/update-profile",
	requestZodValidator(updateUserValidationSchema),
	authCheck(...Object.values(Role)),
	UserControllers.updateOwnProfile,
);
router.post(
	"/request-email-change",
	requestZodValidator(requestEmailChangeSchema),
	authCheck(Role.USER, Role.MANAGER, Role.ADMIN),
	UserControllers.requestEmailChange,
);

router.get(
	"/pending-email-change-requests",
	authCheck(Role.SUPER_ADMIN, Role.ADMIN),
	UserControllers.getAllPendingEmailRequests,
);

router.patch(
	"/approve-email-change/:id",
	requestZodValidator(approveEmailChangeSchema),
	authCheck(Role.SUPER_ADMIN, Role.ADMIN),
	UserControllers.approveEmailChangeRequest,
);

router.patch(
	"/reject-email-change/:id",
	authCheck(Role.SUPER_ADMIN, Role.ADMIN),
	UserControllers.rejectEmailChangeRequest,
);

router.get(
	"/",
	authCheck(Role.SUPER_ADMIN, Role.ADMIN),
	UserControllers.getAllUsers,
);

router.get(
	"/analytics",
	authCheck(Role.SUPER_ADMIN, Role.ADMIN),
	UserControllers.getUserAnalytics,
);

router.get(
	"/:id",
	authCheck(Role.SUPER_ADMIN, Role.ADMIN),
	UserControllers.getSingleUser,
);

router.patch(
	"/toggle-status/:id",
	authCheck(Role.SUPER_ADMIN, Role.ADMIN),
	UserControllers.toggleUserStatus,
);

export const userRouter = router;
