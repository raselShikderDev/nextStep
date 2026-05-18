import { authRouter } from "@/module/auth/auth.route";
import { servicesRouter } from "@/module/services/service.route";
import { userRouter } from "@/module/user/user.route";
import { Router } from "express";


const router = Router()

const allRoutes = [
    {
        path:"/auth",
        route: authRouter,
    },
    {
        path:"/user",
        route: userRouter,
    },
    {
        path:"/services",
        route: servicesRouter,
    },
]


allRoutes.forEach((item)=>{
    router.use(item.path, item.route)
})


export const mainRoutes = router