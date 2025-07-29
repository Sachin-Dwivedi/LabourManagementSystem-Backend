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
    status,      // "pending" or "paid"
    payslipUrl,
    paymentDate  // optional, only if paid
  } = req.body;

  // 1. Validate required fields
  if (!labourerId || !startPeriod || !endPeriod || totalDaysPresent === undefined ||
      dailyWage === undefined || totalSalary === undefined || !status || !payslipUrl) {
    return next(new ApiError(400, "All required salary fields must be provided"));
  }

  // 2. Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(labourerId)) {
    return next(new ApiError(400, "Invalid labourerId"));
  }

  // 3. Validate dates
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

  // 4. Validate status and enums
  const allowedStatus = ["pending", "paid"];
  if (!allowedStatus.includes(status)) {
    return next(new ApiError(400, "Status must be 'pending' or 'paid'"));
  }

  // 5. Validate numbers are positive
  if (totalDaysPresent < 0 || dailyWage < 0 || totalSalary < 0) {
    return next(new ApiError(400, "Totals and wage must not be negative"));
  }

  // 6. Create the salary record
  const salaryData = {
    labourerId,
    startPeriod: start,
    endPeriod: end,
    totalDaysPresent,
    dailyWage,
    totalSalary,
    status,
    payslipUrl,
  };
  if (paymentDate) salaryData.paymentDate = new Date(paymentDate);

  const salary = await Salary.create(salaryData);

  res.status(201).json({ salary });
});

// Update Salary Record by ID
export const updateSalaryRecord = catchAsyncHandler(async (req, res, next) => {
  const salaryId = req.params.id;

  // 1. Validate salaryId
  if (!mongoose.Types.ObjectId.isValid(salaryId)) {
    return next(new ApiError(400, "Invalid salary record ID"));
  }

  // 2. Allowed fields for update
  const allowedFields = [
    "labourerId",
    "startPeriod",
    "endPeriod",
    "totalDaysPresent",
    "dailyWage",
    "totalSalary",
    "status",
    "payslipUrl",
    "paymentDate"
  ];

  // 3. Construct update object
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // 4. Validate individual fields
  if (updates.labourerId && !mongoose.Types.ObjectId.isValid(updates.labourerId)) {
    return next(new ApiError(400, "Invalid labourerId"));
  }

  if (updates.startPeriod && isNaN(new Date(updates.startPeriod))) {
    return next(new ApiError(400, "Invalid startPeriod"));
  }

  if (updates.endPeriod && isNaN(new Date(updates.endPeriod))) {
    return next(new ApiError(400, "Invalid endPeriod"));
  }

  if (updates.startPeriod && updates.endPeriod &&
      new Date(updates.startPeriod) > new Date(updates.endPeriod)) {
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

  // 5. Prepare to set date fields as Date objects if present
  if (updates.startPeriod) updates.startPeriod = new Date(updates.startPeriod);
  if (updates.endPeriod) updates.endPeriod = new Date(updates.endPeriod);
  if (updates.paymentDate) updates.paymentDate = new Date(updates.paymentDate);

  // 6. Find salary record
  const salary = await Salary.findById(salaryId);
  if (!salary) {
    return next(new ApiError(404, "Salary record not found"));
  }

  // 7. Assign updates
  Object.assign(salary, updates);

  // 8. Save updated record
  await salary.save();

  res.status(200).json({ salary });
});



// Get Salary Record by ID
export const getSalaryRecordById = catchAsyncHandler(async (req, res, next) => {
  const salaryId = req.params.id;

  // 1. Validate salaryId
  if (!mongoose.Types.ObjectId.isValid(salaryId)) {
    return next(new ApiError(400, "Invalid salary record ID"));
  }

  // 2. Find salary record and populate labourer data
  const salary = await Salary.findById(salaryId)
    .populate({ path: "labourerId", select: "fullName contactNumber" });

  // 3. If not found, send 404
  if (!salary) {
    return next(new ApiError(404, "Salary record not found"));
  }

  // 4. Return the salary record
  res.status(200).json({ salary });
});


// List Salary Records with Filters and Pagination
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

  // Parse pagination
  page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
  limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
  const skip = (page - 1) * limit;

  // Build filters
  const filters = {};

  // Filter by labourerId (project-wise, you may need to join Labourer<->Project separately if required)
  if (labourerId && mongoose.Types.ObjectId.isValid(labourerId)) {
    filters.labourerId = labourerId;
  }

  // Filter by status
  if (status) {
    const allowedStatus = ["pending", "paid"];
    if (!allowedStatus.includes(status)) {
      return next(new ApiError(400, "Status must be 'pending' or 'paid'"));
    }
    filters.status = status;
  }

  // Filter by salary period (overlap: includes salaries where period overlaps query)
  if (startPeriod || endPeriod) {
    filters.$and = [];
    if (startPeriod && !isNaN(new Date(startPeriod))) {
      filters.$and.push({ endPeriod: { $gte: new Date(startPeriod) } });
    }
    if (endPeriod && !isNaN(new Date(endPeriod))) {
      filters.$and.push({ startPeriod: { $lte: new Date(endPeriod) } });
    }
    // Remove $and if empty (in case both dates are invalid)
    if (filters.$and.length === 0) delete filters.$and;
  }

  // Filter by paymentDate (for paid salaries)
  if (paymentDate && !isNaN(new Date(paymentDate))) {
    const target = new Date(paymentDate);
    const startOfDay = new Date(target);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(target);
    endOfDay.setHours(23, 59, 59, 999);
    filters.paymentDate = { $gte: startOfDay, $lte: endOfDay };
  }

  // Count total for pagination
  const total = await Salary.countDocuments(filters);

  // Fetch records with pagination and populate labourer info
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
  const { paymentDate } = req.body; // optional, defaults to now

  // 1. Validate salaryId
  if (!mongoose.Types.ObjectId.isValid(salaryId)) {
    return next(new ApiError(400, "Invalid salary record ID"));
  }

  // 2. If paymentDate is provided, validate it
  let payDate = new Date();
  if (paymentDate) {
    const d = new Date(paymentDate);
    if (isNaN(d)) {
      return next(new ApiError(400, "Invalid paymentDate"));
    }
    payDate = d;
  }

  // 3. Find salary record
  const salary = await Salary.findById(salaryId);
  if (!salary) {
    return next(new ApiError(404, "Salary record not found"));
  }

  // 4. Update status and paymentDate
  salary.status = "paid";
  salary.paymentDate = payDate;

  await salary.save();

  res.status(200).json({ salary });
});



// Delete Salary Record by ID
export const deleteSalaryRecord = catchAsyncHandler(async (req, res, next) => {
  const salaryId = req.params.id;

  // 1. Validate salaryId
  if (!mongoose.Types.ObjectId.isValid(salaryId)) {
    return next(new ApiError(400, "Invalid salary record ID"));
  }

  // 2. Find salary record
  const salary = await Salary.findById(salaryId);
  if (!salary) {
    return next(new ApiError(404, "Salary record not found"));
  }

  // 3. Delete salary record
  await Salary.findByIdAndDelete(salaryId);

  // 4. Respond with success
  res.status(200).json({ message: "Salary record deleted successfully" });
});



// Update or Generate Payslip URL for a Salary Record
export const generatePayslipUrl = catchAsyncHandler(async (req, res, next) => {
  const salaryId = req.params.id;
  const { payslipUrl } = req.body;

  // 1. Validate salaryId
  if (!mongoose.Types.ObjectId.isValid(salaryId)) {
    return next(new ApiError(400, "Invalid salary record ID"));
  }

  // 2. Validate payslipUrl presence and type
  if (!payslipUrl || typeof payslipUrl !== "string") {
    return next(new ApiError(400, "payslipUrl must be a non-empty string"));
  }

  // 3. Find the salary record
  const salary = await Salary.findById(salaryId);
  if (!salary) {
    return next(new ApiError(404, "Salary record not found"));
  }

  // 4. Update the payslipUrl field
  salary.payslipUrl = payslipUrl;

  // 5. Save changes
  await salary.save();

  // 6. Return updated salary
  res.status(200).json({ salary });
});


// Get aggregated salary summary for a given labourer over an optional date range
export const salarySummaryByLabourer = catchAsyncHandler(async (req, res, next) => {
  const { labourerId } = req.params;
  const { startPeriod, endPeriod } = req.query;

  // 1. Validate labourerId
  if (!mongoose.Types.ObjectId.isValid(labourerId)) {
    return next(new ApiError(400, "Invalid labourer ID"));
  }

  // 2. Build date filter if provided
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

  // 3. Build match condition for aggregation
  const matchCondition = { labourerId: mongoose.Types.ObjectId(labourerId) };
  if (startPeriod || endPeriod) {
    matchCondition.startPeriod = dateFilter;
  }

  // 4. Aggregate salary info
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

  // 5. Prepare summary with defaults
  const summary = aggregationResult[0] || {
    totalPaid: 0,
    totalPending: 0,
    recordsCount: 0,
    totalDaysPresent: 0,
  };

  // 6. Return response
  res.status(200).json({
    labourerId,
    summary,
    startPeriod: startPeriod || null,
    endPeriod: endPeriod || null,
  });
});



// Get aggregated salary summary across all labourers for a given period
export const salarySummaryByPeriod = catchAsyncHandler(async (req, res, next) => {
  let { startPeriod, endPeriod } = req.query;

  // 1. Validate dates (optional but if provided, must be valid)
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

  // 2. Aggregate salary info across all records matching period filter
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

  // 3. Format result or default
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
});



// Generate salary for a given period (startPeriod, endPeriod) and possibly dailyWage (if constant)
export const generateSalaryForPeriod = catchAsyncHandler(async (req, res, next) => {
  const { startPeriod, endPeriod, dailyWage } = req.body;

  // Validate inputs
  if (!startPeriod || !endPeriod || dailyWage === undefined) {
    return next(new ApiError(400, "startPeriod, endPeriod, and dailyWage are required"));
  }

  const start = new Date(startPeriod);
  const end = new Date(endPeriod);

  if (isNaN(start) || isNaN(end)) {
    return next(new ApiError(400, "Invalid startPeriod or endPeriod date format"));
  }
  if (start > end) {
    return next(new ApiError(400, "startPeriod cannot be after endPeriod"));
  }
  if (typeof dailyWage !== "number" || dailyWage < 0) {
    return next(new ApiError(400, "dailyWage must be a positive number"));
  }

  // 1. Aggregate attendance data for all labourers in the period
  const attendanceAggregation = await Attendance.aggregate([
    {
      $match: {
        date: { $gte: start, $lte: end },
        status: "present", // considering only "present" days count
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
      message: "No attendance records found for the given period to generate salary.",
      generatedSalaries: [],
    });
  }

  // 2. Prepare salary records to be created, avoiding duplicates:
  // Check existing salary records for this period to avoid duplicates
  const labourerIds = attendanceAggregation.map((rec) => rec._id);

  const existingSalaries = await Salary.find({
    labourerId: { $in: labourerIds },
    startPeriod: { $eq: start },
    endPeriod: { $eq: end },
  }).select("labourerId");

  const existingLabourerIds = new Set(existingSalaries.map((s) => s.labourerId.toString()));

  // 3. Create salary records for labourers that do not have salary record yet for this period
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
      payslipUrl: "", // empty initially; admin can upload later
    }));

  if (salaryRecordsToCreate.length === 0) {
    return res.status(200).json({
      message: "Salary records for this period already generated for all labourers.",
      generatedSalaries: [],
    });
  }

  // 4. Bulk insert salary records
  const createdSalaries = await Salary.insertMany(salaryRecordsToCreate);

  res.status(201).json({
    message: `Generated salary records for ${createdSalaries.length} labourers`,
    generatedSalaries: createdSalaries,
  });
});



// View all salary/payslip details for a labourer with filters and pagination
export const viewSalaryPayslipDetailsForLabourer = catchAsyncHandler(async (req, res, next) => {
  const { labourerId } = req.params;
  let {
    startPeriod,
    endPeriod,
    status,
    page = 1,
    limit = 20,
  } = req.query;

  // 1. Validate labourerId
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
});





// Download Payslip using the payslip URL stored in the salary record
export const downloadPayslip = catchAsyncHandler(async (req, res, next) => {
  const salaryId = req.params.id;

  // 1. Validate salaryId
  if (!mongoose.Types.ObjectId.isValid(salaryId)) {
    return next(new ApiError(400, "Invalid salary record ID"));
  }

  // 2. Fetch the salary record
  const salary = await Salary.findById(salaryId);
  if (!salary) {
    return next(new ApiError(404, "Salary record not found"));
  }

  // 3. Check if payslipUrl exists
  if (!salary.payslipUrl || typeof salary.payslipUrl !== "string") {
    return next(new ApiError(404, "Payslip URL not set for this salary record"));
  }

  // 4. Redirect or proxy download (choose one depending on deployment)
  // --- Option 1: Redirect client to payslipUrl (if public)
  return res.redirect(salary.payslipUrl);

  // --- Option 2: Proxy file (if you want to stream/protect the file)
  // You'd use an HTTP request to fetch the file and then pipe it to response.
  // Example (if hosted on S3, Google Cloud, etc.), use 'axios' or native 'https' for proxying.
  // If you want this logic, let me know!
});