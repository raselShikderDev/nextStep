import "dotenv/config";

import { defineConfig } from "prisma/config";

export default defineConfig({
	schema: "prisma",

	migrations: {
		path: "../src/generated/prisma",
	},

	datasource: {
		url: process.env.DATABASE_URL,
	},
});
