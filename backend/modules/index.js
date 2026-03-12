const express = require("express");
const router = express.Router();

const authRegisterRouter = require("./register/index");
const authLoginRouter = require("./login/index");
const adminRouter = require("./admin/index");
const userRouter = require("./user/index");

// Auth routes
router.use("/auth", authRegisterRouter);
router.use("/auth", authLoginRouter);

// Role-specific routes
router.use("/admin", adminRouter);
router.use("/user", userRouter);

module.exports = router;
