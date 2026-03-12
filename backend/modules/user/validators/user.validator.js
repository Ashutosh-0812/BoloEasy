const { body } = require("express-validator");

const transcriptValidator = [
  body("transcript")
    .trim()
    .notEmpty().withMessage("Transcript is required")
    .isLength({ max: 10000 }).withMessage("Transcript must be at most 10000 characters"),
];

module.exports = { transcriptValidator };
