import type { NextFunction, Request, Response } from "express";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { StatusCodes } from "http-status-codes";
import redisClient from "@/config/redis.config";
import AppError from "@/errorHelper/appError";

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "global_rate_limit",
  points: 100,
  duration: 60,
  blockDuration: 60,
});

const globalRateLimiter = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || "unknown-ip";
    
    await rateLimiter.consume(ip);

    next();
  } catch {
    next(
      new AppError(
        StatusCodes.TOO_MANY_REQUESTS,
        "Too many requests. Please try again later.",
      ),
    );
  }
};

export default globalRateLimiter;
