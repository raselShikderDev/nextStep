import { Router } from "express";

const router = Router()

router.post("/login", ()=>{console.log("Login router hit");
})


export const userRouter = router
