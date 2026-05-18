import { Router } from "express";

const router = Router()

router.get("/login", ()=>{console.log("Login router hit");
})


export const authRouter = router
