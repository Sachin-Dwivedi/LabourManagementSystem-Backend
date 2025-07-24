// import User from "../models/user.model.js";
// import bcrypt from "bcrypt";
// import ApiError from "../utils/error.js";
// import jwt from "jsonwebtoken";
// import catchAsyncHandler from "../middlewares/catchAsyncHandler.js";

// //API Function removing try catch
// export const register = catchAsyncHandler(async (req,res,next)=>{
//   const { name, email, password } = req.body; // destructure req.body

//     if (!name || !email || !password) {
//       return next(new ApiError("All Fields Required", 500));
//     }

//     let user = await User.findOne({ email });

//     if (user) {
//       return next(new ApiError("User Already Exists", 500));
//     }

//     const hashedPassword = await bcrypt.hash(password, 12);
//     user = await User.create({ name, email, password: hashedPassword });

//     const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: process.env.JWT_EXPIRES * 24 * 60 * 60 * 1000,
//     });

//     return res
//       .status(200)
//       .cookie("userToken", token, {
//         httpOnly: true,
//         expires: new Date(
//           Date.now() + process.env.COOKIE_EXPIRES * 24 * 60 * 60 * 1000
//         ),
//         sameSite: "lax",
//         secure: false,
//       })
//       .json({
//         success: true,
//         user,
//         token,
//       });
// })

// export const login = catchAsyncHandler(async (req,res,next)=>{
//   const { email, password } = req.body;

//     if (!email || !password) {
//       return next(new ApiError("All fields required", 500));
//     }

//     let user = await User.findOne({ email }).select("+password");

//     if (!user) {
//       return next(new ApiError("User Does not exist, Kindly Register", 500));
//     }

//     const hashedPassword = user.password;
//     let isMatchPassword = await bcrypt.compare(password, hashedPassword);

//     if (!isMatchPassword) {
//       return next(new ApiError("Incorrect Password", 500));
//     }

//     const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: process.env.JWT_EXPIRES * 24 * 60 * 60 * 1000,
//     });

//     return res
//       .status(200)
//       .cookie("userToken", token, {
//         httpOnly: true,
//         expires: new Date(
//           Date.now() + process.env.COOKIE_EXPIRES * 24 * 60 * 60 * 1000
//         ),
//         sameSite: "lax",
//         secure: false,
//       })
//       .json({
//         success: true,
//         user,
//         token,
//       });
// })

// export const userDetail = (req, res) => {
//   return res.status(200).json({
//     success: true,
//     message: "User is Logged In",
//     user: req.user,
//   });
// };

import User from "../models/user.model.js";
import ApiError from "../utils/error.js";
import catchAsyncHandler from "../middlewares/catchAsyncHandler.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

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

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      user: createdUser,
      accessToken,
    });
});

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

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      user: loggedInUser,
      accessToken,
      refreshToken,
    });
});

const logout = catchAsyncHandler(async (req, res, next) => {
  const userId = req.user?._id;

  if (!userId) {
    return next(new ApiError(401, "User not authenticated"));
  }

  const user = await User.findById(userId);

  if (!user) {
    return next(new ApiError(404, "User not found"));
  }

  // clear refreshToken from DB
  user.refreshToken = null;
  await user.save({ validateBeforeSave: false });

  //clear cookies
  const options = {
    httpOnly: true,
    expires: new Date(0),
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json({ message: "Logged Out Successfully" });
});

export const getCurrentUser = catchAsyncHandler(async (req, res, next) => {
  const userId = req.user?._id;

  if (!userId) {
    return next(new ApiError(401, "User Authentication Failed"));
  }

  const user = await User.findById(userId).select("-password -refreshToken");

  if (!user) {
    return next(new ApiError(404, "User not found"));
  }

  return res.status(200).json({ user });
});

export const updateUser = catchAsyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  if (!userId) {
    return next(new ApiError(401, "User Authentication Failed"));
  }

  // Allowed fields to update
  const allowedUpdates = ["name", "phone", "avatar", "username"];

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

  //Update user document
  const user = await User.findById(userId);
  if (!user) {
    return next(new ApiError(404, "User not found"));
  }

  Object.assign(user, updates);

  await user.save();

  //Exclude sensitive fields in the response
  const updatedUser = await User.findById(userId).select(
    "-password -refreshToken"
  );

  res.status(200).json({ user: updatedUser });
});

export const changePassword = catchAsyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  if (!userId) {
    return next(new ApiError(401, "User Authentication Failed"));
  }
  const { currentPassword, newPassword } = req.body;

  if (!(currentPassword && newPassword)) {
  throw new ApiError(400, "Both currentPassword and newPassword are required");
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

export const listAllUsers = catchAsyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  if (!userId) {
    throw new ApiError(401, "User Authentication failed");
  }

  // 1. Check if user is admin

  if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized Access: Access denied. Admins only.");
  }

  // 2. Parse pagination and filters from query parameters
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  // Optional filters example: ?role=manager&username=john
  const filters = {};
  if (req.query.role) filters.role = req.query.role.toLowerCase();
  if (req.query.username)
    filters.username = new RegExp(req.query.username, "i"); //case-insensitive search

  if (req.query.status) filters.status = req.query.status.toLowerCase();

  // 3. Fetch users with filters, pagination, exlude sensitive fields

  const [totalUsers, users] = await Promise.all([
    User.countDocuments(filters),
    User.find(filters)
      .select("-password -refreshToken")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }), //newest first
  ]);

  // 4. Calculate total pages
  const totalPages = Math.ceil(totalUsers / limit);

  // 5. Return paginated response
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

const ALLOWED_ROLES = ["admin", "manager", "labourer"];

const updateUserRole = catchAsyncHandler(async (req, res, next) => {
  // 1. Authorization check
  if (req.user.role !== "admin") {
    return next(new ApiError(403, "Access denied. Admins only."));
  }

  // 2. Extract inputs
  const { userId, newRole } = req.body;

  if (!userId || !newRole) {
    return next(new ApiError(400, "User ID and new role are required"));
  }

  if (!ALLOWED_ROLES.includes(newRole.toLowerCase())) {
    return next(
      new ApiError(400, `Role must be one of: ${ALLOWED_ROLES.join(", ")}`)
    );
  }

  // 3. Find target user
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return next(new ApiError(404, "User not found"));
  }

  // 4. Update role
  targetUser.role = newRole.toLowerCase();
  await targetUser.save();

  // 5. Return updated user info without sensitive fields
  const updatedUser = await User.findById(userId).select(
    "-password -refreshToken"
  );

  res.status(200).json({
    message: "User role updated successfully",
    user: updatedUser,
  });
});

const deleteUser = catchAsyncHandler(async (req, res, next) => {
  // 1. Authorization check (admin only)
  if (req.user.role !== "admin") {
    return next(new ApiError(403, "Access denied. Admins only."));
  }

  if (req.user._id.toString() === userId) {
  return next(new ApiError(400, "Admins cannot delete their own account"));
}


  // 2. Get userId to delete from params or body
  const { userId } = req.params; // Or req.body.userId as per your routing

  if (!userId) {
    return next(new ApiError(400, "User ID is required"));
  }

  // 3. Find user
  const user = await User.findById(userId);
  if (!user) {
    return next(new ApiError(404, "User not found"));
  }

  // 4. Delete user
  await User.findByIdAndDelete(userId);

  // 5. Optionally, delete related entities here...

  // 6. Send success response
  res.status(200).json({ message: "User deleted successfully" });
});
