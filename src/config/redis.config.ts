import Redis from "ioredis";
import envVar from "./env.config";

const redisClient = new Redis(envVar.REDIS_URL as string, {
	tls: {},

	maxRetriesPerRequest: null,

	retryStrategy(times) {
		console.log(`🔄 Redis reconnecting (${times})`);

		return Math.min(times * 1000, 10000);
	},
});

redisClient.on("connect", () => {
	console.log("✅ Redis connected");
});

redisClient.on("ready", () => {
	console.log("🚀 Redis ready");
});

redisClient.on("error", (error: Error) => {
	console.error("❌ Redis error:", error.message);
});

redisClient.on("close", () => {
	console.warn("⚠️ Redis disconnected");
});

export default redisClient;
