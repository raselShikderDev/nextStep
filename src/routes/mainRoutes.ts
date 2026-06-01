import { Router } from "express";
import { authRouter } from "@/module/auth/auth.route";
import { documentRouter } from "@/module/document/document.route";
import { PaymentRoutes } from "@/module/payment/payment.route";
import { requestsRouter } from "@/module/requests/requests.route";
import { servicesRouter } from "@/module/services/service.route";
import { userRouter } from "@/module/user/user.route";

const router = Router();

const allRoutes = [
	{
		path: "/auth",
		route: authRouter,
	},
	{
		path: "/user",
		route: userRouter,
	},
	{
		path: "/services",
		route: servicesRouter,
	},
	{
		path: "/requests",
		route: requestsRouter,
	},
	{
		path: "/payment",
		route: PaymentRoutes,
	},
	{
		path: "/document",
		route: documentRouter,
	},
];

allRoutes.forEach((item) => {
	router.use(item.path, item.route);
});

export const mainRoutes = router;
