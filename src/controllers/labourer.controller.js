import Labourer from "../models/labourer.model.js";
import Attendance from "../models/attendance.model.js";
import Project from "../models/project.model.js";
import ApiError from "../utils/error.js";
import catchAsyncHandler from "../middlewares/catchAsyncHandler.js";
import mongoose from "mongoose";

// Function to Create a labourer Entity
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
    status,
  } = req.body;

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

  if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
    return next(new ApiError(400, "Invalid userId"));
  }
  if (
    assignedProjectId &&
    !mongoose.Types.ObjectId.isValid(assignedProjectId)
  ) {
    return next(new ApiError(400, "Invalid assignedProjectId"));
  }

  if (userId) {
    const existingLabourer = await Labourer.findOne({ userId });
    if (existingLabourer) {
      return next(
        new ApiError(409, "Labourer profile already exists for this user")
      );
    }
  }

  // { File Uploads are Under Development }

  // let profilePhoto = null;
  // if (req.file) {
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

// Function to get Labourer Details by ID
export const getLabourerById = catchAsyncHandler(async (req, res, next) => {
  const labourerId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(labourerId)) {
    return next(new ApiError(400, "Invalid labourer ID"));
  }

  const labourer = await Labourer.findById(labourerId)
    .populate({ path: "userId", select: "username email role" })
    .populate({
      path: "assignedProjectId",
      select: "name location startDate endDate",
    });

  if (!labourer) {
    return next(new ApiError(404, "Labourer not found"));
  }

  res.status(200).json({ labourer });
});

// Function to Update User Details
export const updateLabourer = catchAsyncHandler(async (req, res, next) => {
  const { id: labourerId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(labourerId)) {
    return next(new ApiError(400, "Invalid labourer ID"));
  }

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

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (updates.gender) {
    const allowedGenders = ["male", "female", "others"];
    if (!allowedGenders.includes(updates.gender.toLowerCase())) {
      return next(
        new ApiError(400, `Gender must be one of: ${allowedGenders.join(", ")}`)
      );
    }
    updates.gender = updates.gender.toLowerCase();
  }

  if (updates.status) {
    const allowedStatuses = ["active", "inactive"];
    if (!allowedStatuses.includes(updates.status.toLowerCase())) {
      return next(
        new ApiError(
          400,
          `Status must be one of: ${allowedStatuses.join(", ")}`
        )
      );
    }
    updates.status = updates.status.toLowerCase();
  }

  if (updates.assignedProjectId) {
    if (!mongoose.Types.ObjectId.isValid(updates.assignedProjectId)) {
      return next(new ApiError(400, "Invalid assignedProjectId"));
    }

    const projectExists = await Project.findById(updates.assignedProjectId);
    if (!projectExists) {
      return next(new ApiError(404, "Assigned Project not found"));
    }
  }

  if (updates.joiningDate) {
    const jd = new Date(updates.joiningDate);
    if (isNaN(jd)) {
      return next(new ApiError(400, "Invalid joiningDate"));
    }
    updates.joiningDate = jd;
  }

  const labourer = await Labourer.findById(labourerId);
  if (!labourer) {
    return next(new ApiError(404, "Labourer not found"));
  }

  // { File Uploads are Under Development }

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

  Object.assign(labourer, updates);

  await labourer.save();

  res.status(200).json({ labourer });
});

//Function to List all Labourers
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

  const pageNumber = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
  const limitNumber = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
  const skip = (pageNumber - 1) * limitNumber;

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

  const totalLabourers = await Labourer.countDocuments(filters);

  const labourers = await Labourer.find(filters)
    .skip(skip)
    .limit(limitNumber)
    .sort({ createdAt: -1 });

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

// Function to assign a Labourer to Project
export const assignLabourerToProject = catchAsyncHandler(
  async (req, res, next) => {
    const { labourerId } = req.params;
    const { projectId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(labourerId)) {
      return next(new ApiError(400, "Invalid labourer ID"));
    }

    if (
      projectId &&
      projectId !== null &&
      !mongoose.Types.ObjectId.isValid(projectId)
    ) {
      return next(new ApiError(400, "Invalid project ID"));
    }

    const labourer = await Labourer.findById(labourerId);
    if (!labourer) {
      return next(new ApiError(404, "Labourer not found"));
    }

    if (projectId) {
      const projectExists = await Project.findById(projectId);
      if (!projectExists) {
        return next(new ApiError(404, "Project not found"));
      }
    }

    labourer.assignedProjectId = projectId || null;

    await labourer.save();

    res.status(200).json({ labourer });
  }
);

//Function to Change Labourer Status (Active, Inactive)
export const changeLabourerStatus = catchAsyncHandler(
  async (req, res, next) => {
    const { id: labourerId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(labourerId)) {
      return next(new ApiError(400, "Invalid labourer ID"));
    }

    const allowedStatuses = ["active", "inactive"];
    if (!status || !allowedStatuses.includes(status.toLowerCase())) {
      return next(
        new ApiError(
          400,
          `Status is required and must be: ${allowedStatuses.join(", ")}`
        )
      );
    }

    const labourer = await Labourer.findById(labourerId);
    if (!labourer) {
      return next(new ApiError(404, "Labourer not found"));
    }

    labourer.status = status.toLowerCase();

    await labourer.save();

    res.status(200).json({ labourer });
  }
);

//Function to delete a Labourer Entity by it's ID
export const deleteLabourer = catchAsyncHandler(async (req, res, next) => {
  const { id: labourerId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(labourerId)) {
    return next(new ApiError(400, "Invalid labourer ID"));
  }

  const labourer = await Labourer.findById(labourerId);
  if (!labourer) {
    return next(new ApiError(404, "Labourer not found"));
  }

  await Labourer.findByIdAndDelete(labourerId);

  res.status(200).json({ message: "Labourer deleted successfully" });
});

// Function to Search for Labourer details based on queries
export const searchLabourers = catchAsyncHandler(async (req, res, next) => {
  const { fullName, skillType, contactNumber } = req.query;

  const filters = {};

  if (fullName) {
    filters.fullName = { $regex: fullName, $options: "i" };
  }

  if (skillType) {
    filters.skillType = skillType;
  }

  if (contactNumber) {
    filters.contactNumber = Number(contactNumber);

    if (isNaN(filters.contactNumber)) {
      return next(new ApiError(400, "Invalid contactNumber format"));
    }
  }

  const labourers = await Labourer.find(filters);

  res.status(200).json({ labourers });
});

///Function to List al the labourers assigned to a project
export const listLabourersByProject = catchAsyncHandler(
  async (req, res, next) => {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return next(new ApiError(400, "Invalid project ID"));
    }

    const labourers = await Labourer.find({
      assignedProjectId: projectId,
    }).sort({ fullName: 1 });

    console.log(
      "Found labourers:",
      labourers.map((l) => l.fullName)
    );

    res.status(200).json({ labourers });
  }
);

// Function to fetch Attendance Summary for a given period
export const attendanceSummary = catchAsyncHandler(async (req, res, next) => {
  const { labourerId } = req.params;
  const { startDate, endDate } = req.query;

  if (!mongoose.Types.ObjectId.isValid(labourerId)) {
    return next(new ApiError(400, "Invalid labourer ID"));
  }

  const labourer = await Labourer.findById(labourerId);
  if (!labourer) {
    return next(new ApiError(404, "Labourer not found"));
  }

  const query = { labourerId };
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const attendanceRecords = await Attendance.find(query);

  const summary = {
    total: attendanceRecords.length,
    present: 0,
    absent: 0,
    halfDay: 0,
  };
  for (const record of attendanceRecords) {
    if (record.status === "present") summary.present++;
    if (record.status === "absent") summary.absent++;
    if (record.status === "half-day") summary.halfDay++;
  }

  res.status(200).json({
    labourerId,
    summary,
    raw: attendanceRecords,
  });
});

// { File Uploads are Under Development }

// export const updateProfilePhoto = catchAsyncHandler(async (req, res, next) => {
//   const { id: labourerId } = req.params;

//   if (!mongoose.Types.ObjectId.isValid(labourerId)) {
//     return next(new ApiError(400, "Invalid labourer ID"));
//   }

//   const labourer = await Labourer.findById(labourerId);
//   if (!labourer) {
//     return next(new ApiError(404, "Labourer not found"));
//   }

//   if (!req.file) {
//     return next(new ApiError(400, "No file uploaded"));
//   }

//   if (labourer.profilePhoto && labourer.profilePhoto.publicId) {
//     await uploadOnCloudinary.uploader.destroy(labourer.profilePhoto.publicId);
//   }

//   const result = await uploadOnCloudinary.uploader.upload_stream(
//     { folder: "labourer-profiles" },
//     (error, result) => {
//       if (error || !result) {
//         return next(new ApiError(500, "Cloudinary upload failed"));
//       }

//       labourer.profilePhoto = {
//         publicId: result.public_id,
//         url: result.secure_url,
//       };
//       labourer.save().then(updatedLabourer => {
//         res.status(200).json({ labourer: updatedLabourer });
//       });
//     }
//   );

//   result.end(req.file.buffer);
// });
