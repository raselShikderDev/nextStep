import type { Response } from "express";

interface IMeta {
	totalPage?: number;
	currentPage?: number;
	limit?: number;
	total?: number;
}

interface IData<T> {
	statusCode: number;
	success: boolean;
	message: string;
	data?: T;
	meta?: IMeta;
}

export const sendResponse = <T>(res: Response, data: IData<T>) => {
	res.status(data.statusCode).json({
		success: data.success,
		message: data.message,
		data: data.data,
		meta: data.meta,
	});
};
