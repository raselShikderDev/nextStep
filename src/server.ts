import expressApp from "@/app";
import { type Server } from "http";

async function startServer() {
  let server: Server;

  const PORT = 3000;
  try {
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
        process.exit(1)
      }
    });
  } catch (error) {
    console.error("Error during server startup:", error);
    process.exit(1)
  }
}

startServer();
