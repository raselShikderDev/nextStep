// biome-ignore assist/source/organizeImports: >
import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { mainRoutes } from "./routes/mainRoutes";
import globalErrorHandler from "./middleware/globalErrorHandler";
import notFound from "./errorHelper/notFound";
import globalRateLimiter from "./middleware/globalRateLimiter";
import path from "node:path";
import envVar from "./config/env.config";

const expressApp: Application = express();

expressApp.use(helmet());
expressApp.use(express.json());
expressApp.use(cookieParser());
expressApp.use(morgan("dev"));

expressApp.use(globalRateLimiter);
const allowedOrigins = [
  envVar.FRONTEND_URL as string,
  envVar.FRONTEND_ADMIN_DASHBOARD_URL as string,
];

const corsOptions = {
  // biome-ignore lint/suspicious/noExplicitAny: <>
  origin: (origin: any, callback: any) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg =
        "The CORS policy for this site does not allow access from the specified Origin.";
      return callback(new Error(msg), false);
    }
    callback(null, true);
  },
  credentials: true,
};

expressApp.use(cors(corsOptions));

expressApp.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

expressApp.use("/api/v1", mainRoutes);

expressApp.get("/", (_req: Request, res: Response) => {
  res.send("App running");
});

expressApp.use(globalErrorHandler);
expressApp.use(notFound);

export default expressApp;
