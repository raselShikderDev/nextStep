import { Router } from "express";

const router = Router();

router.post("/create-service", () => {
	console.log("Create router hit");
});

export const servicesRouter = router;
