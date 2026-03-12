const { findUserByEmail } = require("../../register/dao/register.dao");

const findUserByEmailForLogin = async (email) => {
  return findUserByEmail(email); // reuses register DAO (includes password)
};

module.exports = { findUserByEmailForLogin };
