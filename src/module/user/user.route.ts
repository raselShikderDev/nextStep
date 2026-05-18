import { Router } from "express";
import { UserControllers } from "./user.controller";

const router = Router();

router.get("/me", UserControllers.getMyProfile)
router.patch("/update-profile", UserControllers.updateOwnProfile);
router.post(
	"/request-email-change",

	// auth(
	// 	"USER",
	// 	"MANAGER",
	// 	"ADMIN",
	// ),

	UserControllers.requestEmailChange,
);



router.get(
	"/pending-email-change-requests",

	// auth(
	// 	"ADMIN",
	// 	"SUPER_ADMIN",
	// ),

	UserControllers.getAllPendingEmailRequests,
);



router.patch(
	"/approve-email-change/:id",

	// auth(
	// 	"ADMIN",
	// 	"SUPER_ADMIN",
	// ),

	UserControllers.approveEmailChangeRequest,
);



router.patch(
	"/reject-email-change/:id",

	// auth(
	// 	"ADMIN",
	// 	"SUPER_ADMIN",
	// ),

	UserControllers.rejectEmailChangeRequest,
);

export const userRouter = router;
