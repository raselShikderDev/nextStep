import type { NextFunction, Request, Response } from "express";
import envVar from "@/config/env.config";
import type { ZodObject, ZodRawShape } from "zod";

const requestZodValidator =
	(schema: ZodObject<ZodRawShape>) =>
	async (
		req: Request,
		res: Response,
		next: NextFunction,
	) => {
		try {
			if (envVar.NODE_ENV === "Development") {
				console.log(
					"[Zod Validator] Incoming Request:",
					req.body,
				);
			}

			req.body = await schema.parseAsync(
				req.body,
			);

			if (envVar.NODE_ENV === "Development") {
				console.log(
					"[Zod Validator] Validated Request:",
					req.body,
				);
			}

			next();
		} catch (error) {
			next(error);
		}
	};

export default requestZodValidator;