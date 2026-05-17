import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../prisma/generated/prisma/client";

import envVar from "./env.config";

const adapter = new PrismaPg({
	connectionString: envVar.DATABASE_URL,
});

const prisma = new PrismaClient({
	adapter,
});

export default prisma;
