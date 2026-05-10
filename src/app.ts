// biome-ignore assist/source/organizeImports: >
import express, { type Application, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser'
import helmet from 'helmet'

const expressApp: Application = express()

expressApp.use(helmet())
expressApp.use(express.json())
expressApp.use(cookieParser())

expressApp.get("/",(_req:Request, res:Response)=>{
    res.send("App running")
})


export default expressApp