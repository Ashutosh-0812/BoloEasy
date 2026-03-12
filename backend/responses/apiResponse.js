const successResponse = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (res, message, statusCode = 500, errors = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

const notFoundResponse = (res, message = "Resource not found") => {
  return res.status(404).json({ success: false, message });
};

const validationErrorResponse = (res, errors) => {
  return res.status(422).json({
    success: false,
    message: "Validation failed",
    errors,
  });
};

module.exports = {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
};
