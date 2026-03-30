const { body, param } = require("express-validator");

// ─── Project Validators ───────────────────────────────────────────────────────

const createProjectValidator = [
  body("name")
    .trim()
    .notEmpty().withMessage("Project name is required")
    .isLength({ min: 2, max: 200 }).withMessage("Project name must be between 2 and 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage("Description must be at most 1000 characters"),
];

const updateProjectValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage("Project name must be between 2 and 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage("Description must be at most 1000 characters"),
];

// ─── User Validators ──────────────────────────────────────────────────────────

const updateUserValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage("Name must be between 2 and 100 characters"),

  body("email")
    .optional()
    .trim()
    .isEmail().withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("role")
    .optional()
    .isIn(["user", "admin"]).withMessage("Role must be either 'user' or 'admin'"),

  body("isVerified")
    .optional()
    .isBoolean().withMessage("isVerified must be a boolean"),
];

// ─── Task Validators ──────────────────────────────────────────────────────────

const createTaskValidator = [
  body("type")
    .trim()
    .notEmpty().withMessage("Task type is required")
    .isLength({ max: 200 }).withMessage("Task type must be at most 200 characters"),

  body("text")
    .trim()
    .notEmpty().withMessage("Text is required")
    .isLength({ max: 5000 }).withMessage("Text must be at most 5000 characters"),

  body("prompt")
    .trim()
    .notEmpty().withMessage("Prompt is required")
    .isLength({ max: 1000 }).withMessage("Prompt must be at most 1000 characters"),

  body("assignedTo")
    .optional({ checkFalsy: true })
    .isMongoId().withMessage("assignedTo must be a valid user ID"),
];

const updateTaskValidator = [
  body("type")
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage("Task type must be at most 200 characters"),

  body("text")
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage("Text must be at most 5000 characters"),

  body("prompt")
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage("Prompt must be at most 1000 characters"),

  body("assignedTo")
    .optional({ checkFalsy: true })
    .isMongoId().withMessage("assignedTo must be a valid user ID"),

  body("status")
    .optional()
    .isIn(["pending", "in-progress", "completed"])
    .withMessage("Status must be 'pending', 'in-progress', or 'completed'"),
];

module.exports = {
  createProjectValidator,
  updateProjectValidator,
  updateUserValidator,
  createTaskValidator,
  updateTaskValidator,
};
