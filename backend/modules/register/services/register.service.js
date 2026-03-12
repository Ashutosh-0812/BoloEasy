const { createUser, findUserByEmail } = require("../dao/register.dao");
const logger = require("../../../logging/logger");

const registerUser = async ({ name, email, role, password }) => {
  // Check duplicate email
  const existing = await findUserByEmail(email);
  if (existing) {
    const err = new Error("Email is already registered.");
    err.statusCode = 409;
    throw err;
  }

  const user = await createUser({ name, email, role, password });
  logger.info(`New user registered: ${user.email} (role: ${user.role})`);

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
};

module.exports = { registerUser };
