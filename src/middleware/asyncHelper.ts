import type { NextFunction, Request, Response } from "express";
import envVar from "@/config/env.config";

type asyncFunc = (
	req: Request,
	res: Response,
	next: NextFunction,
) => Promise<void>;

const asyncHelper =
	(fn: asyncFunc) => (req: Request, res: Response, next: NextFunction) => {
		Promise.resolve(fn(req, res, next)).catch((err) => {
			if (envVar.NODE_ENV === "Development") {
				console.log(err);
			}
			next(err);
		});
	};

export default asyncHelper;
