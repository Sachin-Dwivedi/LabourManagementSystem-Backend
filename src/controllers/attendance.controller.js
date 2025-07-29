import Attendance from "../models/attendance.model.js";
import ApiError from "../utils/error.js";
import catchAsyncHandler from "../middlewares/catchAsyncHandler.js";
import mongoose from "mongoose";
import { Parser as Json2csvParser } from "json2csv";

export const markAttendance = catchAsyncHandler(async (req, res, next) => {
  const { labourerId, projectId, date, shift, status, markedBy } = req.body;

  // 1. Validate required fields
  if (!labourerId || !projectId || !date || !shift || !status) {
    return next(
      new ApiError(
        400,
        "All fields (labourerId, projectId, date, shift, status) are required"
      )
    );
  }

  // 2. Validate ObjectIds
  if (!mongoose.Types.ObjectId.isValid(labourerId)) {
    return next(new ApiError(400, "Invalid labourerId"));
  }
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return next(new ApiError(400, "Invalid projectId"));
  }
  if (markedBy && !mongoose.Types.ObjectId.isValid(markedBy)) {
    return next(new ApiError(400, "Invalid markedBy user ID"));
  }

  // 3. Check for duplicate (enforce uniqueness)
  const exists = await Attendance.findOne({
    labourerId,
    projectId,
    date: new Date(date),
    shift,
  });
  if (exists) {
    return next(
      new ApiError(
        409,
        "Attendance already marked for this labourer, project, date, and shift"
      )
    );
  }

  // 4. Create the attendance record
  const attendance = await Attendance.create({
    labourerId,
    projectId,
    date: new Date(date),
    shift,
    status,
    markedBy,
  });

  res.status(201).json({ attendance });
});

export const updateAttendance = catchAsyncHandler(async (req, res, next) => {
  const attendanceId = req.params.id;

  // 1. Validate attendance ID
  if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
    return next(new ApiError(400, "Invalid attendance ID"));
  }

  // 2. Allowed fields for update
  const allowedUpdates = [
    "labourerId",
    "projectId",
    "date",
    "shift",
    "status",
    "markedBy",
  ];

  // 3. Extract update data and validate allowed fields only
  const updates = {};
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // 4. Validate ObjectId fields if present
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
  if (updates.markedBy && !mongoose.Types.ObjectId.isValid(updates.markedBy)) {
    return next(new ApiError(400, "Invalid markedBy user ID"));
  }

  // 5. Validate shift if provided
  if (updates.shift) {
    const allowedShifts = ["morning", "evening", "night"];
    if (!allowedShifts.includes(updates.shift)) {
      return next(
        new ApiError(400, `Shift must be one of: ${allowedShifts.join(", ")}`)
      );
    }
  }

  // 6. Validate status if provided
  if (updates.status) {
    const allowedStatuses = ["present", "absent", "half-day"];
    if (!allowedStatuses.includes(updates.status)) {
      return next(
        new ApiError(
          400,
          `Status must be one of: ${allowedStatuses.join(", ")}`
        )
      );
    }
  }

  // 7. Validate date if provided
  if (updates.date && isNaN(new Date(updates.date).getTime())) {
    return next(new ApiError(400, "Invalid date format"));
  }

  // 8. Find existing attendance record
  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) {
    return next(new ApiError(404, "Attendance record not found"));
  }

  // 9. If unique keys might change, check for duplicate conflict
  if (
    updates.labourerId ||
    updates.projectId ||
    updates.date ||
    updates.shift
  ) {
    const labourerIdToCheck = updates.labourerId || attendance.labourerId;
    const projectIdToCheck = updates.projectId || attendance.projectId;
    const dateToCheck = updates.date ? new Date(updates.date) : attendance.date;
    const shiftToCheck = updates.shift || attendance.shift;

    const existing = await Attendance.findOne({
      _id: { $ne: attendanceId },
      labourerId: labourerIdToCheck,
      projectId: projectIdToCheck,
      date: dateToCheck,
      shift: shiftToCheck,
    });

    if (existing) {
      return next(
        new ApiError(
          409,
          "Another attendance record exists for this labourer, project, date, and shift"
        )
      );
    }
  }

  // 10. Apply updates
  Object.assign(attendance, updates);

  // 11. Save
  await attendance.save();

  // 12. Return updated attendance record
  res.status(200).json({ attendance });
});

export const deleteAttendance = catchAsyncHandler(async (req, res, next) => {
  const attendanceId = req.params.id;

  // 1. Validate attendance ID
  if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
    return next(new ApiError(400, "Invalid attendance ID"));
  }

  // 2. Find attendance record by ID
  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) {
    return next(new ApiError(404, "Attendance record not found"));
  }

  // 3. Delete attendance record
  await Attendance.findByIdAndDelete(attendanceId);

  // 4. Respond with success
  res.status(200).json({ message: "Attendance record deleted successfully" });
});

export const getAttendanceById = catchAsyncHandler(async (req, res, next) => {
  const attendanceId = req.params.id;

  // 1. Validate attendance ID
  if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
    return next(new ApiError(400, "Invalid attendance ID"));
  }

  // 2. Find attendance by ID and populate references
  const attendance = await Attendance.findById(attendanceId)
    .populate({ path: "labourerId", select: "fullName contactNumber" })
    .populate({ path: "projectId", select: "name location" })
    .populate({ path: "markedBy", select: "username email" });

  // 3. Handle not found
  if (!attendance) {
    return next(new ApiError(404, "Attendance record not found"));
  }

  // 4. Return found attendance
  res.status(200).json({ attendance });
});
export const getAttendanceByLabourer = catchAsyncHandler(
  async (req, res, next) => {
    const { labourerId } = req.params;
    let {
      projectId,
      status,
      shift,
      markedBy,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    // Validate labourerId
    if (!mongoose.Types.ObjectId.isValid(labourerId)) {
      return next(new ApiError(400, "Invalid labourer ID"));
    }

    // Pagination
    page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1; // (page, 10 ka mtlb = base 10 number system) (default page = 1 if input page < 0)
    limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
    const skip = (page - 1) * limit;

    // Build filters
    const filters = { labourerId };

    if (projectId && mongoose.Types.ObjectId.isValid(projectId))
      filters.projectId = projectId;
    if (status && ["present", "absent", "half-day"].includes(status))
      filters.status = status;
    if (shift && ["morning", "evening", "night"].includes(shift))
      filters.shift = shift;
    if (markedBy && mongoose.Types.ObjectId.isValid(markedBy))
      filters.markedBy = markedBy;
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
    }

    // Count for pagination
    const total = await Attendance.countDocuments(filters);

    // Fetch records with pagination and populate references
    const records = await Attendance.find(filters)
      .skip(skip)
      .limit(limit)
      .sort({ date: -1 })
      .populate({ path: "projectId", select: "name location" })
      .populate({ path: "markedBy", select: "username email" });

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

export const getAttendanceByProject = catchAsyncHandler(
  async (req, res, next) => {
    const { projectId } = req.params;
    let {
      labourerId,
      status,
      shift,
      markedBy,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    // Validate projectId
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return next(new ApiError(400, "Invalid project ID"));
    }

    // Parse pagination params
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 20;
    const skip = (page - 1) * limit;

    // Build filters with required projectId
    const filters = { projectId };

    if (labourerId && mongoose.Types.ObjectId.isValid(labourerId)) {
      filters.labourerId = labourerId;
    }

    if (status && ["present", "absent", "half-day"].includes(status)) {
      filters.status = status;
    }

    if (shift && ["morning", "evening", "night"].includes(shift)) {
      filters.shift = shift;
    }

    if (markedBy && mongoose.Types.ObjectId.isValid(markedBy)) {
      filters.markedBy = markedBy;
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
    }

    // Count total matching records
    const total = await Attendance.countDocuments(filters);

    // Fetch paginated attendance records with populated references
    const records = await Attendance.find(filters)
      .skip(skip)
      .limit(limit)
      .sort({ date: -1 })
      .populate({ path: "labourerId", select: "fullName contactNumber" })
      .populate({ path: "markedBy", select: "username email" });

    // Respond with data and pagination meta
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

export const getAttendanceByDate = catchAsyncHandler(async (req, res, next) => {
  let {
    date,
    labourerId,
    projectId,
    status,
    shift,
    markedBy,
    page = 1,
    limit = 20,
  } = req.query;

  // 1. Validate date presence and correctness
  if (!date) {
    return next(new ApiError(400, "Date query parameter is required"));
  }
  const queryDate = new Date(date);
  if (isNaN(queryDate.getTime())) {
    return next(new ApiError(400, "Invalid date format"));
  }

  // Normalize pagination params
  page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
  limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
  const skip = (page - 1) * limit;

  // 2. Build filters: For date, it’s good to match on the full day.
  // This means date >= start of day AND date < next day start
  const baseDate = new Date(date);
  const startOfDay = new Date(baseDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(baseDate);
  endOfDay.setHours(23, 59, 59, 999);

  const filters = {
    date: { $gte: startOfDay, $lte: endOfDay },
  };

  // 3. Validate and add other filters
  if (labourerId) {
    if (!mongoose.Types.ObjectId.isValid(labourerId)) {
      return next(new ApiError(400, "Invalid labourerId"));
    }
    filters.labourerId = labourerId;
  }

  if (projectId) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return next(new ApiError(400, "Invalid projectId"));
    }
    filters.projectId = projectId;
  }

  if (status) {
    const allowedStatuses = ["present", "absent", "half-day"];
    if (!allowedStatuses.includes(status)) {
      return next(
        new ApiError(
          400,
          `Status must be one of: ${allowedStatuses.join(", ")}`
        )
      );
    }
    filters.status = status;
  }

  if (shift) {
    const allowedShifts = ["morning", "evening", "night"];
    if (!allowedShifts.includes(shift)) {
      return next(
        new ApiError(400, `Shift must be one of: ${allowedShifts.join(", ")}`)
      );
    }
    filters.shift = shift;
  }

  if (markedBy) {
    if (!mongoose.Types.ObjectId.isValid(markedBy)) {
      return next(new ApiError(400, "Invalid markedBy user ID"));
    }
    filters.markedBy = markedBy;
  }

  // 4. Count matching records
  const total = await Attendance.countDocuments(filters);

  // 5. Query attendance records with pagination, sorting, and populate
  const records = await Attendance.find(filters)
    .skip(skip)
    .limit(limit)
    .sort({ date: -1 })
    .populate({ path: "labourerId", select: "fullName contactNumber" })
    .populate({ path: "projectId", select: "name location" })
    .populate({ path: "markedBy", select: "username email" });

  // 6. Return response with metadata
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

export const getLabourerAttendanceSummary = catchAsyncHandler(
  async (req, res, next) => {
    const { labourerId } = req.params;
    const { startDate, endDate } = req.query;

    // 1. Validate labourer ID
    if (!mongoose.Types.ObjectId.isValid(labourerId)) {
      return next(new ApiError(400, "Invalid labourer ID"));
    }

    // 2. Build date filter if startDate and/or endDate are provided
    const dateFilter = {};
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start)) {
        return next(new ApiError(400, "Invalid startDate"));
      }
      dateFilter.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end)) {
        return next(new ApiError(400, "Invalid endDate"));
      }
      dateFilter.$lte = end;
    }

    // 3. Build match condition for aggregation
    const matchCondition = { labourerId: mongoose.Types.ObjectId(labourerId) };
    if (startDate || endDate) {
      matchCondition.date = dateFilter;
    }

    // 4. Run aggregation to count attendance by status
    const aggregationResult = await Attendance.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // 5. Convert aggregation result into summary object
    // Initialize counts to zero
    const summary = {
      present: 0,
      absent: 0,
      halfDay: 0,
    };

    aggregationResult.forEach(({ _id, count }) => {
      if (_id === "present") summary.present = count;
      else if (_id === "absent") summary.absent = count;
      else if (_id === "half-day") summary.halfDay = count;
    });

    // 6. Optionally, total records count
    summary.totalRecords = aggregationResult.reduce(
      (sum, cur) => sum + cur.count,
      0
    );

    // 7. Send response
    res.status(200).json({
      labourerId,
      summary,
      startDate: startDate || null,
      endDate: endDate || null,
    });
  }
);

export const getProjectAttendanceSummary = catchAsyncHandler(
  async (req, res, next) => {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    // 1. Validate projectId
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return next(new ApiError(400, "Invalid project ID"));
    }

    // 2. Build date filter if provided
    const dateFilter = {};
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start)) {
        return next(new ApiError(400, "Invalid startDate"));
      }
      dateFilter.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end)) {
        return next(new ApiError(400, "Invalid endDate"));
      }
      dateFilter.$lte = end;
    }

    // 3. Build match condition
    const matchCondition = { projectId: mongoose.Types.ObjectId(projectId) };
    if (startDate || endDate) {
      matchCondition.date = dateFilter;
    }

    // 4. Aggregate attendance counts by status
    const aggregationResult = await Attendance.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // 5. Format result into summary object
    const summary = {
      present: 0,
      absent: 0,
      halfDay: 0,
    };

    aggregationResult.forEach(({ _id, count }) => {
      if (_id === "present") summary.present = count;
      else if (_id === "absent") summary.absent = count;
      else if (_id === "half-day") summary.halfDay = count;
    });

    // Optionally total count for all statuses
    summary.totalRecords = aggregationResult.reduce(
      (sum, cur) => sum + cur.count,
      0
    );

    res.status(200).json({
      projectId,
      summary,
      startDate: startDate || null,
      endDate: endDate || null,
    });
  }
);

// Bulk Add Attendance
export const bulkAddAttendance = catchAsyncHandler(async (req, res, next) => {
  const { attendanceRecords } = req.body;

  // 1. Input must be array
  if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
    return next(
      new ApiError(400, "attendanceRecords must be a non-empty array")
    );
  }

  // 2. Build an array of valid records & track errors
  const validRecords = [];
  const errors = [];

  attendanceRecords.forEach((rec, idx) => {
    const { labourerId, projectId, date, shift, status, markedBy } = rec || {};
    let valid = true;
    let error = "";

    if (!labourerId || !mongoose.Types.ObjectId.isValid(labourerId)) {
      valid = false;
      error = "Missing/invalid labourerId";
    }
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      valid = false;
      error = "Missing/invalid projectId";
    }
    if (!date || isNaN(new Date(date))) {
      valid = false;
      error = "Missing/invalid date";
    }
    const allowedShifts = ["morning", "evening", "night"];
    if (!shift || !allowedShifts.includes(shift)) {
      valid = false;
      error = "Missing/invalid shift";
    }
    const allowedStatuses = ["present", "absent", "half-day"];
    if (!status || !allowedStatuses.includes(status)) {
      valid = false;
      error = "Missing/invalid status";
    }
    if (markedBy && !mongoose.Types.ObjectId.isValid(markedBy)) {
      valid = false;
      error = "Invalid markedBy";
    }

    if (valid) {
      validRecords.push({
        labourerId,
        projectId,
        date: new Date(date),
        shift,
        status,
        markedBy,
      });
    } else {
      errors.push({ idx, error, record: rec });
    }
  });

  if (validRecords.length === 0) {
    return next(
      new ApiError(
        400,
        `No valid attendance records to add. ${errors.length} failed validation.`
      )
    );
  }

  // 3. Bulk Insert (ordered: false = continue on error)
  let inserted = [];
  let failed = [...errors];

  try {
    inserted = await Attendance.insertMany(validRecords, { ordered: false });
  } catch (err) {
    // Find duplicate or validation errors in err.writeErrors
    if (err && err.writeErrors) {
      for (const we of err.writeErrors) {
        failed.push({
          idx: we.index,
          error: we.errmsg,
          record: validRecords[we.index],
        });
      }
      // Successfully inserted docs are in err.result.result.nInserted
      inserted = inserted.concat(err.result.insertedDocs || []);
    } else {
      // Unexpected error
      return next(
        new ApiError(500, "Bulk insert failed: " + (err.message || err))
      );
    }
  }

  res.status(201).json({
    message: "Bulk attendance insert complete",
    insertedCount: inserted.length,
    failedCount: failed.length,
    failedRecords: failed,
  });
});

export const bulkDownloadAttendance = catchAsyncHandler(
  async (req, res, next) => {
    let { projectId, labourerId, status, shift, markedBy, startDate, endDate } =
      req.query;

    // Build filters (same as listAttendance)
    const filters = {};

    if (labourerId && mongoose.Types.ObjectId.isValid(labourerId))
      filters.labourerId = labourerId;
    if (projectId && mongoose.Types.ObjectId.isValid(projectId))
      filters.projectId = projectId;
    if (status && ["present", "absent", "half-day"].includes(status))
      filters.status = status;
    if (shift && ["morning", "evening", "night"].includes(shift))
      filters.shift = shift;
    if (markedBy && mongoose.Types.ObjectId.isValid(markedBy))
      filters.markedBy = markedBy;
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
    }

    // Fetch records (no pagination, but limit for sanity)
    const records = await Attendance.find(filters)
      .limit(10000) // avoid massive downloads; adjust as needed
      .sort({ date: -1 })
      .populate({ path: "labourerId", select: "fullName contactNumber" })
      .populate({ path: "projectId", select: "name location" })
      .populate({ path: "markedBy", select: "username email" });

    // Prepare for CSV: flatten deeply nested fields
    const flat = records.map((rec) => ({
      Date: rec.date?.toISOString().split("T")[0] || "",
      Shift: rec.shift,
      Status: rec.status,
      LabourerName: rec.labourerId?.fullName || "",
      LabourerContact: rec.labourerId?.contactNumber || "",
      ProjectName: rec.projectId?.name || "",
      ProjectLocation: rec.projectId?.location || "",
      MarkedBy: rec.markedBy?.username || "",
      MarkedByEmail: rec.markedBy?.email || "",
      RecordId: rec._id?.toString(),
    }));

    const fields = Object.keys(flat[0] || {});

    // CSV Conversion
    const json2csvParser = new Json2csvParser({ fields });
    const csv = json2csvParser.parse(flat);

    // Set response headers for download
    res.header("Content-Type", "text/csv");
    res.attachment(`attendance_export_${Date.now()}.csv`);
    res.status(200).send(csv);
  }
);

export const dashboardStats = catchAsyncHandler(async (req, res, next) => {
  // 1. Determine date range (default: today)
  let today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  // 2. Get total labourers
  const totalLabourers = await Labourer.countDocuments({ status: "active" });

  // 3. Get today's attendance records
  const todayRecords = await Attendance.find({
    date: { $gte: startOfDay, $lte: endOfDay },
  });

  // 4. Count by status
  const present = todayRecords.filter((r) => r.status === "present").length;
  const absent = todayRecords.filter((r) => r.status === "absent").length;
  const halfDay = todayRecords.filter((r) => r.status === "half-day").length;

  // 5. Calculate attendance percentage
  const attendancePercent =
    totalLabourers > 0 ? (present / totalLabourers) * 100 : 0;

  // Optionally, gather last 7 days trend
  let last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const sD = new Date(d.setHours(0, 0, 0, 0));
    const eD = new Date(d.setHours(23, 59, 59, 999));
    const dayRecords = await Attendance.find({ date: { $gte: sD, $lte: eD } });
    const dayPresent = dayRecords.filter((r) => r.status === "present").length;
    last7Days.push({ date: sD, present: dayPresent });
  }

  res.status(200).json({
    totalLabourers,
    present,
    absent,
    halfDay,
    attendancePercent: Math.round(attendancePercent * 100) / 100,
    last7Days, // Array for basic trends (date, present count)
  });
});
