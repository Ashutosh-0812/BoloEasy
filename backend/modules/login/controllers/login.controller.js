const { loginUser } = require("../services/login.service");
const { successResponse, errorResponse } = require("../../../responses/apiResponse");
const logger = require("../../../logging/logger");

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    logger.info(`Login attempt: ${email}`);
    const result = await loginUser({ email, password });
    return successResponse(res, "Login successful.", result);
  } catch (err) {
    if (err.statusCode) {
      return errorResponse(res, err.message, err.statusCode);
    }
    next(err);
  }
};

module.exports = { login };
