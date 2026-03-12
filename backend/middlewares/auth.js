const jwt = require("jsonwebtoken");
const config = require("../properties/config");
const { errorResponse } = require("../responses/apiResponse");
const logger = require("../logging/logger");

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn(`Auth failed — no token provided | ${req.method} ${req.url}`);
    return errorResponse(res, "Access denied. No token provided.", 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    logger.debug(`Auth OK — user: ${decoded.id} role: ${decoded.role}`);
    next();
  } catch (err) {
    logger.warn(`Auth failed — invalid token | ${req.method} ${req.url}`);
    return errorResponse(res, "Invalid or expired token.", 401);
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, "Not authenticated.", 401);
    }
    if (!roles.includes(req.user.role)) {
      logger.warn(
        `Access denied — user ${req.user.id} (role: ${req.user.role}) tried to access ${req.method} ${req.url}`
      );
      return errorResponse(res, "Access denied. Insufficient permissions.", 403);
    }
    next();
  };
};

module.exports = { authenticate, requireRole };
