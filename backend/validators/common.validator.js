const { param, query } = require("express-validator");

const validateObjectId = (paramName = "id") =>
  param(paramName).isMongoId().withMessage(`${paramName} must be a valid MongoDB ObjectId`);

const validatePagination = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),
];

module.exports = { validateObjectId, validatePagination };
