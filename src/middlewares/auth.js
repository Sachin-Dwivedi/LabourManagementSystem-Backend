import ApiError from "../utils/error.js";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const isAuthenticated = async (req, res, next) => {
  try {
    const { userToken } = req.cookies;
    if (!userToken) {
      return next(new ApiError("Please LogIn", 400));
    }
    const decodedData = jwt.verify(userToken, process.env.JWT_SECRET);
    req.user = await User.findById(decodedData._id);

    next();
  } catch (error) {
    console.log(error);
    return next(new ApiError("Error in Authentication", 500));
  }
};

export const isAuthorized =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(`UnAuthorized Access : ${req.user.role}`, 401));
    }
    next();
  };
