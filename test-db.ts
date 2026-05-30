import { Pool } from "pg";
import envVar from "./src/config/env.config"

const pool = new Pool({
	connectionString: envVar.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false,
	},
});

const result = await pool.query("SELECT NOW()");
console.log(result.rows);