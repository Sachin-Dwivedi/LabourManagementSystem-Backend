import Labourer from "../models/labourer.model.js";
import Attendance from "../models/attendance.model.js";
import Project from "../models/project.model.js"; // Assuming you have this model
import ApiError from "../utils/error.js";
import catchAsyncHandler from "../middlewares/catchAsyncHandler.js";
import mongoose from "mongoose";

export const createLabourer = catchAsyncHandler(async (req, res, next) => {
  console.log("req.body : ", req.body);
  
  const {
    userId,
    fullName,
    age,
    gender,
    contactNumber,
    address,
    assignedProjectId,
    joiningDate,
    skillType,
    status
  } = req.body;

  // 1. Validate required text fields
  if (
    !fullName ||
    !age ||
    !gender ||
    !contactNumber ||
    !address ||
    !skillType
  ) {
    return next(
      new ApiError(400, "Please provide all required labourer details")
    );
  }

  // 2. Validate ObjectId fields if provided
  if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
    return next(new ApiError(400, "Invalid userId"));
  }
  if (
    assignedProjectId &&
    !mongoose.Types.ObjectId.isValid(assignedProjectId)
  ) {
    return next(new ApiError(400, "Invalid assignedProjectId"));
  }

  // 3. Prevent user duplication
  if (userId) {
    const existingLabourer = await Labourer.findOne({ userId });
    if (existingLabourer) {
      return next(
        new ApiError(409, "Labourer profile already exists for this user")
      );
    }
  }

  // // 4. Handle file upload
  // let profilePhoto = null;
  // if (req.file) {
  //   // Upload to Cloudinary
  //   const uploaded = await new Promise((resolve, reject) => {
  //     const stream = cloudinary.uploader.upload_stream(
  //       { folder: "labourer-profiles" },
  //       (error, result) => {
  //         if (error || !result) return reject(error || new Error("Cloudinary upload failed"));
  //         resolve(result);
  //       }
  //     );
  //     stream.end(req.file.buffer);
  //   });
  //   profilePhoto = {
  //     publicId: uploaded.public_id,
  //     url: uploaded.secure_url,
  //   };
  // }

  // 5. Create labourer in DB
  const labourer = await Labourer.create({
    userId,
    fullName,
    age,
    gender,
    contactNumber,
    address,
    assignedProjectId,
    joiningDate,
    skillType,
    status,
  });

  res.status(201).json({ labourer });
});

export const getLabourerById = catchAsyncHandler(async (req, res, next) => {
  const labourerId = req.params.id;

  // 1. Validate labourerId
  if (!mongoose.Types.ObjectId.isValid(labourerId)) {
    return next(new ApiError(400, "Invalid labourer ID"));
  }

  // 2. Find labourer by ID, and populate userId and assignedProjectId refs (optional)
  const labourer = await Labourer.findById(labourerId)
    .populate({ path: "userId", select: "username email role" })
    .populate({ path: "assignedProjectId", select: "name location startDate endDate" });

  if (!labourer) {
    return next(new ApiError(404, "Labourer not found"));
  }

  // 3. Return labourer data
  res.status(200).json({ labourer });
});
export const updateLabourer = catchAsyncHandler(async (req, res, next) => {
  const { id: labourerId } = req.params;

  // 1. Validate labourer ID
  if (!mongoose.Types.ObjectId.isValid(labourerId)) {
    return next(new ApiError(400, "Invalid labourer ID"));
  }

  // 2. Allowed update fields
  const allowedFields = [
  "fullName",
  "age",
  "gender",
  "contactNumber",
  "address",
  "assignedProjectId",
  "joiningDate",
  "skillType",
  "status",
];

  // 3. Extract updates from req.body (only allowed fields)
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // 4. Validate enums
  if (updates.gender) {
    const allowedGenders = ["male", "female", "others"];
    if (!allowedGenders.includes(updates.gender.toLowerCase())) {
      return next(new ApiError(400, `Gender must be one of: ${allowedGenders.join(", ")}`));
    }
    updates.gender = updates.gender.toLowerCase();
  }

  if (updates.status) {
    const allowedStatuses = ["active", "inactive"];
    if (!allowedStatuses.includes(updates.status.toLowerCase())) {
      return next(new ApiError(400, `Status must be one of: ${allowedStatuses.join(", ")}`));
    }
    updates.status = updates.status.toLowerCase();
  }

  // 5. Validate ObjectId fields if provided
  if (updates.assignedProjectId) {
    if (!mongoose.Types.ObjectId.isValid(updates.assignedProjectId)) {
      return next(new ApiError(400, "Invalid assignedProjectId"));
    }
    // Optional: Verify project exists
    const projectExists = await Project.findById(updates.assignedProjectId);
    if (!projectExists) {
      return next(new ApiError(404, "Assigned Project not found"));
    }
  }

  // 6. If joiningDate provided, validate date
  if (updates.joiningDate) {
    const jd = new Date(updates.joiningDate);
    if (isNaN(jd)) {
      return next(new ApiError(400, "Invalid joiningDate"));
    }
    updates.joiningDate = jd;
  }

  // 7. Find labourer by ID
  const labourer = await Labourer.findById(labourerId);
  if (!labourer) {
    return next(new ApiError(404, "Labourer not found"));
  }

  // 8. Handle profile photo update if file uploaded
  // if (req.file) {
  //   // Delete existing photo from Cloudinary if exists
  //   if (labourer.profilePhoto && labourer.profilePhoto.publicId) {
  //     await uploadOnCloudinary.uploader.destroy(labourer.profilePhoto.publicId);
  //   }

  //   // Upload new photo
  //   const uploaded = await new Promise((resolve, reject) => {
  //     const stream = uploadOnCloudinary.uploader.upload_stream(
  //       { folder: "labourer-profiles" },
  //       (error, result) => {
  //         if (error || !result) return reject(error || new Error("Cloudinary upload failed"));
  //         resolve(result);
  //       }
  //     );
  //     stream.end(req.file.buffer);
  //   });

  //   updates.profilePhoto = {
  //     publicId: uploaded.public_id,
  //     url: uploaded.secure_url,
  //   };
  // }

  // 9. Update labourer with validated updates
  Object.assign(labourer, updates);

  await labourer.save();

  // 10. Respond with updated labourer
  res.status(200).json({ labourer });
});

export const listLabourers = catchAsyncHandler(async (req, res, next) => {
  const {
    assignedProjectId,
    status,
    skillType,
    gender,
    fullName,
    page = 1,
    limit = 20,
  } = req.query;

  // Validate pagination params
  const pageNumber = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
  const limitNumber = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
  const skip = (pageNumber - 1) * limitNumber;

  // Validate ObjectId for assignedProjectId if provided
  const filters = {};

  if (assignedProjectId) {
    if (!mongoose.Types.ObjectId.isValid(assignedProjectId)) {
      return next(new ApiError(400, "Invalid project ID filter"));
    }
    filters.assignedProjectId = assignedProjectId;
  }

  if (status) {
    if (!["active", "inactive"].includes(status.toLowerCase())) {
      return next(new ApiError(400, "Invalid status filter"));
    }
    filters.status = status.toLowerCase();
  }

  if (skillType) {
    filters.skillType = skillType;
  }

  if (gender) {
    if (!["male", "female", "others"].includes(gender.toLowerCase())) {
      return next(new ApiError(400, "Invalid gender filter"));
    }
    filters.gender = gender.toLowerCase();
  }

  if (fullName) {
    filters.fullName = { $regex: fullName, $options: "i" };
  }

  // Fetch total count
  const totalLabourers = await Labourer.countDocuments(filters);

  // Fetch labourers with pagination
  const labourers = await Labourer.find(filters)
    .skip(skip)
    .limit(limitNumber)
    .sort({ createdAt: -1 }); // latest first

  const totalPages = Math.ceil(totalLabourers / limitNumber);

  res.status(200).json({
    meta: {
      totalLabourers,
      totalPages,
      currentPage: pageNumber,
      pageSize: labourers.length,
    },
    labourers,
  });
});

export const assignLabourerToProject = catchAsyncHandler(async (req, res, next) => {
  const { labourerId } = req.params;
  const { projectId } = req.body;

  // Validate labourerId
  if (!mongoose.Types.ObjectId.isValid(labourerId)) {
    return next(new ApiError(400, "Invalid labourer ID"));
  }

  // Validate projectId if provided and not null/empty string
  if (projectId && projectId !== null && !mongoose.Types.ObjectId.isValid(projectId)) {
    return next(new ApiError(400, "Invalid project ID"));
  }

  // Find labourer
  const labourer = await Labourer.findById(labourerId);
  if (!labourer) {
    return next(new ApiError(404, "Labourer not found"));
  }

  // If assigning, check project existence
  if (projectId) {
    const projectExists = await Project.findById(projectId);
    if (!projectExists) {
      return next(new ApiError(404, "Project not found"));
    }
  }

  // Assign or Unassign project
  labourer.assignedProjectId = projectId || null;

  await labourer.save();

  res.status(200).json({ labourer });
});

export const changeLabourerStatus = catchAsyncHandler(async (req, res, next) => {
  const { id: labourerId } = req.params;
  const { status } = req.body;

  // 1. Validate labourer ID
  if (!mongoose.Types.ObjectId.isValid(labourerId)) {
    return next(new ApiError(400, "Invalid labourer ID"));
  }

  // 2. Validate status
  const allowedStatuses = ["active", "inactive"];
  if (!status || !allowedStatuses.includes(status.toLowerCase())) {
    return next(
      new ApiError(400, `Status is required and must be one of: ${allowedStatuses.join(", ")}`)
    );
  }

  // 3. Find the labourer
  const labourer = await Labourer.findById(labourerId);
  if (!labourer) {
    return next(new ApiError(404, "Labourer not found"));
  }

  // 4. Update status
  labourer.status = status.toLowerCase();

  await labourer.save();

  // 5. Return updated labourer
  res.status(200).json({ labourer });
});

// Controller to delete a labourer by ID
export const deleteLabourer = catchAsyncHandler(async (req, res, next) => {
  // 1. Extract labourer ID from URL params (e.g., /labourers/:id)
  const { id: labourerId } = req.params;

  // 2. Validate ID format to protect from DB errors
  if (!mongoose.Types.ObjectId.isValid(labourerId)) {
    return next(new ApiError(400, "Invalid labourer ID"));
  }

  // 3. Find the labourer profile by ID
  const labourer = await Labourer.findById(labourerId);
  if (!labourer) {
    // Give clear feedback if nothing found
    return next(new ApiError(404, "Labourer not found"));
  }

  // 4. Delete (remove) the profile from DB
  await Labourer.findByIdAndDelete(labourerId);
  // Note: alternate is labourer.deleteOne()

  // 5. Respond to the client with a success message
  res.status(200).json({ message: "Labourer deleted successfully" });
});

export const searchLabourers = catchAsyncHandler(async (req, res, next) => {
  const { fullName, skillType, contactNumber } = req.query;

  // Build filters object dynamically
  const filters = {};

  if (fullName) {
    // Regex search on fullName (case-insensitive)
    filters.fullName = { $regex: fullName, $options: "i" };
  }

  if (skillType) {
    // Exact match on skillType (consider normalize case if needed)
    filters.skillType = skillType;
  }

  if (contactNumber) {
    // contactNumber is stored as Number type, so convert to string and do string regex search
    // To work with regex, convert stored contactNumber to string during query via $expr if needed
    // But since stored as Number, exact match is safe:
    // If partial search needed, consider changing schema type to String.
    
    // For now, exact match:
    filters.contactNumber = Number(contactNumber);
    
    if (isNaN(filters.contactNumber)) {
      return next(new ApiError(400, "Invalid contactNumber format"));
    }
  }

  // Perform query with filters
  const labourers = await Labourer.find(filters);

  res.status(200).json({ labourers });
});


export const listLabourersByProject = catchAsyncHandler(async (req, res, next) => {
  const { projectId } = req.params;

  // 1. Validate projectId
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return next(new ApiError(400, "Invalid project ID"));
  }

  // 2. Find labourers assigned to the project
  const labourers = await Labourer.find({ assignedProjectId: projectId })
    .sort({ fullName: 1 }); // Sort by name ascending (optional)

  // 3. Return the list (empty if none found)
  res.status(200).json({ labourers });
});

// export const updateProfilePhoto = catchAsyncHandler(async (req, res, next) => {
//   const { id: labourerId } = req.params;

//   // Validate Labourer ID
//   if (!mongoose.Types.ObjectId.isValid(labourerId)) {
//     return next(new ApiError(400, "Invalid labourer ID"));
//   }

//   // Find labourer
//   const labourer = await Labourer.findById(labourerId);
//   if (!labourer) {
//     return next(new ApiError(404, "Labourer not found"));
//   }

//   if (!req.file) {
//     return next(new ApiError(400, "No file uploaded"));
//   }

//   // Optional: Delete previous image from Cloudinary
//   if (labourer.profilePhoto && labourer.profilePhoto.publicId) {
//     await uploadOnCloudinary.uploader.destroy(labourer.profilePhoto.publicId);
//   }

//   // Upload new file to Cloudinary
//   const result = await uploadOnCloudinary.uploader.upload_stream(
//     { folder: "labourer-profiles" },
//     (error, result) => {
//       if (error || !result) {
//         return next(new ApiError(500, "Cloudinary upload failed"));
//       }
//       // Update labourer's profilePhoto
//       labourer.profilePhoto = {
//         publicId: result.public_id,
//         url: result.secure_url,
//       };
//       labourer.save().then(updatedLabourer => {
//         res.status(200).json({ labourer: updatedLabourer });
//       });
//     }
//   );
//   // Send file buffer to cloudinary upload_stream
//   result.end(req.file.buffer);
// });

// Controller to fetch attendance summary for a labourer
export const attendanceSummary = catchAsyncHandler(async (req, res, next) => {
  const { labourerId } = req.params;
  const { startDate, endDate } = req.query;

  // Validate labourerId
  if (!mongoose.Types.ObjectId.isValid(labourerId)) {
    return next(new ApiError(400, "Invalid labourer ID"));
  }

  // Check labourer exists
  const labourer = await Labourer.findById(labourerId);
  if (!labourer) {
    return next(new ApiError(404, "Labourer not found"));
  }

  // Build attendance query
  const query = { labourerId };
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  // Fetch attendance records
  const attendanceRecords = await Attendance.find(query);

  // Aggregate summary
  const summary = {
    total: attendanceRecords.length,
    present: 0,
    absent: 0,
    halfDay: 0,
    // add more stats as needed
  };
  for (const record of attendanceRecords) {
    if (record.status === "present") summary.present++;
    if (record.status === "absent") summary.absent++;
    if (record.status === "half-day") summary.halfDay++;
    // Expand for more statuses if needed
  }

  res.status(200).json({
    labourerId,
    summary,
    raw: attendanceRecords, // include if you want, or omit for brevity
  });
});