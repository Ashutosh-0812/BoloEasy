const { registerUser } = require("../services/register.service");
const { successResponse, errorResponse } = require("../../../responses/apiResponse");
const logger = require("../../../logging/logger");

const register = async (req, res, next) => {
  try {
    const { name, email, role, password } = req.body;
    logger.info(`Register attempt: ${email}`);
    const user = await registerUser({ name, email, role, password });
    return successResponse(res, "Registration successful. Please wait for admin verification.", user, 201);
  } catch (err) {
    if (err.statusCode) {
      return errorResponse(res, err.message, err.statusCode);
    }
    next(err);
  }
};

module.exports = { register };
