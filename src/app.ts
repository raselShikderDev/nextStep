// biome-ignore assist/source/organizeImports: >
import express, { type Application, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser'

const expressApp: Application = express()
const PORT = 3000

expressApp.use(express.json())
expressApp.use(cookieParser())

expressApp.get("/",(_req:Request, res:Response)=>{
    res.send("App running")
})

expressApp.listen(PORT, ()=>{
  console.log(`Server is running at http://localhost:${PORT}`);
})

export default expressApp