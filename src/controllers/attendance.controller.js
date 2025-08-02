import Attendance from "../models/attendance.model.js";
import Labourer from "../models/labourer.model.js";
import ApiError from "../utils/error.js";
import catchAsyncHandler from "../middlewares/catchAsyncHandler.js";
import mongoose from "mongoose";
import { Parser as Json2csvParser } from "json2csv";

export const markAttendance = catchAsyncHandler(async (req, res, next) => {
  const { labourerId, projectId, date, shift, status, markedBy } = req.body;

  if (!labourerId || !projectId || !date || !shift || !status) {
    return next(
      new ApiError(
        400,
        "All fields (labourerId, projectId, date, shift, status) are required"
      )
    );
  }

  if (!mongoose.Types.ObjectId.isValid(labourerId)) {
    return next(new ApiError(400, "Invalid labourerId"));
  }
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return next(new ApiError(400, "Invalid projectId"));
  }
  if (markedBy && !mongoose.Types.ObjectId.isValid(markedBy)) {
    return next(new ApiError(400, "Invalid markedBy user ID"));
  }

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

  if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
    return next(new ApiError(400, "Invalid attendance ID"));
  }

  const allowedUpdates = [
    "labourerId",
    "projectId",
    "date",
    "shift",
    "status",
    "markedBy",
  ];

  const updates = {};
  allowedUpdates.forEach((field) => {
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
  if (updates.markedBy && !mongoose.Types.ObjectId.isValid(updates.markedBy)) {
    return next(new ApiError(400, "Invalid markedBy user ID"));
  }

  if (updates.shift) {
    const allowedShifts = ["morning", "evening", "night"];
    if (!allowedShifts.includes(updates.shift)) {
      return next(
        new ApiError(400, `Shift must be one of: ${allowedShifts.join(", ")}`)
      );
    }
  }

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

  if (updates.date && isNaN(new Date(updates.date).getTime())) {
    return next(new ApiError(400, "Invalid date format"));
  }

  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) {
    return next(new ApiError(404, "Attendance record not found"));
  }

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

  Object.assign(attendance, updates);

  await attendance.save();

  res.status(200).json({ attendance });
});

export const deleteAttendance = catchAsyncHandler(async (req, res, next) => {
  const attendanceId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
    return next(new ApiError(400, "Invalid attendance ID"));
  }

  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) {
    return next(new ApiError(404, "Attendance record not found"));
  }

  await Attendance.findByIdAndDelete(attendanceId);

  res.status(200).json({ message: "Attendance record deleted successfully" });
});

export const getAttendanceById = catchAsyncHandler(async (req, res, next) => {
  const attendanceId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
    return next(new ApiError(400, "Invalid attendance ID"));
  }

  const attendance = await Attendance.findById(attendanceId)
    .populate({ path: "labourerId", select: "fullName contactNumber" })
    .populate({ path: "projectId", select: "name location" })
    .populate({ path: "markedBy", select: "username email" });

  if (!attendance) {
    return next(new ApiError(404, "Attendance record not found"));
  }

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

    if (!mongoose.Types.ObjectId.isValid(labourerId)) {
      return next(new ApiError(400, "Invalid labourer ID"));
    }

    page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1; // (page, 10 ka mtlb = base 10 number system) (default page = 1 if input page < 0)
    limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
    const skip = (page - 1) * limit;

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

    const total = await Attendance.countDocuments(filters);

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

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return next(new ApiError(400, "Invalid project ID"));
    }

    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 20;
    const skip = (page - 1) * limit;

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

    const total = await Attendance.countDocuments(filters);

    const records = await Attendance.find(filters)
      .skip(skip)
      .limit(limit)
      .sort({ date: -1 })
      .populate({ path: "labourerId", select: "fullName contactNumber" })
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

//Function to get Attendance Details by Date
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

  if (!date) {
    return next(new ApiError(400, "Date query parameter is required"));
  }
  const queryDate = new Date(date);
  if (isNaN(queryDate.getTime())) {
    return next(new ApiError(400, "Invalid date format"));
  }

  page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
  limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
  const skip = (page - 1) * limit;

  const baseDate = new Date(date);
  const startOfDay = new Date(baseDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(baseDate);
  endOfDay.setHours(23, 59, 59, 999);

  const filters = {
    date: { $gte: startOfDay, $lte: endOfDay },
  };

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

  const total = await Attendance.countDocuments(filters);

  const records = await Attendance.find(filters)
    .skip(skip)
    .limit(limit)
    .sort({ date: -1 })
    .populate({ path: "labourerId", select: "fullName contactNumber" })
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
});

//Function to get Attendance Summary for a Labourer (total present, absent, halfday)
export const getLabourerAttendanceSummary = catchAsyncHandler(
  async (req, res, next) => {
    const { labourerId } = req.params;
    const { startDate, endDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(labourerId)) {
      return next(new ApiError(400, "Invalid labourer ID"));
    }

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

    const matchCondition = {
      labourerId: new mongoose.Types.ObjectId(labourerId),
    };
    if (startDate || endDate) {
      matchCondition.date = dateFilter;
    }

    const aggregationResult = await Attendance.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

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

    summary.totalRecords = aggregationResult.reduce(
      (sum, cur) => sum + cur.count,
      0
    );

    res.status(200).json({
      labourerId,
      summary,
      startDate: startDate || null,
      endDate: endDate || null,
    });
  }
);

//Function to get Attendance Summary for a project (Total present, absent, halfday)
export const getProjectAttendanceSummary = catchAsyncHandler(
  async (req, res, next) => {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return next(new ApiError(400, "Invalid project ID"));
    }

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

    const matchCondition = {
      projectId: new mongoose.Types.ObjectId(projectId),
    };
    if (startDate || endDate) {
      matchCondition.date = dateFilter;
    }

    const aggregationResult = await Attendance.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

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

// Function to Bulk Add Attendance
export const bulkAddAttendance = catchAsyncHandler(async (req, res, next) => {
  const { attendanceRecords } = req.body;

  if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
    return next(
      new ApiError(400, "attendanceRecords must be a non-empty array")
    );
  }

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

  let inserted = [];
  let failed = [...errors];

  try {
    inserted = await Attendance.insertMany(validRecords, { ordered: false });
  } catch (err) {
    if (err && err.writeErrors) {
      for (const we of err.writeErrors) {
        failed.push({
          idx: we.index,
          error: we.errmsg,
          record: validRecords[we.index],
        });
      }

      inserted = inserted.concat(err.result.insertedDocs || []);
    } else {
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

// Function to Download Bulk Attendance between a period
export const bulkDownloadAttendance = catchAsyncHandler(
  async (req, res, next) => {
    let { projectId, labourerId, status, shift, markedBy, startDate, endDate } =
      req.query;

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

    const records = await Attendance.find(filters)
      .limit(10000)
      .sort({ date: -1 })
      .populate({ path: "labourerId", select: "fullName contactNumber" })
      .populate({ path: "projectId", select: "name location" })
      .populate({ path: "markedBy", select: "username email" });

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

    const json2csvParser = new Json2csvParser({ fields });
    const csv = json2csvParser.parse(flat);

    res.header("Content-Type", "text/csv");
    res.attachment(`attendance_export_${Date.now()}.csv`);
    res.status(200).send(csv);
  }
);

// Attendance Dashboard for Manager/Admin
export const dashboardStats = catchAsyncHandler(async (req, res, next) => {
  let today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const totalLabourers = await Labourer.countDocuments({ status: "active" });

  const todayRecords = await Attendance.find({
    date: { $gte: startOfDay, $lte: endOfDay },
  });

  const present = todayRecords.filter((r) => r.status === "present").length;
  const absent = todayRecords.filter((r) => r.status === "absent").length;
  const halfDay = todayRecords.filter((r) => r.status === "half-day").length;

  const attendancePercent =
    totalLabourers > 0 ? (present / totalLabourers) * 100 : 0;

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
    last7Days,
  });
});
