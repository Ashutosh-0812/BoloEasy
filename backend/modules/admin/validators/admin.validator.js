const { body, param } = require("express-validator");

const TASK_TYPES = ["name entity-read", "name entity-variable", "name entity-sentence"];

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

// ─── Task Validators ──────────────────────────────────────────────────────────

const createTaskValidator = [
  body("type")
    .trim()
    .notEmpty().withMessage("Task type is required")
    .isIn(TASK_TYPES).withMessage(`Type must be one of: ${TASK_TYPES.join(", ")}`),

  body("text")
    .trim()
    .notEmpty().withMessage("Text is required")
    .isLength({ max: 5000 }).withMessage("Text must be at most 5000 characters"),

  body("prompt")
    .trim()
    .notEmpty().withMessage("Prompt is required")
    .isLength({ max: 1000 }).withMessage("Prompt must be at most 1000 characters"),

  body("assignedTo")
    .optional()
    .isMongoId().withMessage("assignedTo must be a valid user ID"),
];

const updateTaskValidator = [
  body("type")
    .optional()
    .trim()
    .isIn(TASK_TYPES).withMessage(`Type must be one of: ${TASK_TYPES.join(", ")}`),

  body("text")
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage("Text must be at most 5000 characters"),

  body("prompt")
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage("Prompt must be at most 1000 characters"),

  body("assignedTo")
    .optional()
    .isMongoId().withMessage("assignedTo must be a valid user ID"),

  body("status")
    .optional()
    .isIn(["pending", "in-progress", "completed"])
    .withMessage("Status must be 'pending', 'in-progress', or 'completed'"),
];

module.exports = {
  createProjectValidator,
  updateProjectValidator,
  createTaskValidator,
  updateTaskValidator,
};
