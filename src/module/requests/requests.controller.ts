import type { Request, Response } from "express";
import asyncHelper from "@/middleware/asyncHelper";
import { sendResponse } from "@/utils/response";
import { RequestServices } from "./requests.service";


// Create request for service (Guest and later by registered users)
const createServiceRequest = asyncHelper(async (req: Request, res: Response) => {
  const rawFormData = req.body.formData;
  const parsedData =
    typeof rawFormData === "string"
      ? JSON.parse(rawFormData)
      : (rawFormData ?? {});

  const paymentData =  req.body.paymentMethod && req.body.transactionId
      ? {
          method: req.body.paymentMethod,
          transactionId: req.body.transactionId,
          senderNumber: req.body.senderNumber,
          userNote: req.body.paymentNote,
        }
      : undefined;

  const payload = {
    ...req.body,
    formData: parsedData,
  };

  const result = await RequestServices.createServiceRequest(
    payload,
    (req.files as Express.Multer.File[]) || [],
    paymentData, 
    req.user?.id,
    req.user?.role,
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: paymentData
      ? "Request and payment submitted successfully"
      : "Request submitted successfully",
    data: result,
  });
});

// Get all requests
const getAllRequests = asyncHelper(async (req: Request, res: Response) => {
  const result = await RequestServices.getAllRequests(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Requests fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

// Get Singel Requesr
const getSingleRequest = asyncHelper(async (req: Request, res: Response) => {
  const result = await RequestServices.getSingleRequest(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Request fetched successfully",
    data: result,
  });
});

// Assign worker to a request
const assignManager = asyncHelper(async (req: Request, res: Response) => {
  const result = await RequestServices.assignManager(
    req.params.id as string,
    req.body,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Manager assigned successfully",
    data: result,
  });
});

const setQuotation = asyncHelper(async (req: Request, res: Response) => {
  const result = await RequestServices.setQuotation(
    req.params.id as string,
    req.body,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Quotation set successfully",
    data: result,
  });
});

const markCompleted = asyncHelper(async (req: Request, res: Response) => {
  const result = await RequestServices.markCompleted(
    req.params.id as string,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Request marked as completed",
    data: result,
  });
});

const cancelRequest = asyncHelper(async (req: Request, res: Response) => {
  const result = await RequestServices.cancelRequest(
    req.params.id as string,
    req.body,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Request cancelled successfully",
    data: result,
  });
});

const getRequestAnalytics = asyncHelper(
  async (_req: Request, res: Response) => {
    const result = await RequestServices.getRequestAnalytics();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Request analytics fetched successfully",
      data: result,
    });
  },
);

const claimRequest = asyncHelper(async (req: Request, res: Response) => {
  const result = await RequestServices.claimRequest(
    req.params.id as string,
    req.user.id as string,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Request assigned successfully",
    data: result,
  });
});

const startWork = asyncHelper(async (req: Request, res: Response) => {
  const result = await RequestServices.startWork(
    req.params.id as string,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Work started successfully",
    data: result,
  });
});

// const createServiceRequest = asyncHelper(
//   async (req: Request, res: Response) => {
//     const rawFormData = req.body.formData;
//     const parsedData =
//       typeof rawFormData === "string"
//         ? JSON.parse(rawFormData)
//         : (rawFormData ?? {});

//     const payload = {
//       ...req.body,
//       formData: parsedData,
//     };

//     const result = await RequestServices.createServiceRequest(
//       payload, 
//       (req.files as Express.Multer.File[]) || [], 
//       req.user?.id,
//       req.user?.role,
//     );

//     sendResponse(res, {
//       statusCode: 201,
//       success: true,
//       message: "Request submitted successfully",
//       data: result,
//     });
//   },
// );

const deliverRequest = asyncHelper(async (req, res) => {
  const result = await RequestServices.deliverRequest(
    req.params.id as string,
    req.body,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Request delivered successfully",
    data: result,
  });
});

export const RequestControllers = {
  getAllRequests,
  getSingleRequest,
  assignManager,
  setQuotation,
  markCompleted,
  cancelRequest,
  getRequestAnalytics,
  claimRequest,
  startWork,
  createServiceRequest,
  deliverRequest,
};
