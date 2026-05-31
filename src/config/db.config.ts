import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../../prisma/generated/prisma/client";
import envVar from "./env.config";

const pool = new Pool({
	connectionString: envVar.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false,
	},
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
	adapter,
});

export default prisma;
