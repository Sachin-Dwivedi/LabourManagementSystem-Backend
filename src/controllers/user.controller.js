import User from "../models/user.model.js";
import ApiError from "../utils/error.js";
import catchAsyncHandler from "../middlewares/catchAsyncHandler.js";

//Function for New User Registration
export const register = catchAsyncHandler(async (req, res, next) => {
  const { name, email, password, phone, role, username } = req.body;

  if (!name || !username || !email || !password || !phone) {
    return next(new ApiError("All Fields Required", 400));
  }

  const existing = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existing) {
    throw new ApiError(409, "Email or Username already exists");
  }

  const user = await User.create({
    name,
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
    role,
    phone,
  });

  const refreshToken = await user.generateRefreshToken();

  const createdUser = await User.findById(user._id);

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res.status(201).cookie("refreshToken", refreshToken, options).json({
    user: createdUser,
  });
});

//Function for User Login
export const login = catchAsyncHandler(async (req, res, next) => {
  const { email, username, password } = req.body;

  if (!((username || email) && password)) {
    throw new ApiError(400, "Username or Email and Password are required");
  }

  const user = await User.findOne({ $or: [{ username }, { email }] }).select(
    "+password"
  );

  if (!user) {
    throw new ApiError(401, "User does not exist");
  }

  const isPasswordCorrect = await user.comparePassword(password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid User Credentials");
  }

  const refreshToken = await user.generateRefreshToken();

  const loggedInUser = await User.findById(user._id);

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res.status(200).cookie("refreshToken", refreshToken, options).json({
    user: loggedInUser,
    refreshToken,
  });
});

//Function to Logout (clear token cookies)
export const logout = catchAsyncHandler(async (req, res, next) => {
  const options = {
    httpOnly: true,
    expires: new Date(0),
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };

  console.log(req.cookies.refreshToken);

  return res
    .status(200)
    .clearCookie("refreshToken", options)
    .json({ message: "Logged Out Successfully" });
});

//Function to fetch User Details
export const getCurrentUser = catchAsyncHandler(async (req, res, next) => {
  const userId = req.user?._id;

  if (!userId) {
    return next(new ApiError(401, "User Authentication Failed"));
  }

  const user = await User.findById(userId);

  if (!user) {
    return next(new ApiError(404, "User not found"));
  }

  return res.status(200).json({ user });
});

//Function to Update User Details
export const updateUser = catchAsyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  if (!userId) {
    return next(new ApiError(401, "User Authentication Failed"));
  }

  const allowedUpdates = ["name", "phone", "username"];

  const updates = {};

  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (updates.username) {
    const existingUser = await User.findOne({
      username: updates.username.toLowerCase(),
      _id: { $ne: userId },
    });

    if (existingUser) {
      return next(new ApiError(409, "Username already exists"));
    }
    updates.username = updates.username.toLowerCase();
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(new ApiError(404, "User not found"));
  }

  Object.assign(user, updates);

  await user.save();

  const updatedUser = await User.findById(userId);

  res.status(200).json({ user: updatedUser });
});

// Function to Change Password
export const changePassword = catchAsyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  if (!userId) {
    return next(new ApiError(401, "User Authentication Failed"));
  }
  const { currentPassword, newPassword } = req.body;

  if (!(currentPassword && newPassword)) {
    throw new ApiError(
      400,
      "Both currentPassword and newPassword are required"
    );
  }

  const user = await User.findById(userId).select("+password");

  if (!user) {
    return next(new ApiError(401, "User not found"));
  }

  const isPasswordCorrect = await user.comparePassword(currentPassword);

  if (!isPasswordCorrect) {
    return next(new ApiError(401, "Current password is incorrect"));
  }

  user.password = newPassword;
  await user.save();

  return res.status(200).json({ message: "Password changed successfully" });
});

// Function to List all Users (Access : Admin Only)
export const listAllUsers = catchAsyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  if (!userId) {
    throw new ApiError(401, "User Authentication failed");
  }

  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized Access: Access denied. Admins only.");
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const filters = {};
  if (req.query.role) filters.role = req.query.role.toLowerCase();
  if (req.query.username)
    filters.username = new RegExp(req.query.username, "i");

  if (req.query.status) filters.status = req.query.status.toLowerCase();

  const [totalUsers, users] = await Promise.all([
    User.countDocuments(filters),
    User.find(filters).skip(skip).limit(limit).sort({ createdAt: -1 }),
  ]);

  const totalPages = Math.ceil(totalUsers / limit);

  res.status(200).json({
    meta: {
      totalUsers,
      totalPages,
      currentPage: page,
      pageSize: users.length,
    },
    users,
  });
});

// Update Role of A User (Access : Admin Only)
const ALLOWED_ROLES = ["admin", "manager", "labourer"];

export const updateUserRole = catchAsyncHandler(async (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(new ApiError(403, "Access denied. Admins only."));
  }

  const { userId, newRole } = req.body;

  if (!userId || !newRole) {
    return next(new ApiError(400, "User ID and new role are required"));
  }

  if (!ALLOWED_ROLES.includes(newRole.toLowerCase())) {
    return next(
      new ApiError(400, `Role must be one of: ${ALLOWED_ROLES.join(", ")}`)
    );
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return next(new ApiError(404, "User not found"));
  }

  targetUser.role = newRole.toLowerCase();
  await targetUser.save();

  const updatedUser = await User.findById(userId);

  res.status(200).json({
    message: "User role updated successfully",
    user: updatedUser,
  });
});

//Function to delete User (Access : Admin Only)
export const deleteUser = catchAsyncHandler(async (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(new ApiError(403, "Access denied. Admins only."));
  }

  const { userId } = req.params;

  if (!userId) {
    return next(new ApiError(400, "User ID is required"));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(new ApiError(404, "User not found"));
  }

  await User.findByIdAndDelete(userId);

  res.status(200).json({ message: "User deleted successfully" });
});
