import { Router } from "express";
import { UserControllers } from "./user.controller";

const router = Router();

router.get("/me", UserControllers.getMyProfile)
router.patch("/update-profile", UserControllers.updateOwnProfile);
router.patch(
	"/approve-email-change",

	// auth(
	// 	"ADMIN",
	// 	"SUPER_ADMIN",
	// ),

	UserControllers.approveEmailChange,
);

export const userRouter = router;
