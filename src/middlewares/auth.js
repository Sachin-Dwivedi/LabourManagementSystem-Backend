import ApiError from "../utils/error.js";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const isAuthenticated = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new ApiError(401, "Please LogIn"));
  }
  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return next(new ApiError(401, "Please LogIn"));
  }
};



export const isAuthorized = (...roles) => (req, res, next) => {
  // Check if user is authenticated and has role info
  if (!req.user) {
    return next(new ApiError(401, "User not authenticated "));
  }

  
  if(!req.user.role){
    return next (new ApiError(401, "role not found"))
  }

  // Check if user role is in allowed roles
  if (!roles.includes(req.user.role)) {
    return next(
      new ApiError(
        403, // Forbidden is proper status for insufficient permissions
        `Unauthorized Access: role '${req.user.role}' is not allowed`
      )
    );
  }

  // User has valid role to access route
  next();
};