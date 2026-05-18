// biome-ignore assist/source/organizeImports: >
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { mainRoutes } from "./routes/mainRoutes";
import globalErrorHandler from "./middleware/globalErrorHandler";
import notFound from "./errorHelper/notFound";

const expressApp: Application = express();

expressApp.use(helmet());
expressApp.use(express.json());
expressApp.use(cookieParser());
expressApp.use(morgan("dev"));

expressApp.use("/api/v1", mainRoutes);

expressApp.get("/", (_req: Request, res: Response) => {
	res.send("App running");
});

expressApp.use(globalErrorHandler);
expressApp.use(notFound);

export default expressApp;
