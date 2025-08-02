import Project from "../models/project.model.js";
import ApiError from "../utils/error.js";
import catchAsyncHandler from "../middlewares/catchAsyncHandler.js";
import mongoose from "mongoose";

//Function to Create a Project
export const createProject = catchAsyncHandler(async (req, res, next) => {
  const {
    name,
    description,
    location,
    startDate,
    endDate,
    status,
    managerId,
    assignedLabourers,
  } = req.body;

  if (!name || !description || !location) {
    return next(
      new ApiError(400, "Please provide name, description, and location")
    );
  }

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return next(new ApiError(400, "startDate cannot be after endDate"));
  }

  if (managerId && !mongoose.Types.ObjectId.isValid(managerId)) {
    return next(new ApiError(400, "Invalid managerId"));
  }

  if (assignedLabourers) {
    if (!Array.isArray(assignedLabourers)) {
      return next(new ApiError(400, "assignedLabourers must be an array"));
    }
    for (const labourerId of assignedLabourers) {
      if (!mongoose.Types.ObjectId.isValid(labourerId)) {
        return next(
          new ApiError(
            400,
            `Invalid labourer ID in assignedLabourers: ${labourerId}`
          )
        );
      }
    }
  }

  const newProject = await Project.create({
    name,
    description,
    location,
    startDate,
    endDate,
    status,
    managerId,
    assignedLabourers,
  });

  res.status(201).json({ project: newProject });
});

//Function to Update Project Details
export const updateProject = catchAsyncHandler(async (req, res, next) => {
  const projectId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return next(new ApiError(400, "Invalid project ID"));
  }

  const allowedUpdates = [
    "name",
    "description",
    "location",
    "startDate",
    "endDate",
    "status",
    "managerId",
    "assignedLabourers",
  ];

  const updates = {};
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (
    updates.startDate &&
    updates.endDate &&
    new Date(updates.startDate) > new Date(updates.endDate)
  ) {
    return next(new ApiError(400, "startDate cannot be after endDate"));
  }

  if (
    updates.managerId &&
    !mongoose.Types.ObjectId.isValid(updates.managerId)
  ) {
    return next(new ApiError(400, "Invalid managerId"));
  }

  if (updates.assignedLabourers) {
    if (!Array.isArray(updates.assignedLabourers)) {
      return next(new ApiError(400, "assignedLabourers must be an array"));
    }
    for (const labourerId of updates.assignedLabourers) {
      if (!mongoose.Types.ObjectId.isValid(labourerId)) {
        return next(new ApiError(400, `Invalid labourer ID: ${labourerId}`));
      }
    }
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return next(new ApiError(404, "Project not found"));
  }

  Object.assign(project, updates);
  await project.save();

  res.status(200).json({ project });
});

//Function to List All Current Projects
export const getAllProjects = catchAsyncHandler(async (req, res, next) => {
  let {
    status,
    managerId,
    startDate,
    endDate,
    name,
    location,
    page = 1,
    limit = 20,
  } = req.query;

  page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
  limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
  const skip = (page - 1) * limit;

  const filters = {};

  if (status) {
    const allowedStatuses = [
      "active",
      "completed",
      "pending",
      "cancelled",
      "archived",
    ];
    if (!allowedStatuses.includes(status.toLowerCase())) {
      return next(
        new ApiError(
          400,
          `Invalid status filter. Allowed: ${allowedStatuses.join(", ")}`
        )
      );
    }
    filters.status = status.toLowerCase();
  }

  if (managerId) {
    if (!mongoose.Types.ObjectId.isValid(managerId)) {
      return next(new ApiError(400, "Invalid managerId filter"));
    }
    filters.managerId = managerId;
  }

  if (startDate) {
    const start = new Date(startDate);
    if (isNaN(start)) {
      return next(new ApiError(400, "Invalid startDate filter"));
    }
    filters.startDate = { $gte: start };
  }

  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end)) {
      return next(new ApiError(400, "Invalid endDate filter"));
    }
    filters.endDate = { ...(filters.endDate || {}), $lte: end };
  }

  if (name) {
    filters.name = { $regex: name, $options: "i" };
  }

  if (location) {
    filters.location = { $regex: location, $options: "i" };
  }

  const totalProjects = await Project.countDocuments(filters);
  const projects = await Project.find(filters)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .populate("managerId", "username email")
    .populate("assignedLabourers", "fullName contactNumber");

  const totalPages = Math.ceil(totalProjects / limit);

  res.status(200).json({
    meta: {
      totalProjects,
      totalPages,
      currentPage: page,
      pageSize: projects.length,
    },
    projects,
  });
});

//Function to Fetch Project Details By ID
export const getProjectById = catchAsyncHandler(async (req, res, next) => {
  const projectId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return next(new ApiError(400, "Invalid project ID"));
  }

  const project = await Project.findById(projectId)
    .populate({ path: "managerId", select: "username email" })
    .populate({ path: "assignedLabourers", select: "fullName contactNumber" });

  if (!project) {
    return next(new ApiError(404, "Project not found"));
  }

  res.status(200).json({ project });
});

// Function to assign Multiple Labourers all at once
export const assignLabourersToProject = catchAsyncHandler(
  async (req, res, next) => {
    const projectId = req.params.id;
    const { assignedLabourers } = req.body;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return next(new ApiError(400, "Invalid project ID"));
    }

    if (!Array.isArray(assignedLabourers)) {
      return next(new ApiError(400, "assignedLabourers must be an array"));
    }

    for (const labourerId of assignedLabourers) {
      if (!mongoose.Types.ObjectId.isValid(labourerId)) {
        return next(new ApiError(400, `Invalid labourer ID: ${labourerId}`));
      }
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return next(new ApiError(404, "Project not found"));
    }

    project.assignedLabourers = assignedLabourers.map(
      (id) => new mongoose.Types.ObjectId(id)
    );
    await project.save();

    const updatedProject = await Project.findById(projectId)
      .populate({ path: "assignedLabourers", select: "fullName contactNumber" })
      .populate({ path: "managerId", select: "username email" });

    res.status(200).json({ project: updatedProject });
  }
);

//Function to Change Manager of a Project
export const changeProjectManager = catchAsyncHandler(
  async (req, res, next) => {
    const projectId = req.params.id;
    const { managerId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return next(new ApiError(400, "Invalid project ID"));
    }

    if (
      managerId !== undefined &&
      managerId !== null &&
      !mongoose.Types.ObjectId.isValid(managerId)
    ) {
      return next(new ApiError(400, "Invalid managerId"));
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return next(new ApiError(404, "Project not found"));
    }

    project.managerId = managerId ?? null;
    await project.save();

    const updatedProject = await Project.findById(projectId)
      .populate({ path: "managerId", select: "username email" })
      .populate({
        path: "assignedLabourers",
        select: "fullName contactNumber",
      });

    res.status(200).json({ project: updatedProject });
  }
);

//Function to Delete A Project
export const deleteProject = catchAsyncHandler(async (req, res, next) => {
  const projectId = req.params.id;
  const { action } = req.body;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return next(new ApiError(400, "Invalid project ID"));
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return next(new ApiError(404, "Project not found"));
  }

  if (action && action.toLowerCase() === "archive") {
    project.status = "archived";
    await project.save();
  }

  console.log("About to delete project with ID:", projectId);
  await Project.findByIdAndDelete(projectId);
  console.log("Project deletion done");

  return res.status(200).json({ message: "Project deleted successfully" });
});

// Function to Change Project Status
export const changeProjectStatus = catchAsyncHandler(async (req, res, next) => {
  const projectId = req.params.id;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return next(new ApiError(400, "Invalid project ID"));
  }

  const allowedStatuses = [
    "active",
    "completed",
    "pending",
    "cancelled",
    "archived",
  ];
  if (!status || !allowedStatuses.includes(status.toLowerCase())) {
    return next(
      new ApiError(
        400,
        `Status is required and must be one of: ${allowedStatuses.join(", ")}`
      )
    );
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return next(new ApiError(404, "Project not found"));
  }

  project.status = status.toLowerCase();
  await project.save();

  const updatedProject = await Project.findById(projectId)
    .populate({ path: "managerId", select: "username email" })
    .populate({ path: "assignedLabourers", select: "fullName contactNumber" });

  res.status(200).json({ project: updatedProject });
});

// Search for Project Details based on given Queries
export const searchProjects = catchAsyncHandler(async (req, res, next) => {
  let {
    name,
    description,
    location,
    status,
    managerId,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = req.query;

  page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
  limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
  const skip = (page - 1) * limit;

  const filters = {};

  if (name) filters.name = { $regex: name, $options: "i" };
  if (description) filters.description = { $regex: description, $options: "i" };
  if (location) filters.location = { $regex: location, $options: "i" };

  if (status) {
    const allowedStatuses = [
      "active",
      "completed",
      "pending",
      "cancelled",
      "archived",
    ];
    if (!allowedStatuses.includes(status.toLowerCase())) {
      return next(
        new ApiError(
          400,
          `Invalid status. Allowed: ${allowedStatuses.join(", ")}`
        )
      );
    }
    filters.status = status.toLowerCase();
  }

  if (managerId) {
    if (!mongoose.Types.ObjectId.isValid(managerId)) {
      return next(new ApiError(400, "Invalid managerId"));
    }
    filters.managerId = managerId;
  }

  if (startDate || endDate) {
    filters.startDate = {};
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start)) return next(new ApiError(400, "Invalid startDate"));
      filters.startDate.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end)) return next(new ApiError(400, "Invalid endDate"));
      filters.startDate.$lte = end;
    }
  }

  const totalProjects = await Project.countDocuments(filters);
  const projects = await Project.find(filters)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .populate({ path: "managerId", select: "username email" })
    .populate({ path: "assignedLabourers", select: "fullName contactNumber" });

  const totalPages = Math.ceil(totalProjects / limit);

  res.status(200).json({
    meta: {
      totalProjects,
      totalPages,
      currentPage: page,
      pageSize: projects.length,
    },
    projects,
  });
});

// Function to List down projects assigned to a Manager
export const listProjectsByManager = catchAsyncHandler(
  async (req, res, next) => {
    const { managerId } = req.params;
    let { page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(managerId)) {
      return next(new ApiError(400, "Invalid manager ID"));
    }

    page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
    const skip = (page - 1) * limit;

    const filter = { managerId };

    const totalProjects = await Project.countDocuments(filter);
    const projects = await Project.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate({
        path: "assignedLabourers",
        select: "fullName contactNumber",
      });

    const totalPages = Math.ceil(totalProjects / limit);

    res.status(200).json({
      meta: {
        totalProjects,
        totalPages,
        currentPage: page,
        pageSize: projects.length,
      },
      projects,
    });
  }
);

//Function to List All Projects assigned to a Labourer
export const listProjectsByLabourer = catchAsyncHandler(
  async (req, res, next) => {
    const { labourerId } = req.params;
    let { page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(labourerId)) {
      return next(new ApiError(400, "Invalid labourer ID"));
    }

    page = parseInt(page, 10) > 0 ? Number(page) : 1;
    limit = parseInt(limit, 10) > 0 ? Number(limit) : 20;
    const skip = (page - 1) * limit;

    const filter = { assignedLabourers: labourerId };

    const totalProjects = await Project.countDocuments(filter);
    const projects = await Project.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate({ path: "managerId", select: "username email" });

    const totalPages = Math.ceil(totalProjects / limit);

    res.status(200).json({
      meta: {
        totalProjects,
        totalPages,
        currentPage: page,
        pageSize: projects.length,
      },
      projects,
    });
  }
);
