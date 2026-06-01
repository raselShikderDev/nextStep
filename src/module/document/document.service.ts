import fs from "node:fs";
import path from "node:path";

import prisma from "@/config/db.config";
import AppError from "@/errorHelper/appError";
import type { Role } from "../../../prisma/generated/prisma/enums";

const uploadDocuments = async (
  files: Express.Multer.File[],
  userId?: string,
  role?: Role,
  description?: string,
) => {
  let uploadedById: string | undefined;

  if (userId) {
    const user = await prisma.userDetails.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    uploadedById = user.id;
  }

  //   const documents = await prisma.$transaction(async (tx) => {
  //     return Promise.all(
  //       files.map((file) =>
  //         tx.requestDocument.create({
  //           data: {
  //             uploadedById,
  //             uploadedByRole: role,
  //             name: path.parse(file.originalname).name,
  //             originalName: file.originalname,
  //             url: `/uploads/requests/${file.filename}`,
  //             key: file.filename,
  //             mimeType: file.mimetype,
  //             size: file.size,
  //             description,
  //           },
  //         }),
  //       ),
  //     );
  //   });

  try {
    const documents = await Promise.all(
      files.map((file) =>
        prisma.requestDocument.create({
          data: {
            uploadedById,
            uploadedByRole: role,

            name: path.parse(file.originalname).name,
            originalName: file.originalname,

            url: `/uploads/requests/${file.filename}`,
            key: file.filename,

            mimeType: file.mimetype,
            size: file.size,

            description,
          },
        }),
      ),
    );

    return documents;
  } catch (error) {
    for (const file of files) {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }

    throw error;
  }
};

const attachDocumentsToRequest = async (
  requestId: string,
  documentIds: string[],
) => {
  const request = await prisma.serviceRequest.findUnique({
    where: {
      id: requestId,
    },
    select: {
      id: true,
    },
  });

  if (!request) {
    throw new AppError(404, "Request not found");
  }

  const documents = await prisma.requestDocument.findMany({
    where: {
      id: {
        in: documentIds,
      },
      requestId: null,
    },
    select: {
      id: true,
    },
  });

  if (documents.length !== documentIds.length) {
    throw new AppError(400, "Invalid document selection");
  }

  await prisma.requestDocument.updateMany({
    where: {
      id: {
        in: documentIds,
      },
    },
    data: {
      requestId,
    },
  });

  return true;
};

const getRequestDocuments = async (requestId: string) => {
  const request = await prisma.serviceRequest.findUnique({
    where: {
      id: requestId,
    },
    select: {
      id: true,
    },
  });

  if (!request) {
    throw new AppError(404, "Request not found");
  }

  return prisma.requestDocument.findMany({
    where: {
      requestId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const deleteDocument = async (documentId: string) => {
  const document = await prisma.requestDocument.findUnique({
    where: {
      id: documentId,
    },
  });

  if (!document) {
    throw new AppError(404, "Document not found");
  }

  const filePath = path.join(
    process.cwd(),
    "uploads",
    "requests",
    document.key,
  );

  await prisma.$transaction(async (tx) => {
    await tx.requestDocument.delete({
      where: {
        id: documentId,
      },
    });

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  return null;
};

export const DocumentServices = {
  uploadDocuments,
  attachDocumentsToRequest,
  getRequestDocuments,
  deleteDocument,
};
