import { Router } from "express";
import authCheck from "@/middleware/checkAuth";
import { Role } from "../../../prisma/generated/prisma/enums";
import { UserControllers } from "./user.controller";

const router = Router();

router.get("/me", authCheck(...Object.values(Role)), UserControllers.getMyProfile);
router.patch("/update-profile", UserControllers.updateOwnProfile);
router.post(
	"/request-email-change",
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
	authCheck(Role.SUPER_ADMIN, Role.ADMIN),
	UserControllers.approveEmailChangeRequest,
);

router.patch(
	"/reject-email-change/:id",
	authCheck(Role.SUPER_ADMIN, Role.ADMIN),
	UserControllers.rejectEmailChangeRequest,
);

export const userRouter = router;
