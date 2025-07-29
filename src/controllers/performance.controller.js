import Performance from "../models/performance.model.js";
import ApiError from "../utils/error.js";
import catchAsyncHandler from "../middlewares/catchAsyncHandler.js";
import mongoose from "mongoose";

// Create Performance Record
export const createPerformanceRecord = catchAsyncHandler(async (req, res, next) => {
  const {
    labourerId,
    projectId,
    date,
    performanceScore,
    remarks,
  } = req.body;

  // 1. Validate required fields
  if (
    !labourerId ||
    !projectId ||
    !date ||
    performanceScore === undefined ||
    !remarks
  ) {
    return next(
      new ApiError(400, "labourerId, projectId, date, performanceScore, and remarks are required")
    );
  }

  // 2. Validate ObjectIds
  if (!mongoose.Types.ObjectId.isValid(labourerId)) {
    return next(new ApiError(400, "Invalid labourerId"));
  }
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return next(new ApiError(400, "Invalid projectId"));
  }

  // 3. Validate date
  const perfDate = new Date(date);
  if (isNaN(perfDate)) {
    return next(new ApiError(400, "Invalid date"));
  }

  // 4. Validate performanceScore is within 0-100
  if (
    typeof performanceScore !== "number" ||
    performanceScore < 0 ||
    performanceScore > 100
  ) {
    return next(new ApiError(400, "performanceScore must be a number between 0 and 100"));
  }

  // 5. Validate remarks
  if (typeof remarks !== "string" || remarks.trim() === "") {
    return next(new ApiError(400, "Remarks must be a non-empty string"));
  }
  if (remarks.length > 1000) {
    return next(new ApiError(400, "Remarks must be at most 1000 characters long"));
  }

  // 6. Check for duplicate record for the same labourer/project/date
  const existing = await Performance.findOne({
    labourerId,
    projectId,
    date: perfDate,
  });

  if (existing) {
    return next(
      new ApiError(
        409,
        "Performance record for this labourer, project, and date already exists"
      )
    );
  }

  // 7. Create new performance record
  const performanceRecord = await Performance.create({
    labourerId,
    projectId,
    date: perfDate,
    performanceScore,
    remarks: remarks.trim(),
  });

  // 8. Return success response
  res.status(201).json({ performanceRecord });
});



// Update Performance Record by ID
export const updatePerformanceRecord = catchAsyncHandler(async (req, res, next) => {
  const performanceId = req.params.id;

  // 1. Validate performanceId
  if (!mongoose.Types.ObjectId.isValid(performanceId)) {
    return next(new ApiError(400, "Invalid performance record ID"));
  }

  // 2. Allowed fields to update
  const allowedFields = [
    "labourerId",
    "projectId",
    "date",
    "performanceScore",
    "remarks",
  ];

  // 3. Build updates object with only allowed fields provided
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // 4. Validate fields if present
  if (
    updates.labourerId &&
    !mongoose.Types.ObjectId.isValid(updates.labourerId)
  ) {
    return next(new ApiError(400, "Invalid labourerId"));
  }

  if (
    updates.projectId &&
    !mongoose.Types.ObjectId.isValid(updates.projectId)
  ) {
    return next(new ApiError(400, "Invalid projectId"));
  }

  if (updates.date) {
    const d = new Date(updates.date);
    if (isNaN(d)) {
      return next(new ApiError(400, "Invalid date"));
    }
    updates.date = d;
  }

  if (updates.performanceScore !== undefined) {
    const score = updates.performanceScore;
    if (typeof score !== "number" || score < 0 || score > 100) {
      return next(
        new ApiError(400, "performanceScore must be a number between 0 and 100")
      );
    }
  }

  if (updates.remarks !== undefined) {
    if (
      typeof updates.remarks !== "string" ||
      updates.remarks.trim() === ""
    ) {
      return next(new ApiError(400, "Remarks must be a non-empty string"));
    }
    if (updates.remarks.length > 1000) {
      return next(
        new ApiError(400, "Remarks must be at most 1000 characters long")
      );
    }
    updates.remarks = updates.remarks.trim();
  }

  // 5. Find the existing performance record
  const performanceRecord = await Performance.findById(performanceId);
  if (!performanceRecord) {
    return next(new ApiError(404, "Performance record not found"));
  }

  // 6. If labourerId, projectId, or date changes, check for duplicates
  const labourerIdToCheck = updates.labourerId || performanceRecord.labourerId.toString();
  const projectIdToCheck = updates.projectId || performanceRecord.projectId.toString();
  const dateToCheck = updates.date || performanceRecord.date;

  if (
    updates.labourerId ||
    updates.projectId ||
    updates.date
  ) {
    const existing = await Performance.findOne({
      _id: { $ne: performanceId },
      labourerId: labourerIdToCheck,
      projectId: projectIdToCheck,
      date: dateToCheck,
    });

    if (existing) {
      return next(
        new ApiError(
          409,
          "Another performance record exists for the same labourer, project, and date"
        )
      );
    }
  }

  // 7. Apply updates
  Object.assign(performanceRecord, updates);

  // 8. Save record
  await performanceRecord.save();

  // 9. Return updated record
  res.status(200).json({ performanceRecord });
});



// Get Performance Record by ID
export const getPerformanceById = catchAsyncHandler(async (req, res, next) => {
  const performanceId = req.params.id;

  // 1. Validate performanceId
  if (!mongoose.Types.ObjectId.isValid(performanceId)) {
    return next(new ApiError(400, "Invalid performance record ID"));
  }

  // 2. Find performance record and populate labourer and project info
  const performanceRecord = await Performance.findById(performanceId)
    .populate({ path: "labourerId", select: "fullName contactNumber" })
    .populate({ path: "projectId", select: "name location" });

  // 3. Handle record not found
  if (!performanceRecord) {
    return next(new ApiError(404, "Performance record not found"));
  }

  // 4. Return performance record
  res.status(200).json({ performanceRecord });
});



// List Performance Records with filters and pagination
export const listPerformanceRecords = catchAsyncHandler(async (req, res, next) => {
  let {
    labourerId,
    projectId,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = req.query;

  // 1. Parse pagination params
  page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
  limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
  const skip = (page - 1) * limit;

  // 2. Build filters object
  const filters = {};

  if (labourerId && mongoose.Types.ObjectId.isValid(labourerId)) {
    filters.labourerId = labourerId;
  }

  if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
    filters.projectId = projectId;
  }

  if (startDate || endDate) {
    filters.date = {};
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start)) filters.date.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end)) filters.date.$lte = end;
    }
    if (Object.keys(filters.date).length === 0) {
      delete filters.date;
    }
  }

  // 3. Count total matching documents (for pagination)
  const total = await Performance.countDocuments(filters);

  // 4. Query performance records with filters, pagination, sorting, and populate
  const records = await Performance.find(filters)
    .skip(skip)
    .limit(limit)
    .sort({ date: -1 }) // newest first
    .populate({ path: "labourerId", select: "fullName contactNumber" })
    .populate({ path: "projectId", select: "name location" });

  // 5. Return paginated result
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


// View Performance Records by Labourer with optional filters and pagination
export const getPerformanceByLabourer = catchAsyncHandler(async (req, res, next) => {
  const { labourerId } = req.params;
  let {
    projectId,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = req.query;

  // 1. Validate labourerId
  if (!mongoose.Types.ObjectId.isValid(labourerId)) {
    return next(new ApiError(400, "Invalid labourer ID"));
  }

  // 2. Parse pagination params
  page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
  limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
  const skip = (page - 1) * limit;

  // 3. Build filters
  const filters = { labourerId };

  if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
    filters.projectId = projectId;
  }

  if (startDate || endDate) {
    filters.date = {};
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start)) filters.date.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end)) filters.date.$lte = end;
    }
    if (Object.keys(filters.date).length === 0) {
      delete filters.date;
    }
  }

  // 4. Count total documents for pagination
  const total = await Performance.countDocuments(filters);

  // 5. Fetch records with pagination, sorting, and populate
  const records = await Performance.find(filters)
    .skip(skip)
    .limit(limit)
    .sort({ date: -1 }) // most recent first
    .populate({ path: "projectId", select: "name location" });

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



// View Performance Records by Project with optional filters and pagination
export const getPerformanceByProject = catchAsyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  let {
    labourerId,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = req.query;

  // 1. Validate projectId
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return next(new ApiError(400, "Invalid project ID"));
  }

  // 2. Parse pagination params
  page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
  limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
  const skip = (page - 1) * limit;

  // 3. Build filters
  const filters = { projectId };

  if (labourerId && mongoose.Types.ObjectId.isValid(labourerId)) {
    filters.labourerId = labourerId;
  }

  if (startDate || endDate) {
    filters.date = {};
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start)) filters.date.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end)) filters.date.$lte = end;
    }
    if (Object.keys(filters.date).length === 0) {
      delete filters.date;
    }
  }

  // 4. Count total documents for pagination
  const total = await Performance.countDocuments(filters);

  // 5. Fetch records with pagination, sorting, and populate
  const records = await Performance.find(filters)
    .skip(skip)
    .limit(limit)
    .sort({ date: -1 }) // newest first
    .populate({ path: "labourerId", select: "fullName contactNumber" });

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



// Delete Performance Record by ID
export const deletePerformanceRecord = catchAsyncHandler(async (req, res, next) => {
  const performanceId = req.params.id;

  // 1. Validate performanceId is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(performanceId)) {
    return next(new ApiError(400, "Invalid performance record ID"));
  }

  // 2. Find performance record by ID
  const performance = await Performance.findById(performanceId);
  if (!performance) {
    return next(new ApiError(404, "Performance record not found"));
  }

  // 3. Delete the performance record
  await Performance.findByIdAndDelete(performanceId);

  // 4. Send success response
  res.status(200).json({ message: "Performance record deleted successfully" });
});