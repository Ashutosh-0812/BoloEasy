const User = require("../models/user.model");

const createUser = async (userData) => {
  const user = new User(userData);
  return user.save();
};

const findUserByEmail = async (email) => {
  return User.findOne({ email }).select("+password");
};

const findUserById = async (id) => {
  return User.findById(id);
};

module.exports = { createUser, findUserByEmail, findUserById };
