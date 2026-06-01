import cron from "node-cron";
import prisma from "@/config/db.config";

export const startCleanupFilesJob = () => {
	cron.schedule("0 * * * *", async () => {
		// Every hour

		console.log("Running document cleanup job...");

		try {
			const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

			const result = await prisma.requestDocument.deleteMany({
				where: {
					requestId: null,
					createdAt: {
						lt: cutoffDate,
					},
				},
			});

			console.log(`Deleted ${result.count} orphan documents`);
		} catch (error) {
			console.error("Cleanup failed:", error);
		}
	});
};
