const express = require("express");
const router = express.Router();
const { register } = require("./controllers/register.controller");
const { registerValidator } = require("./validators/register.validator");
const validate = require("../../middlewares/validate");

// POST /api/auth/register
router.post("/register", registerValidator, validate, register);

module.exports = router;
