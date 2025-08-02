import Notification from "../models/notification.model.js";
import ApiError from "../utils/error.js";
import catchAsyncHandler from "../middlewares/catchAsyncHandler.js";
import mongoose from "mongoose";

// Create New Notification (email/SMS)
export const createNotification = catchAsyncHandler(async (req, res, next) => {
  const { userId, message, type, status } = req.body;

  if (!userId || !message || !type || !status) {
    return next(
      new ApiError(400, "userId, message, type, and status are required")
    );
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return next(new ApiError(400, "Invalid userId"));
  }

  const allowedTypes = ["email", "sms"];
  if (!allowedTypes.includes(type)) {
    return next(
      new ApiError(400, `Type must be one of: ${allowedTypes.join(", ")}`)
    );
  }

  const allowedStatus = ["sent", "failed"];
  if (!allowedStatus.includes(status)) {
    return next(
      new ApiError(400, `Status must be one of: ${allowedStatus.join(", ")}`)
    );
  }

  const notification = await Notification.create({
    userId,
    message: message.trim(),
    type,
    status,
  });

  res.status(201).json({ notification });
});

// List All Notifications for User
export const listNotificationsByUser = catchAsyncHandler(
  async (req, res, next) => {
    let {
      userId,
      userIds,
      type,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 20;
    const skip = (page - 1) * limit;

    const filters = {};

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return next(new ApiError(400, "Invalid userId"));
      }
      filters.userId = userId;
    } else if (userIds) {
      const idsArray = userIds.split(",").map((id) => id.trim());

      const invalidId = idsArray.find(
        (id) => !mongoose.Types.ObjectId.isValid(id)
      );
      if (invalidId) {
        return next(
          new ApiError(400, `Invalid userId in userIds: ${invalidId}`)
        );
      }
      filters.userId = { $in: idsArray };
    }

    if (type) {
      const allowedTypes = ["email", "sms"];
      if (!allowedTypes.includes(type)) {
        return next(
          new ApiError(400, `type must be one of: ${allowedTypes.join(", ")}`)
        );
      }
      filters.type = type;
    }

    if (status) {
      const allowedStatus = ["sent", "failed"];
      if (!allowedStatus.includes(status)) {
        return next(
          new ApiError(
            400,
            `status must be one of: ${allowedStatus.join(", ")}`
          )
        );
      }
      filters.status = status;
    }

    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start)) {
          return next(new ApiError(400, "Invalid startDate"));
        }
        filters.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end)) {
          return next(new ApiError(400, "Invalid endDate"));
        }
        filters.createdAt.$lte = end;
      }
    }

    filters.deleted = { $ne: true };

    const total = await Notification.countDocuments(filters);

    const notifications = await Notification.find(filters)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      meta: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        pageSize: notifications.length,
      },
      notifications,
    });
  }
);

// Get Notification Details and Status by ID
export const getNotificationById = catchAsyncHandler(async (req, res, next) => {
  const notificationId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    return next(new ApiError(400, "Invalid notification ID"));
  }

  const notification = await Notification.findById(notificationId);

  if (!notification) {
    return next(new ApiError(404, "Notification not found"));
  }

  res.status(200).json({ notification });
});

// Update Notification Status (e.g., mark as sent/failed/read)
export const updateNotificationStatus = catchAsyncHandler(
  async (req, res, next) => {
    const notificationId = req.params.id;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return next(new ApiError(400, "Invalid notification ID"));
    }

    const allowedStatuses = ["sent", "failed", "read"];
    if (!status || !allowedStatuses.includes(status)) {
      return next(
        new ApiError(
          400,
          `Status is required and must be one of: ${allowedStatuses.join(", ")}`
        )
      );
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return next(new ApiError(404, "Notification not found"));
    }

    notification.status = status;

    await notification.save();

    res.status(200).json({ notification });
  }
);

export const deleteNotification = catchAsyncHandler(async (req, res, next) => {
  const notificationId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    return next(new ApiError(400, "Invalid notification ID"));
  }

  const notification = await Notification.findById(notificationId);

  if (!notification) {
    return next(new ApiError(404, "Notification not found"));
  }

  const isOwner = notification.userId.toString() === userId;
  const isAdmin = userRole === "admin";

  if (!isOwner && !isAdmin) {
    return next(
      new ApiError(403, "Not authorized to delete this notification")
    );
  }

  notification.deleted = true;
  await notification.save();

  res.status(200).json({ message: "Notification deleted successfully" });
});
