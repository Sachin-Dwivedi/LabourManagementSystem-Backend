import Salary from "../models/salary.model.js";
import Attendance from "../models/attendance.model.js";
import ApiError from "../utils/error.js";
import catchAsyncHandler from "../middlewares/catchAsyncHandler.js";
import mongoose from "mongoose";

// Create Salary Record
export const createSalaryRecord = catchAsyncHandler(async (req, res, next) => {
  const {
    labourerId,
    startPeriod,
    endPeriod,
    totalDaysPresent,
    dailyWage,
    totalSalary,
    status,
    paymentDate,
  } = req.body;

  if (
    !labourerId ||
    !startPeriod ||
    !endPeriod ||
    totalDaysPresent === undefined ||
    dailyWage === undefined ||
    totalSalary === undefined ||
    !status
  ) {
    return next(
      new ApiError(400, "All required salary fields must be provided")
    );
  }

  if (!mongoose.Types.ObjectId.isValid(labourerId)) {
    return next(new ApiError(400, "Invalid labourerId"));
  }

  const start = new Date(startPeriod);
  const end = new Date(endPeriod);
  if (isNaN(start) || isNaN(end)) {
    return next(new ApiError(400, "Invalid startPeriod or endPeriod"));
  }
  if (start > end) {
    return next(new ApiError(400, "startPeriod cannot be after endPeriod"));
  }
  if (paymentDate && isNaN(new Date(paymentDate))) {
    return next(new ApiError(400, "Invalid paymentDate"));
  }

  const allowedStatus = ["pending", "paid"];
  if (!allowedStatus.includes(status)) {
    return next(new ApiError(400, "Status must be 'pending' or 'paid'"));
  }

  if (totalDaysPresent < 0 || dailyWage < 0 || totalSalary < 0) {
    return next(new ApiError(400, "Totals and wage must not be negative"));
  }

  const salaryData = {
    labourerId,
    startPeriod: start,
    endPeriod: end,
    totalDaysPresent,
    dailyWage,
    totalSalary,
    status,
  };
  if (paymentDate) salaryData.paymentDate = new Date(paymentDate);

  const salary = await Salary.create(salaryData);

  res.status(201).json({ salary });
});

// Update Salary Record by ID
export const updateSalaryRecord = catchAsyncHandler(async (req, res, next) => {
  const salaryId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(salaryId)) {
    return next(new ApiError(400, "Invalid salary record ID"));
  }

  const allowedFields = [
    "labourerId",
    "startPeriod",
    "endPeriod",
    "totalDaysPresent",
    "dailyWage",
    "totalSalary",
    "status",
    "payslipUrl",
    "paymentDate",
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

  if (updates.startPeriod && isNaN(new Date(updates.startPeriod))) {
    return next(new ApiError(400, "Invalid startPeriod"));
  }

  if (updates.endPeriod && isNaN(new Date(updates.endPeriod))) {
    return next(new ApiError(400, "Invalid endPeriod"));
  }

  if (
    updates.startPeriod &&
    updates.endPeriod &&
    new Date(updates.startPeriod) > new Date(updates.endPeriod)
  ) {
    return next(new ApiError(400, "startPeriod cannot be after endPeriod"));
  }

  if (updates.paymentDate && isNaN(new Date(updates.paymentDate))) {
    return next(new ApiError(400, "Invalid paymentDate"));
  }

  if (updates.totalDaysPresent !== undefined && updates.totalDaysPresent < 0) {
    return next(new ApiError(400, "totalDaysPresent cannot be negative"));
  }
  if (updates.dailyWage !== undefined && updates.dailyWage < 0) {
    return next(new ApiError(400, "dailyWage cannot be negative"));
  }
  if (updates.totalSalary !== undefined && updates.totalSalary < 0) {
    return next(new ApiError(400, "totalSalary cannot be negative"));
  }

  if (updates.status) {
    const allowedStatus = ["pending", "paid"];
    if (!allowedStatus.includes(updates.status)) {
      return next(new ApiError(400, "Status must be 'pending' or 'paid'"));
    }
  }

  if (updates.startPeriod) updates.startPeriod = new Date(updates.startPeriod);
  if (updates.endPeriod) updates.endPeriod = new Date(updates.endPeriod);
  if (updates.paymentDate) updates.paymentDate = new Date(updates.paymentDate);

  const salary = await Salary.findById(salaryId);
  if (!salary) {
    return next(new ApiError(404, "Salary record not found"));
  }

  Object.assign(salary, updates);

  await salary.save();

  const updatedSalary = await Salary.findById(salaryId).populate({
    path: "labourerId",
    select: "fullName contactNumber",
  });

  res.status(200).json({ updatedSalary });
});

// Get Salary Record by ID
export const getSalaryRecordById = catchAsyncHandler(async (req, res, next) => {
  const salaryId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(salaryId)) {
    return next(new ApiError(400, "Invalid salary record ID"));
  }

  const salary = await Salary.findById(salaryId).populate({
    path: "labourerId",
    select: "fullName contactNumber",
  });

  if (!salary) {
    return next(new ApiError(404, "Salary record not found"));
  }

  res.status(200).json({ salary });
});

// List Salary Records for a Labourer
export const listSalaryRecords = catchAsyncHandler(async (req, res, next) => {
  let {
    labourerId,
    status,
    startPeriod,
    endPeriod,
    paymentDate,
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

  if (status) {
    const allowedStatus = ["pending", "paid"];
    if (!allowedStatus.includes(status)) {
      return next(new ApiError(400, "Status must be 'pending' or 'paid'"));
    }
    filters.status = status;
  }

  if (startPeriod || endPeriod) {
    filters.$and = [];
    if (startPeriod && !isNaN(new Date(startPeriod))) {
      filters.$and.push({ endPeriod: { $gte: new Date(startPeriod) } });
    }
    if (endPeriod && !isNaN(new Date(endPeriod))) {
      filters.$and.push({ startPeriod: { $lte: new Date(endPeriod) } });
    }

    if (filters.$and.length === 0) delete filters.$and;
  }

  if (paymentDate && !isNaN(new Date(paymentDate))) {
    const target = new Date(paymentDate);
    const startOfDay = new Date(target);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(target);
    endOfDay.setHours(23, 59, 59, 999);
    filters.paymentDate = { $gte: startOfDay, $lte: endOfDay };
  }

  const total = await Salary.countDocuments(filters);

  const records = await Salary.find(filters)
    .skip(skip)
    .limit(limit)
    .sort({ startPeriod: -1, endPeriod: -1 }) // will show latest periods first
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

// Mark Salary as Paid
export const markSalaryAsPaid = catchAsyncHandler(async (req, res, next) => {
  const salaryId = req.params.id;
  const { paymentDate } = req.body || {};

  if (!mongoose.Types.ObjectId.isValid(salaryId)) {
    return next(new ApiError(400, "Invalid salary record ID"));
  }

  let payDate = new Date();
  if (paymentDate) {
    const d = new Date(paymentDate);
    if (isNaN(d)) {
      return next(new ApiError(400, "Invalid paymentDate"));
    }
    payDate = d;
  }

  const salary = await Salary.findById(salaryId);
  if (!salary) {
    return next(new ApiError(404, "Salary record not found"));
  }

  salary.status = "paid";
  salary.paymentDate = payDate;

  await salary.save();

  res.status(200).json({ salary });
});

// Delete Salary Record by ID
export const deleteSalaryRecord = catchAsyncHandler(async (req, res, next) => {
  const salaryId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(salaryId)) {
    return next(new ApiError(400, "Invalid salary record ID"));
  }

  const salary = await Salary.findById(salaryId);
  if (!salary) {
    return next(new ApiError(404, "Salary record not found"));
  }

  await Salary.findByIdAndDelete(salaryId);

  res.status(200).json({ message: "Salary record deleted successfully" });
});

// Update or Generate Payslip URL for a Salary Record (still under development)
export const generatePayslipUrl = catchAsyncHandler(async (req, res, next) => {
  const salaryId = req.params.id;
  const { payslipUrl } = req.body;

  if (!mongoose.Types.ObjectId.isValid(salaryId)) {
    return next(new ApiError(400, "Invalid salary record ID"));
  }

  if (!payslipUrl || typeof payslipUrl !== "string") {
    return next(new ApiError(400, "payslipUrl must be a non-empty string"));
  }

  const salary = await Salary.findById(salaryId);
  if (!salary) {
    return next(new ApiError(404, "Salary record not found"));
  }

  salary.payslipUrl = payslipUrl;

  await salary.save();

  res.status(200).json({ salary });
});

// Salary summary for a given labourer over a date range
export const salarySummaryByLabourer = catchAsyncHandler(
  async (req, res, next) => {
    const { labourerId } = req.params;
    const { startPeriod, endPeriod } = req.query;

    if (!mongoose.Types.ObjectId.isValid(labourerId)) {
      return next(new ApiError(400, "Invalid labourer ID"));
    }

    const dateFilter = {};
    if (startPeriod) {
      const start = new Date(startPeriod);
      if (isNaN(start)) {
        return next(new ApiError(400, "Invalid startPeriod"));
      }
      dateFilter.$gte = start;
    }
    if (endPeriod) {
      const end = new Date(endPeriod);
      if (isNaN(end)) {
        return next(new ApiError(400, "Invalid endPeriod"));
      }
      dateFilter.$lte = end;
    }

    const matchCondition = {
      labourerId: new mongoose.Types.ObjectId(labourerId),
    };
    if (startPeriod || endPeriod) {
      matchCondition.startPeriod = dateFilter;
    }

    const aggregationResult = await Salary.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalPaid: {
            $sum: {
              $cond: [{ $eq: ["$status", "paid"] }, "$totalSalary", 0],
            },
          },
          totalPending: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, "$totalSalary", 0],
            },
          },
          recordsCount: { $sum: 1 },
          totalDaysPresent: { $sum: "$totalDaysPresent" },
        },
      },
    ]);

    const summary = aggregationResult[0] || {
      totalPaid: 0,
      totalPending: 0,
      recordsCount: 0,
      totalDaysPresent: 0,
    };

    res.status(200).json({
      labourerId,
      summary,
      startPeriod: startPeriod || null,
      endPeriod: endPeriod || null,
    });
  }
);

// Get aggregated salary summary across all labourers for a given period
export const salarySummaryByPeriod = catchAsyncHandler(
  async (req, res, next) => {
    let { startPeriod, endPeriod } = req.query;

    const matchCondition = {};

    if (startPeriod) {
      const start = new Date(startPeriod);
      if (isNaN(start)) return next(new ApiError(400, "Invalid startPeriod"));
      matchCondition.endPeriod = { ...matchCondition.endPeriod, $gte: start };
    }

    if (endPeriod) {
      const end = new Date(endPeriod);
      if (isNaN(end)) return next(new ApiError(400, "Invalid endPeriod"));
      matchCondition.startPeriod = { ...matchCondition.startPeriod, $lte: end };
    }

    const aggregationResult = await Salary.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalPaid: {
            $sum: {
              $cond: [{ $eq: ["$status", "paid"] }, "$totalSalary", 0],
            },
          },
          totalPending: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, "$totalSalary", 0],
            },
          },
          recordsCount: { $sum: 1 },
          totalDaysPresent: { $sum: "$totalDaysPresent" },
        },
      },
    ]);

    const summary = aggregationResult[0] || {
      totalPaid: 0,
      totalPending: 0,
      recordsCount: 0,
      totalDaysPresent: 0,
    };

    res.status(200).json({
      summary,
      startPeriod: startPeriod || null,
      endPeriod: endPeriod || null,
    });
  }
);

// Generate salary for a given period (startPeriod, endPeriod) and possibly dailyWage
export const generateSalaryForPeriod = catchAsyncHandler(
  async (req, res, next) => {
    const { startPeriod, endPeriod, dailyWage } = req.body;

    if (!startPeriod || !endPeriod || dailyWage === undefined) {
      return next(
        new ApiError(400, "startPeriod, endPeriod, and dailyWage are required")
      );
    }

    const start = new Date(startPeriod);
    const end = new Date(endPeriod);

    if (isNaN(start) || isNaN(end)) {
      return next(
        new ApiError(400, "Invalid startPeriod or endPeriod date format")
      );
    }
    if (start > end) {
      return next(new ApiError(400, "startPeriod cannot be after endPeriod"));
    }
    if (typeof dailyWage !== "number" || dailyWage < 0) {
      return next(new ApiError(400, "dailyWage must be a positive number"));
    }

    const attendanceAggregation = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end },
          status: "present",
        },
      },
      {
        $group: {
          _id: "$labourerId",
          totalDaysPresent: { $sum: 1 },
        },
      },
    ]);

    if (!attendanceAggregation.length) {
      return res.status(200).json({
        message:
          "No attendance records found for the given period to generate salary.",
        generatedSalaries: [],
      });
    }

    const labourerIds = attendanceAggregation.map((rec) => rec._id);

    const existingSalaries = await Salary.find({
      labourerId: { $in: labourerIds },
      startPeriod: { $eq: start },
      endPeriod: { $eq: end },
    }).select("labourerId");

    const existingLabourerIds = new Set(
      existingSalaries.map((s) => s.labourerId.toString())
    );

    const salaryRecordsToCreate = attendanceAggregation
      .filter((rec) => !existingLabourerIds.has(rec._id.toString()))
      .map((rec) => ({
        labourerId: rec._id,
        startPeriod: start,
        endPeriod: end,
        totalDaysPresent: rec.totalDaysPresent,
        dailyWage,
        totalSalary: rec.totalDaysPresent * dailyWage,
        status: "pending",
        payslipUrl: "",
      }));

    if (salaryRecordsToCreate.length === 0) {
      return res.status(200).json({
        message:
          "Salary records for this period already generated for all labourers.",
        generatedSalaries: [],
      });
    }

    const createdSalaries = await Salary.insertMany(salaryRecordsToCreate);

    res.status(201).json({
      message: `Generated salary records for ${createdSalaries.length} labourers`,
      generatedSalaries: createdSalaries,
    });
  }
);

// View all salary/payslip details for a labourer (Under Development)
export const viewSalaryPayslipDetailsForLabourer = catchAsyncHandler(
  async (req, res, next) => {
    const { labourerId } = req.params;
    let { startPeriod, endPeriod, status, page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(labourerId)) {
      return next(new ApiError(400, "Invalid labourer ID"));
    }

    // 2. Prepare filters
    const filters = { labourerId };

    // Filter by status
    if (status) {
      const allowedStatus = ["pending", "paid"];
      if (!allowedStatus.includes(status)) {
        return next(new ApiError(400, "Status must be 'pending' or 'paid'"));
      }
      filters.status = status;
    }

    // Filter by salary period overlap (records for which period overlaps query)
    if (startPeriod || endPeriod) {
      filters.$and = [];
      if (startPeriod && !isNaN(new Date(startPeriod))) {
        filters.$and.push({ endPeriod: { $gte: new Date(startPeriod) } });
      }
      if (endPeriod && !isNaN(new Date(endPeriod))) {
        filters.$and.push({ startPeriod: { $lte: new Date(endPeriod) } });
      }
      if (filters.$and.length === 0) delete filters.$and;
    }

    // 3. Pagination
    page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
    const skip = (page - 1) * limit;

    // 4. Count total for pagination
    const total = await Salary.countDocuments(filters);

    // 5. Find matching salary records, most recent first, populate labourer
    const records = await Salary.find(filters)
      .skip(skip)
      .limit(limit)
      .sort({ startPeriod: -1, endPeriod: -1 })
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

// Download Payslip using the payslip URL stored in the salary record (Under Development)
export const downloadPayslip = catchAsyncHandler(async (req, res, next) => {
  const salaryId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(salaryId)) {
    return next(new ApiError(400, "Invalid salary record ID"));
  }

  const salary = await Salary.findById(salaryId);
  if (!salary) {
    return next(new ApiError(404, "Salary record not found"));
  }

  if (!salary.payslipUrl || typeof salary.payslipUrl !== "string") {
    return next(
      new ApiError(404, "Payslip URL not set for this salary record")
    );
  }
  return res.redirect(salary.payslipUrl);
});
