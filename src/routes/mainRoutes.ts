import { authRouter } from "@/module/auth/auth.controller";
import { Router } from "express";


const router = Router()

const allRoutes = [
    {
        path:"/auth",
        route: authRouter
    }
]


allRoutes.forEach((item)=>{
    router.use(item.path, item.route)
})


export const mainRoutes = router