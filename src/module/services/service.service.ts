import prisma from "@/config/db.config";
import AppError from "@/errorHelper/appError";
import QueryBuilder from "@/utils/QueryBuilder";
import type { Prisma } from "../../../prisma/generated/prisma/client";

const createCategory = async (payload: {
	name: string;
	slug: string;
	description?: string;
	icon?: string;
	sortOrder?: number;
}) => {
	const category = await prisma.serviceCategory.create({
		data: payload,
	});

	return category;
};

const createService = async (payload: Prisma.ServiceUncheckedCreateInput) => {
	const category = await prisma.serviceCategory.findUnique({
		where: {
			id: payload.categoryId as string,
		},
	});

	if (!category) {
		throw new AppError(404, "Category not found");
	}

	const service = await prisma.service.create({
		data: payload,
	});

	return service;
};

const getAllServices = async (query: Record<string, unknown>) => {
	const queryBuilder = new QueryBuilder({}, query)
		.search(["name", "slug"])
		.filter();

	const where = queryBuilder.build();

	const paginationQuery = new QueryBuilder(where, query)
		.sort()
		.paginate()
		.fields()
		.build();

	const services = await prisma.service.findMany({
		...paginationQuery,
		include: {
			category: true,
		},
	});

	const total = await prisma.service.count({
		where,
	});

	return {
		meta: {
			total,
		},
		data: services,
	};
};

const getSingleService = async (slug: string) => {
	const service = await prisma.service.findUnique({
		where: {
			slug,
		},
		include: {
			category: true,
		},
	});

	if (!service) {
		throw new AppError(404, "Service not found");
	}

	return service;
};

const createServiceRequest = async (
	payload: Prisma.ServiceRequestUncheckedCreateInput,
) => {
	const service = await prisma.service.findUnique({
		where: {
			id: payload.serviceId as string,
		},
	});

	if (!service) {
		throw new AppError(404, "Service not found");
	}

	const totalRequest = await prisma.serviceRequest.count();

	const requestNo = `NSX-${new Date().getFullYear()}-${String(
		totalRequest + 1,
	).padStart(6, "0")}`;

	const request = await prisma.serviceRequest.create({
		data: {
			...payload,
			requestNo,
		},
		include: {
			service: true,
		},
	});

	await prisma.requestStatusHistory.create({
		data: {
			requestId: request.id,
			changedById: "SYSTEM",
			toStatus: "SUBMITTED",
			note: "Request submitted successfully",
		},
	});

	return request;
};

export const ServiceServices = {
	createCategory,
	createService,
	getAllServices,
	getSingleService,
	createServiceRequest,
};
