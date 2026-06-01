import { Router } from "express";
import upload from "@/config/upload";
import authCheck from "@/middleware/checkAuth";
import { Role } from "../../../prisma/generated/prisma/enums";
import { DocumentControllers } from "./document.controller";

const router = Router();

router.post(
	"/upload/:requestId",
	upload.any(),
	DocumentControllers.uploadDocuments,
);

router.get(
	"/request/:requestId",
	authCheck(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN),
	DocumentControllers.getRequestDocuments,
);

router.delete(
	"/:id",
	authCheck(Role.ADMIN, Role.SUPER_ADMIN),
	DocumentControllers.deleteDocument,
);

export const documentRouter = router;
