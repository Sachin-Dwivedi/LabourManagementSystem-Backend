import Performance from "../models/performance.model.js";
import ApiError from "../utils/error.js";
import catchAsyncHandler from "../middlewares/catchAsyncHandler.js";
import mongoose from "mongoose";

// Create Performance Record
export const createPerformanceRecord = catchAsyncHandler(
  async (req, res, next) => {
    const { labourerId, projectId, date, performanceScore, remarks } = req.body;

    if (
      !labourerId ||
      !projectId ||
      !date ||
      performanceScore === undefined ||
      !remarks
    ) {
      return next(
        new ApiError(
          400,
          "labourerId, projectId, date, performanceScore, and remarks are required"
        )
      );
    }

    if (!mongoose.Types.ObjectId.isValid(labourerId)) {
      return next(new ApiError(400, "Invalid labourerId"));
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return next(new ApiError(400, "Invalid projectId"));
    }

    const perfDate = new Date(date);
    if (isNaN(perfDate)) {
      return next(new ApiError(400, "Invalid date"));
    }

    if (
      typeof performanceScore !== "number" ||
      performanceScore < 0 ||
      performanceScore > 100
    ) {
      return next(
        new ApiError(400, "performanceScore must be a number between 0 and 100")
      );
    }

    if (typeof remarks !== "string" || remarks.trim() === "") {
      return next(new ApiError(400, "Remarks must be a non-empty string"));
    }
    if (remarks.length > 1000) {
      return next(
        new ApiError(400, "Remarks must be at most 1000 characters long")
      );
    }

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

    const performanceRecord = await Performance.create({
      labourerId,
      projectId,
      date: perfDate,
      performanceScore,
      remarks: remarks.trim(),
    });

    res.status(201).json({ performanceRecord });
  }
);

// Update Performance Record by ID
export const updatePerformanceRecord = catchAsyncHandler(
  async (req, res, next) => {
    const performanceId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(performanceId)) {
      return next(new ApiError(400, "Invalid performance record ID"));
    }

    const allowedFields = [
      "labourerId",
      "projectId",
      "date",
      "performanceScore",
      "remarks",
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

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
          new ApiError(
            400,
            "performanceScore must be a number between 0 and 100"
          )
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

    const performanceRecord = await Performance.findById(performanceId);
    if (!performanceRecord) {
      return next(new ApiError(404, "Performance record not found"));
    }

    const labourerIdToCheck =
      updates.labourerId || performanceRecord.labourerId.toString();
    const projectIdToCheck =
      updates.projectId || performanceRecord.projectId.toString();
    const dateToCheck = updates.date || performanceRecord.date;

    if (updates.labourerId || updates.projectId || updates.date) {
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

    Object.assign(performanceRecord, updates);

    await performanceRecord.save();

    res.status(200).json({ performanceRecord });
  }
);

// Get Performance Record by ID
export const getPerformanceById = catchAsyncHandler(async (req, res, next) => {
  const performanceId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(performanceId)) {
    return next(new ApiError(400, "Invalid performance record ID"));
  }

  const performanceRecord = await Performance.findById(performanceId)
    .populate({ path: "labourerId", select: "fullName contactNumber" })
    .populate({ path: "projectId", select: "name location" });

  if (!performanceRecord) {
    return next(new ApiError(404, "Performance record not found"));
  }

  res.status(200).json({ performanceRecord });
});

// List Performance Records with filters and pagination
export const listPerformanceRecords = catchAsyncHandler(
  async (req, res, next) => {
    let {
      labourerId,
      projectId,
      startDate,
      endDate,
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

    const total = await Performance.countDocuments(filters);

    const records = await Performance.find(filters)
      .skip(skip)
      .limit(limit)
      .sort({ date: -1 })
      .populate({ path: "labourerId", select: "fullName contactNumber" })
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
  }
);

// View Performance Records by Labourer with optional filters and pagination
export const getPerformanceByLabourer = catchAsyncHandler(
  async (req, res, next) => {
    const { labourerId } = req.params;
    let { projectId, startDate, endDate, page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(labourerId)) {
      return next(new ApiError(400, "Invalid labourer ID"));
    }

    page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
    const skip = (page - 1) * limit;

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

    const total = await Performance.countDocuments(filters);

    const records = await Performance.find(filters)
      .skip(skip)
      .limit(limit)
      .sort({ date: -1 })
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
  }
);

// View Performance Records by Project with optional filters and pagination
export const getPerformanceByProject = catchAsyncHandler(
  async (req, res, next) => {
    const { projectId } = req.params;
    let { labourerId, startDate, endDate, page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return next(new ApiError(400, "Invalid project ID"));
    }

    page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
    const skip = (page - 1) * limit;

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

    const total = await Performance.countDocuments(filters);

    const records = await Performance.find(filters)
      .skip(skip)
      .limit(limit)
      .sort({ date: -1 })
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
  }
);

// Delete Performance Record by ID
export const deletePerformanceRecord = catchAsyncHandler(
  async (req, res, next) => {
    const performanceId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(performanceId)) {
      return next(new ApiError(400, "Invalid performance record ID"));
    }

    const performance = await Performance.findById(performanceId);
    if (!performance) {
      return next(new ApiError(404, "Performance record not found"));
    }

    await Performance.findByIdAndDelete(performanceId);

    res
      .status(200)
      .json({ message: "Performance record deleted successfully" });
  }
);
