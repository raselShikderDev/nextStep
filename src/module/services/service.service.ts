import prisma from "@/config/db.config";
import AppError from "@/errorHelper/appError";
import generateMeta from "@/utils/generateMeta";
import QueryBuilder from "@/utils/QueryBuilder";
import {
  ActionType,
  type Prisma,
  RequestStatus,
} from "../../../prisma/generated/prisma/client";

/*
|
| CREATE SERVICE CATEGORY
|
*/
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

/*
|
| CREATE SERVICE
|
*/
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

/*
|
| GET ALL SERVICES
|
*/
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

/*
|
| GET SINGLE SERVICE
|
*/
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

/*
|
| CREATE SERVICE REQUEST FPR GUEST
|
*/
const createServiceRequest = async (
  payload: Prisma.ServiceRequestUncheckedCreateInput,
) => {
  const service = await prisma.service.findUnique({
    where: {
      id: payload.serviceId,
    },
  });

  if (!service) {
    throw new AppError(404, "Service not found");
  }

  if (!service.isActive) {
    throw new AppError(400, "Service is currently unavailable");
  }

  const totalRequest = await prisma.serviceRequest.count();

  const requestNo = `NSX-${new Date().getFullYear()}-${String(
    totalRequest + 1,
  ).padStart(6, "0")}`;

  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.serviceRequest.create({
      data: {
        ...payload,
        requestNo,
        status: service.requiresQuotation
          ? RequestStatus.UNDER_REVIEW
          : RequestStatus.PAYMENT_PENDING,
        currency: service.currency,
      },
      include: {
        service: true,
      },
    });

    /*
	 CREATE REQUEST HISTORY
	*/
    await tx.requestStatusHistory.create({
      data: {
        requestId: request.id,
        toStatus: request.status,
        note: "Request submitted successfully",
        action: ActionType.REQUEST_CREATED,
      },
    });
	return request
  });

  return result;
};

export const ServiceServices = {
  createCategory,
  createService,
  getAllServices,
  getSingleService,
  createServiceRequest,
};
