import type { Server } from "node:http";
import expressApp from "@/app";
import envVar from "@/config/env.config";
import redisClient from "./config/redis.config";

async function startServer() {
	let server: Server;

	const PORT = envVar.PORT;
	try {
// Connecting with Redis

await new Promise<void>((resolve, reject)=>{
  redisClient.once("ready", ()=> resolve())
redisClient.once("error", (err)=> reject(err))
})
    // Connecting Database and starting express app
		server = expressApp.listen(PORT, () => {
			console.log(`🚀 Server is running on http://localhost:${PORT}`);
		});

		process.on("unhandledRejection", (error) => {
			console.log(
				"Unhandled Rejection is detected, we are closing our server...",
			);
			if (server) {
				server.close(() => {
					console.log(error);
					process.exit(1);
				});
			} else {
				process.exit(1);
			}
		});      

	} catch (error) {
		console.error("Error during server startup:", error);
		process.exit(1);
	}
}

(async () => {
	await startServer();
})();
