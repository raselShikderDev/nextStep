import { Router } from "express";
import authCheck from "@/middleware/checkAuth";
import { Role } from "../../../prisma/generated/prisma/enums";
import { RequestControllers } from "./requests.controller";

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

export const requestsRouter = router;
