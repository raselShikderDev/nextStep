import prisma from "@/config/db.config";
import AppError from "@/errorHelper/appError";

interface IUpdateUserPayload {
  name?: string;
  phone?: string;
  address?: string;
  avatarUrl?: string;
}

// Update my own profile
const updateOwnProfile = async (
  userId: string,
  payload: IUpdateUserPayload,
) => {
  // CHECK USER EXIST

  const existingUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    include: {
      userDetails: true,
    },
  });

  if (!existingUser) {
    throw new AppError(404, "User not found");
  }

  // CHECK PHONE DUPLICATE

  if (payload.phone) {
    const existingPhone = await prisma.userDetails.findFirst({
      where: {
        phone: payload.phone,

        NOT: {
          userId,
        },
      },
    });

    if (existingPhone) {
      throw new AppError(409, "Phone number already exists");
    }
  }

  // UPDATE USER DETAILS

  const updatedUser = await prisma.userDetails.update({
    where: {
      userId,
    },

    data: {
      name: payload.name,

      phone: payload.phone,

      address: payload.address,

      avatarUrl: payload.avatarUrl,
    },

    include: {
      user: {
        select: {
          id: true,

          email: true,

          role: true,

          isActive: true,

          isVerified: true,

          createdAt: true,
        },
      },
    },
  });

  return updatedUser;
};

// Get my own profile
const getMyProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,

      email: true,

      role: true,

      isActive: true,

      isVerified: true,

      createdAt: true,

      updatedAt: true,

      userDetails: true,
    },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return user;
};

// Role Restricted
// USER REQUEST EMAIL CHANGE

const requestEmailChange = async (
  userId: string,

  payload: {
    requestedEmail: string;

    reason?: string;
  },
) => {
  // FIND USER

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  // BLOCK SUPER ADMIN

  if (user.role === "SUPER_ADMIN") {
    throw new AppError(403, "Super admin email change request is restricted");
  }

  // SAME EMAIL CHECK

  if (user.email === payload.requestedEmail) {
    throw new AppError(400, "Requested email cannot be same as current email");
  }

  // EMAIL EXISTS CHECK

  const existingEmail = await prisma.user.findUnique({
    where: {
      email: payload.requestedEmail,
    },
  });

  if (existingEmail) {
    throw new AppError(409, "Email already exists");
  }

  // PENDING REQUEST CHECK

  const pendingRequest = await prisma.emailChangeRequest.findFirst({
    where: {
      userId,

      status: "PENDING",
    },
  });

  if (pendingRequest) {
    throw new AppError(409, "You already have a pending email change request");
  }

  // CREATE REQUEST

  const request = await prisma.emailChangeRequest.create({
    data: {
      userId,

      currentEmail: user.email,

      requestedEmail: payload.requestedEmail,

      reason: payload.reason,
    },
  });

  return request;
};

// GET ALL PENDING EMAIL REQUESTS

const getAllPendingEmailRequests = async () => {
  const requests = await prisma.emailChangeRequest.findMany({
    where: {
      status: "PENDING",
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      user: {
        select: {
          id: true,

          email: true,

          role: true,

          userDetails: true,
        },
      },
    },
  });

  return requests;
};

// APPROVE / REJECT REQUEST

const approveEmailChangeRequest = async (
  requestId: string,

  approverId: string,
) => {
  const request = await prisma.emailChangeRequest.findUnique({
    where: {
      id: requestId,
    },

    include: {
      user: true,
    },
  });

  if (!request) {
    throw new AppError(404, "Request not found");
  }

  if (request.status !== "PENDING") {
    throw new AppError(400, "Request already processed");
  }

  const approver = await prisma.user.findUnique({
    where: {
      id: approverId,
    },
  });

  if (!approver) {
    throw new AppError(404, "Approver not found");
  }

  // ROLE BASED APPROVAL

  if (request.user.role === "USER" || request.user.role === "MANAGER") {
    if (approver.role !== "ADMIN" && approver.role !== "SUPER_ADMIN") {
      throw new AppError(403, "You are not authorized to approve this request");
    }
  }

  if (request.user.role === "ADMIN") {
    if (approver.role !== "SUPER_ADMIN") {
      throw new AppError(
        403,
        "Only super admin can approve admin email change requests",
      );
    }
  }

  // UPDATE EMAIL + REQUEST

  const result = await prisma.$transaction(async (transactionClient) => {
    await transactionClient.user.update({
      where: {
        id: request.userId,
      },

      data: {
        email: request.requestedEmail,
      },
    });

    const updatedRequest = await transactionClient.emailChangeRequest.update({
      where: {
        id: requestId,
      },

      data: {
        status: "APPROVED",

        approvedById: approverId,

        approvedAt: new Date(),
      },
    });

    return updatedRequest;
  });

  return result;
};

// REJECT REQUEST

const rejectEmailChangeRequest = async (
  requestId: string,

  approverId: string,

  rejectedReason?: string,
) => {
  const request = await prisma.emailChangeRequest.findUnique({
    where: {
      id: requestId,
    },

    include: {
      user: true,
    },
  });

  if (!request) {
    throw new AppError(404, "Request not found");
  }

  if (request.status !== "PENDING") {
    throw new AppError(400, "Request already processed");
  }

  const updatedRequest = await prisma.emailChangeRequest.update({
    where: {
      id: requestId,
    },

    data: {
      status: "REJECTED",

      rejectedReason,

      approvedById: approverId,

      approvedAt: new Date(),
    },
  });

  return updatedRequest;
};

export const UserServices = {
  updateOwnProfile,
  getMyProfile,
  requestEmailChange,
  getAllPendingEmailRequests,
  approveEmailChangeRequest,
  rejectEmailChangeRequest,
};
