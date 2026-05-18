import { Router } from "express";

const router = Router()

router.post("/create-user", ()=>{console.log("User router hit");
})


export const userRouter = router
