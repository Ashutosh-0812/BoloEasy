const jwt = require("jsonwebtoken");
const { findUserByEmailForLogin } = require("../dao/login.dao");
const config = require("../../../properties/config");
const logger = require("../../../logging/logger");

const loginUser = async ({ email, password }) => {
  const user = await findUserByEmailForLogin(email);

  if (!user) {
    const err = new Error("Invalid email or password.");
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    logger.warn(`Failed login attempt for email: ${email}`);
    const err = new Error("Invalid email or password.");
    err.statusCode = 401;
    throw err;
  }

  if (!user.isVerified) {
    const err = new Error("Your account is pending admin verification.");
    err.statusCode = 403;
    throw err;
  }

  const payload = { id: user._id, role: user.role, email: user.email };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

  logger.info(`User logged in: ${user.email} (role: ${user.role})`);

  return {
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
  };
};

module.exports = { loginUser };
