import type { Response } from "express";

interface IMeta {
  totalPage?: string;
  currentPage: string;
  limit?: string;
  total?: string;
}

interface IData<T> {
  statusCode: number;
  success: string;
  message: string;
  data?: T;
  meta?: IMeta;
}

export const sendResponse = <T>(res: Response, data: IData<T>) => {
  res.send(data.statusCode).json({
    statusCode: data.statusCode,
    success: data.success,
    message: data.message,
    data: data.data,
    meta: data.meta,
  });
};
