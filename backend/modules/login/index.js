const express = require("express");
const router = express.Router();
const { login } = require("./controllers/login.controller");
const { loginValidator } = require("./validators/login.validator");
const validate = require("../../middlewares/validate");

// POST /api/auth/login
router.post("/login", loginValidator, validate, login);

module.exports = router;
