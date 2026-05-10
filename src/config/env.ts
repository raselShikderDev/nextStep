import dotenv from 'dotenv'
import path from 'path'

dotenv.config({path:path.join(process.cwd(), "env")})

const envVar = {
    PORT: process.env.PORT,
    DATABASE_URL:process.env.DATABASE_URL
}

export default envVar