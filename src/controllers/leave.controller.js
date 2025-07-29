import Leave from "../models/leave.model.js";
import ApiError from "../utils/error.js";
import catchAsyncHandler from "../middlewares/catchAsyncHandler.js";
import mongoose from "mongoose";

// Labourer applies for leave
export const applyForLeave = catchAsyncHandler(async (req, res, next) => {
  const { labourerId, fromDate, toDate, reason } = req.body;

  // 1. Validate required fields
  if (!labourerId || !fromDate || !toDate || !reason) {
    return next(new ApiError(400, "labourerId, fromDate, toDate, and reason are required"));
  }

  // 2. Validate labourerId format
  if (!mongoose.Types.ObjectId.isValid(labourerId)) {
    return next(new ApiError(400, "Invalid labourerId"));
  }

  // 3. Validate dates
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (isNaN(from) || isNaN(to)) {
    return next(new ApiError(400, "Invalid fromDate or toDate"));
  }
  if (to < from) {
    return next(new ApiError(400, "toDate cannot be before fromDate"));
  }

  // 4. Validate reason (non-empty and length ≤ 500 chars)
  if (typeof reason !== "string" || reason.trim() === "") {
    return next(new ApiError(400, "Reason must be a non-empty string"));
  }
  if (reason.length > 500) {
    return next(new ApiError(400, "Reason must be at most 500 characters"));
  }

  // 5. Create leave request
  const leaveRequest = await Leave.create({
    labourerId,
    fromDate: from,
    toDate: to,
    reason: reason.trim(),
    status: "pending",
    appliedOn: new Date(),
  });

  // 6. Return success response
  res.status(201).json({ leaveRequest });
});



// Approve Leave Request (Manager/Admin)
export const approveLeave = catchAsyncHandler(async (req, res, next) => {
  const leaveId = req.params.id;
  const { reviewedBy } = req.body;

  // 1. Validate leave ID
  if (!mongoose.Types.ObjectId.isValid(leaveId)) {
    return next(new ApiError(400, "Invalid leave request ID"));
  }

  // 2. Validate reviewedBy user ID
  if (!reviewedBy || !mongoose.Types.ObjectId.isValid(reviewedBy)) {
    return next(new ApiError(400, "Invalid reviewedBy user ID"));
  }

  // 3. Find leave request by ID
  const leaveRequest = await Leave.findById(leaveId);
  if (!leaveRequest) {
    return next(new ApiError(404, "Leave request not found"));
  }

  // 4. Ensure leave is currently pending
  if (leaveRequest.status !== "pending") {
    return next(new ApiError(400, `Cannot approve a leave request with status '${leaveRequest.status}'`));
  }

  // 5. Update status and reviewer
  leaveRequest.status = "approved";
  leaveRequest.reviewedBy = reviewedBy;

  // 6. Save changes
  await leaveRequest.save();

  // 7. Return updated leave request
  res.status(200).json({ leaveRequest });
});



// Reject Leave Request (Manager/Admin)
export const rejectLeave = catchAsyncHandler(async (req, res, next) => {
  const leaveId = req.params.id;
  const { reviewedBy } = req.body;

  // 1. Validate leave ID
  if (!mongoose.Types.ObjectId.isValid(leaveId)) {
    return next(new ApiError(400, "Invalid leave request ID"));
  }

  // 2. Validate reviewedBy user ID
  if (!reviewedBy || !mongoose.Types.ObjectId.isValid(reviewedBy)) {
    return next(new ApiError(400, "Invalid reviewedBy user ID"));
  }

  // 3. Find leave request by ID
  const leaveRequest = await Leave.findById(leaveId);
  if (!leaveRequest) {
    return next(new ApiError(404, "Leave request not found"));
  }

  // 4. Ensure leave is currently pending
  if (leaveRequest.status !== "pending") {
    return next(new ApiError(400, `Cannot reject a leave request with status '${leaveRequest.status}'`));
  }

  // 5. Update status and reviewer
  leaveRequest.status = "rejected";
  leaveRequest.reviewedBy = reviewedBy;

  // 6. Save changes
  await leaveRequest.save();

  // 7. Return updated leave request
  res.status(200).json({ leaveRequest });
});



// View leave status/history for a labourer (with filters and pagination)
export const getLeaveStatusByLabourer = catchAsyncHandler(async (req, res, next) => {
  const { labourerId } = req.params;
  let { status, fromDate, toDate, page = 1, limit = 20 } = req.query;

  // 1. Validate labourerId
  if (!mongoose.Types.ObjectId.isValid(labourerId)) {
    return next(new ApiError(400, "Invalid labourer ID"));
  }

  // 2. Build filters
  const filters = { labourerId };

  // Status filter
  if (status) {
    const allowedStatus = ["pending", "approved", "rejected"];
    if (!allowedStatus.includes(status)) {
      return next(new ApiError(400, "Invalid status filter"));
    }
    filters.status = status;
  }

  // Date range filter
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


  // Pagination
  page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
  limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
  const skip = (page - 1) * limit;

  // Total count and records
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
});



// List all leave requests with filters and pagination
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

  // Parse pagination
  page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
  limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
  const skip = (page - 1) * limit;

  // Build filters
  const filters = {};

  if (labourerId && mongoose.Types.ObjectId.isValid(labourerId)) {
    filters.labourerId = labourerId;
  }

  if (status && ["pending", "approved", "rejected"].includes(status)) {
    filters.status = status;
  }

  // Filter by leave window overlap (any leave that includes or overlaps the given window)
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

  // Count total for pagination
  const total = await Leave.countDocuments(filters);

  // Fetch with pagination and populate references
  const records = await Leave.find(filters)
    .skip(skip)
    .limit(limit)
    .sort({ fromDate: -1 }) // most recent leaves first
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



// Cancel Leave Request (typically by labourer)
export const cancelLeaveRequest = catchAsyncHandler(async (req, res, next) => {
  const leaveId = req.params.id;

  // 1. Validate leave ID
  if (!mongoose.Types.ObjectId.isValid(leaveId)) {
    return next(new ApiError(400, "Invalid leave request ID"));
  }

  // 2. Find leave request
  const leaveRequest = await Leave.findById(leaveId);
  if (!leaveRequest) {
    return next(new ApiError(404, "Leave request not found"));
  }

  // 3. Check if leave is cancellable (assuming only pending leaves can be cancelled)
  if (leaveRequest.status !== "pending") {
    return next(new ApiError(400, `Cannot cancel a leave request with status '${leaveRequest.status}'`));
  }

  // 4. Delete leave request
  await Leave.findByIdAndDelete(leaveId);

  // 5. Respond success
  res.status(200).json({ message: "Leave request cancelled successfully" });
});


// Add Remark to Leave Request (Manager/Admin)
export const addRemarkToLeaveRequest = catchAsyncHandler(async (req, res, next) => {
  const leaveId = req.params.id;
  const { remark } = req.body;

  // 1. Validate leave request ID
  if (!mongoose.Types.ObjectId.isValid(leaveId)) {
    return next(new ApiError(400, "Invalid leave request ID"));
  }

  // 2. Validate remark
  if (!remark || typeof remark !== "string" || remark.trim() === "") {
    return next(new ApiError(400, "Remark must be a non-empty string"));
  }

  // 3. Find leave request
  const leaveRequest = await Leave.findById(leaveId);
  if (!leaveRequest) {
    return next(new ApiError(404, "Leave request not found"));
  }

  // 4. Add or update remark field
  // If you want to keep remarks as string:
  leaveRequest.remarks = remark.trim();

  // Alternatively, to keep multiple remarks as array (if your model supports):
  // leaveRequest.remarks = leaveRequest.remarks || [];
  // leaveRequest.remarks.push({ text: remark.trim(), date: new Date() });

  // 5. Save updated leave request
  await leaveRequest.save();

  // 6. Return updated leave request
  res.status(200).json({ leaveRequest });
});