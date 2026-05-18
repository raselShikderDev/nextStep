import { Router } from "express";
import { UserControllers } from "./user.controller";

const router = Router();

router.patch("/me", UserControllers.updateOwnProfile);

export const userRouter = router;
