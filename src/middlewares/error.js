import ApiError from "../utils/error.js";

export default (error, req, res, next) => {
  error.message = error.message || "internal server error";
  error.statusCode = error.statusCode || 500;
  if (error.name === "TokenExpiredError") {
    error = new ApiError("Session expired. Please log in again.", 401);
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
  });
};
