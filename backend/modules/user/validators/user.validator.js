const { body } = require("express-validator");

const updatePinyinScriptValidator = [
  body("pinyinScript")
    .trim()
    .isLength({ max: 5000 }).withMessage("Pinyin script must be at most 5000 characters"),
];

module.exports = { updatePinyinScriptValidator };
