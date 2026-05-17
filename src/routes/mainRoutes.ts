import { authRouter } from "@/module/auth/auth.controller";
import { userRouter } from "@/module/user/user.controller";
import { Router } from "express";


const router = Router()

const allRoutes = [
    {
        path:"/auth",
        route: authRouter
    },
    {
        path:"/user",
        route: userRouter
    },
]


allRoutes.forEach((item)=>{
    router.use(item.path, item.route)
})


export const mainRoutes = router