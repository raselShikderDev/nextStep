import prisma from "@/config/db.config";
import AppError from "@/errorHelper/appError";
import generateMeta from "@/utils/generateMeta";
import QueryBuilder from "@/utils/QueryBuilder";
import type { Prisma } from "../../../prisma/generated/prisma/client";

// CREATE SERVICE CATEGORY
const createCategory = async (
	payload: Prisma.ServiceCategoryUncheckedCreateInput,
) => {
	const isExist = await prisma.serviceCategory.findFirst({
		where: {
			OR: [
				{
					name: payload.name,
				},
				{
					slug: payload.slug,
				},
			],
		},
	});

	if (isExist) {
		throw new AppError(409, "Service category already exists");
	}

	const category = await prisma.serviceCategory.create({
		data: payload,
	});

	return category;
};

// CREATE SERVICE
const createService = async (payload: Prisma.ServiceUncheckedCreateInput) => {
	const category = await prisma.serviceCategory.findUnique({
		where: {
			id: payload.categoryId,
		},
	});

	if (!category) {
		throw new AppError(404, "Category not found");
	}

	const isExist = await prisma.service.findFirst({
		where: {
			OR: [
				{
					name: payload.name,
				},
				{
					slug: payload.slug,
				},
			],
		},
	});

	if (isExist) {
		throw new AppError(409, "Service already exists");
	}

	const service = await prisma.service.create({
		data: payload,
		include: {
			category: true,
		},
	});

	return service;
};

// GET ALL SERVICES
const getAllServicesCategory = async (query: Record<string, unknown>) => {
	const queryBuilder = new QueryBuilder(query)
		.search(["name", "slug"])
		.filter()
		.sort()
		.paginate();

	const services = await prisma.serviceCategory.findMany();

	const total = await prisma.service.count({
		where: queryBuilder.getWhere(),
	});

	const meta = generateMeta({
		total,
		page: Number(query.page) || 1,
		limit: Number(query.limit) || 10,
	});

	return {
		meta,
		data: services,
	};
};

// GET ALL SERVICES
const getAllServices = async (query: Record<string, unknown>) => {
	const queryBuilder = new QueryBuilder(query)
		.search(["name", "slug"])
		.filter()
		.sort()
		.paginate();

	const services = await prisma.service.findMany({
		...queryBuilder.build(),
		include: {
			category: true,
		},
	});

	const total = await prisma.service.count({
		where: queryBuilder.getWhere(),
	});

	const meta = generateMeta({
		total,
		page: Number(query.page) || 1,
		limit: Number(query.limit) || 10,
	});

	return {
		meta,
		data: services,
	};
};

// GET SINGLE SERVICE
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

export const ServiceServices = {
	createCategory,
	createService,
	getAllServices,
	getSingleService,
	getAllServicesCategory,
};
