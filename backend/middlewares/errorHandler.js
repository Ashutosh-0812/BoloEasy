const logger = require("../logging/logger");
const { errorResponse } = require("../responses/apiResponse");

const errorHandler = (err, req, res, next) => {
  logger.error(`Unhandled Error | ${req.method} ${req.url} | ${err.message}`, {
    stack: err.stack,
  });

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(422).json({ success: false, message: "Validation failed", errors });
  }

  // Mongoose cast error (bad ObjectId)
  if (err.name === "CastError") {
    return errorResponse(res, `Invalid ID format for field: ${err.path}`, 400);
  }

  // Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return errorResponse(res, `${field} already exists.`, 409);
  }

  // Multer upload errors
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return errorResponse(res, "Uploaded file is too large. Maximum allowed size is 5MB.", 400);
    }
    return errorResponse(res, err.message || "File upload failed.", 400);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return errorResponse(res, "Invalid token.", 401);
  }
  if (err.name === "TokenExpiredError") {
    return errorResponse(res, "Token expired.", 401);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  return errorResponse(res, message, statusCode);
};

module.exports = errorHandler;
