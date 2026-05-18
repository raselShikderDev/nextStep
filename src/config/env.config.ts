import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), "env") });

const envVar = {
	PORT: process.env.PORT as string,
	NODE_ENV: process.env.NODE_ENV as string,
	DATABASE_URL: process.env.DATABASE_URL as string,
	REDIS_URL: process.env.REDIS_URL as string,
	REDIS_PORT: process.env.REDIS_PORT as string,
	REDIS_HOST: process.env.REDIS_HOST as string,
	REDIS_PASSWORD: process.env.REDIS_PASSWORD as string,
	REDIS_USERNAME: process.env.REDIS_USERNAME as string,
	JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
	JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET as string,
	HASH_ROUND: process.env.HASH_ROUND as string,
	JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN as string,
	JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN as string,

};

export default envVar;
