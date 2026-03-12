const express = require("express");
const router = express.Router();
const ctrl = require("./controllers/admin.controller");
const { authenticate, requireRole } = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const { validateObjectId } = require("../../validators/common.validator");
const {
  createProjectValidator,
  updateProjectValidator,
  createTaskValidator,
  updateTaskValidator,
} = require("./validators/admin.validator");

// All admin routes require authentication + admin role
router.use(authenticate, requireRole("admin"));

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get("/dashboard", ctrl.getDashboard);

// ─── Users ────────────────────────────────────────────────────────────────────
router.get("/users", ctrl.getAllUsers);
router.get("/users/pending", ctrl.getPendingUsers);
router.patch("/users/:id/verify", [validateObjectId("id"), validate], ctrl.verifyUser);

// ─── Projects ─────────────────────────────────────────────────────────────────
router.post("/projects", createProjectValidator, validate, ctrl.createProject);
router.get("/projects", ctrl.getAllProjects);
router.get("/projects/:id", [validateObjectId("id"), validate], ctrl.getProjectById);
router.patch("/projects/:id", [validateObjectId("id"), ...updateProjectValidator, validate], ctrl.updateProject);
router.delete("/projects/:id", [validateObjectId("id"), validate], ctrl.deleteProject);

// ─── Tasks ────────────────────────────────────────────────────────────────────
router.post("/projects/:projectId/tasks", [validateObjectId("projectId"), ...createTaskValidator, validate], ctrl.createTask);
router.get("/projects/:projectId/tasks", [validateObjectId("projectId"), validate], ctrl.getTasksByProject);
router.get("/tasks/:id", [validateObjectId("id"), validate], ctrl.getTaskById);
router.patch("/tasks/:id", [validateObjectId("id"), ...updateTaskValidator, validate], ctrl.updateTask);
router.delete("/tasks/:id", [validateObjectId("id"), validate], ctrl.deleteTask);

module.exports = router;
