import Leave from "../models/leave.model.js";
import ApiError from "../utils/error.js";
import catchAsyncHandler from "../middlewares/catchAsyncHandler.js";
import mongoose from "mongoose";

// Labourer applies for leave
export const applyForLeave = catchAsyncHandler(async (req, res, next) => {
  const { labourerId, fromDate, toDate, reason } = req.body;

  if (!labourerId || !fromDate || !toDate || !reason) {
    return next(
      new ApiError(400, "labourerId, fromDate, toDate, and reason are required")
    );
  }

  if (!mongoose.Types.ObjectId.isValid(labourerId)) {
    return next(new ApiError(400, "Invalid labourerId"));
  }

  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (isNaN(from) || isNaN(to)) {
    return next(new ApiError(400, "Invalid fromDate or toDate"));
  }
  if (to < from) {
    return next(new ApiError(400, "toDate cannot be before fromDate"));
  }

  if (typeof reason !== "string" || reason.trim() === "") {
    return next(new ApiError(400, "Reason must be a non-empty string"));
  }
  if (reason.length > 500) {
    return next(new ApiError(400, "Reason must be at most 500 characters"));
  }

  const leaveRequest = await Leave.create({
    labourerId,
    fromDate: from,
    toDate: to,
    reason: reason.trim(),
    status: "pending",
    appliedOn: new Date(),
  });

  res.status(201).json({ leaveRequest });
});

// Approve Leave Request (Manager/Admin)
export const approveLeave = catchAsyncHandler(async (req, res, next) => {
  const leaveId = req.params.id;
  const { reviewedBy } = req.body;

  if (!mongoose.Types.ObjectId.isValid(leaveId)) {
    return next(new ApiError(400, "Invalid leave request ID"));
  }

  if (!reviewedBy || !mongoose.Types.ObjectId.isValid(reviewedBy)) {
    return next(new ApiError(400, "Invalid reviewedBy user ID"));
  }

  const leaveRequest = await Leave.findById(leaveId);
  if (!leaveRequest) {
    return next(new ApiError(404, "Leave request not found"));
  }

  if (leaveRequest.status !== "pending") {
    return next(
      new ApiError(
        400,
        `Cannot approve a leave request with status '${leaveRequest.status}'`
      )
    );
  }

  leaveRequest.status = "approved";
  leaveRequest.reviewedBy = reviewedBy;

  await leaveRequest.save();

  res.status(200).json({ leaveRequest });
});

// Reject Leave Request (Manager/Admin)
export const rejectLeave = catchAsyncHandler(async (req, res, next) => {
  const leaveId = req.params.id;
  const { reviewedBy } = req.body;

  if (!mongoose.Types.ObjectId.isValid(leaveId)) {
    return next(new ApiError(400, "Invalid leave request ID"));
  }

  if (!reviewedBy || !mongoose.Types.ObjectId.isValid(reviewedBy)) {
    return next(new ApiError(400, "Invalid reviewedBy user ID"));
  }

  const leaveRequest = await Leave.findById(leaveId);
  if (!leaveRequest) {
    return next(new ApiError(404, "Leave request not found"));
  }

  if (leaveRequest.status !== "pending") {
    return next(
      new ApiError(
        400,
        `Cannot reject a leave request with status '${leaveRequest.status}'`
      )
    );
  }

  leaveRequest.status = "rejected";
  leaveRequest.reviewedBy = reviewedBy;

  await leaveRequest.save();

  res.status(200).json({ leaveRequest });
});

// View leave status for a labourer
export const getLeaveStatusByLabourer = catchAsyncHandler(
  async (req, res, next) => {
    const { labourerId } = req.params;
    let { status, fromDate, toDate, page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(labourerId)) {
      return next(new ApiError(400, "Invalid labourer ID"));
    }

    const filters = { labourerId };

    if (status) {
      const allowedStatus = ["pending", "approved", "rejected"];
      if (!allowedStatus.includes(status)) {
        return next(new ApiError(400, "Invalid status filter"));
      }
      filters.status = status;
    }

    if (fromDate || toDate) {
      filters.$and = [];
      if (fromDate) {
        const start = new Date(fromDate);
        if (!isNaN(start)) filters.$and.push({ toDate: { $gte: start } });
      }
      if (toDate) {
        const end = new Date(toDate);
        if (!isNaN(end)) filters.$and.push({ fromDate: { $lte: end } });
      }
      if (filters.$and.length === 0) {
        delete filters.$and;
      }
    }

    page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
    const skip = (page - 1) * limit;

    const total = await Leave.countDocuments(filters);
    const records = await Leave.find(filters)
      .skip(skip)
      .limit(limit)
      .sort({ fromDate: -1 })
      .populate({ path: "reviewedBy", select: "username email" });

    res.status(200).json({
      meta: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        pageSize: records.length,
      },
      records,
    });
  }
);

// List all leave requests
export const listLeaveRequests = catchAsyncHandler(async (req, res, next) => {
  let {
    labourerId,
    status,
    fromDate,
    toDate,
    reviewedBy,
    page = 1,
    limit = 20,
  } = req.query;

  page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
  limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
  const skip = (page - 1) * limit;

  const filters = {};

  if (labourerId && mongoose.Types.ObjectId.isValid(labourerId)) {
    filters.labourerId = labourerId;
  }

  if (status && ["pending", "approved", "rejected"].includes(status)) {
    filters.status = status;
  }

  if (fromDate || toDate) {
    filters.$and = [];
    if (fromDate && !isNaN(new Date(fromDate))) {
      filters.$and.push({ toDate: { $gte: new Date(fromDate) } });
    }
    if (toDate && !isNaN(new Date(toDate))) {
      filters.$and.push({ fromDate: { $lte: new Date(toDate) } });
    }
    if (filters.$and.length === 0) delete filters.$and;
  }

  if (reviewedBy && mongoose.Types.ObjectId.isValid(reviewedBy)) {
    filters.reviewedBy = reviewedBy;
  }

  const total = await Leave.countDocuments(filters);

  const records = await Leave.find(filters)
    .skip(skip)
    .limit(limit)
    .sort({ fromDate: -1 })
    .populate({ path: "labourerId", select: "fullName contactNumber" })
    .populate({ path: "reviewedBy", select: "username email" });

  res.status(200).json({
    meta: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      pageSize: records.length,
    },
    records,
  });
});

// Labourer Cancels Leave Request
export const cancelLeaveRequest = catchAsyncHandler(async (req, res, next) => {
  const leaveId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(leaveId)) {
    return next(new ApiError(400, "Invalid leave request ID"));
  }

  const leaveRequest = await Leave.findById(leaveId);
  if (!leaveRequest) {
    return next(new ApiError(404, "Leave request not found"));
  }

  if (leaveRequest.status !== "pending") {
    return next(
      new ApiError(
        400,
        `Cannot cancel a leave request with status '${leaveRequest.status}'`
      )
    );
  }

  await Leave.findByIdAndDelete(leaveId);

  res.status(200).json({ message: "Leave request cancelled successfully" });
});

// Add Remark to Leave Request (Manager/Admin)
export const addRemarkToLeaveRequest = catchAsyncHandler(
  async (req, res, next) => {
    const leaveId = req.params.id;
    const { remark } = req.body;

    if (!mongoose.Types.ObjectId.isValid(leaveId)) {
      return next(new ApiError(400, "Invalid leave request ID"));
    }

    if (!remark || typeof remark !== "string" || remark.trim() === "") {
      return next(new ApiError(400, "Remark must be a non-empty string"));
    }

    const leaveRequest = await Leave.findById(leaveId);
    if (!leaveRequest) {
      return next(new ApiError(404, "Leave request not found"));
    }

    leaveRequest.remarks = remark.trim();

    await leaveRequest.save();

    res.status(200).json({ leaveRequest });
  }
);
