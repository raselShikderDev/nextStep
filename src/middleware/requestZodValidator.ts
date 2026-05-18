import envVar from "@/config/env.config";
import type { NextFunction, Request, Response } from "express";
import { parseAsync, type ZodObject, type ZodRawShape } from "zod";

const requestZodValidator =
  (schmea: ZodObject<ZodRawShape>) =>
  async (req: Request, res: Response, next: NextFunction) => {
   try {

     if (envVar.NODE_ENV === 'Development') {
        console.log(
          '[requestZodValidator] Befire Zod validation - payload:',
          req.body,
        );
      }


     if (req.body) {
      req.body = JSON.parse(req.body);
    } else if (req.body.data) {
      req.body = JSON.parse(req.body.data);
    }

   
      req.body = await schmea.parseAsync(req.body)
       if (envVar.NODE_ENV === 'Development') {
        console.log(
          '[requestValidator] After Zod validation - payload:',
          req.body,
        );
      }
      next()
   } catch (error) {
    next(error)
   }
  };

export default requestZodValidator;
