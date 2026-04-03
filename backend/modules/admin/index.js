const express = require("express");
const router = express.Router();
const ctrl = require("./controllers/admin.controller");
const { authenticate, requireRole } = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const { validateObjectId } = require("../../validators/common.validator");
const excelUpload = require("./services/taskExcelUpload.service");
const {
  createProjectValidator,
  updateProjectValidator,
  createTaskValidator,
  updateTaskValidator,
  updateUserValidator,
} = require("./validators/admin.validator");

// All admin routes require authentication + admin role
router.use(authenticate, requireRole("admin"));

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get("/dashboard", ctrl.getDashboard);

// ─── Users ────────────────────────────────────────────────────────────────────
router.get("/users", ctrl.getAllUsers);
router.get("/users/pending", ctrl.getPendingUsers);
router.patch("/users/:id/verify", [validateObjectId("id"), validate], ctrl.verifyUser);
router.patch("/users/:id", [validateObjectId("id"), ...updateUserValidator, validate], ctrl.updateUser);
router.patch(
  "/projects/:projectId/assign/:userId",
  [validateObjectId("projectId"), validateObjectId("userId"), validate],
  ctrl.assignProjectToUser
);
router.delete(
  "/projects/:projectId/assign/:userId",
  [validateObjectId("projectId"), validateObjectId("userId"), validate],
  ctrl.unassignProjectFromUser
);
router.get(
  "/users/:userId/assigned-projects",
  [validateObjectId("userId"), validate],
  ctrl.getAssignedProjectIdsByUser
);

// ─── Projects ─────────────────────────────────────────────────────────────────
router.post("/projects", createProjectValidator, validate, ctrl.createProject);
router.get("/projects", ctrl.getAllProjects);
router.get("/projects/:id", [validateObjectId("id"), validate], ctrl.getProjectById);
router.patch("/projects/:id", [validateObjectId("id"), ...updateProjectValidator, validate], ctrl.updateProject);
router.delete("/projects/:id", [validateObjectId("id"), validate], ctrl.deleteProject);

// ─── Tasks ────────────────────────────────────────────────────────────────────
router.post("/projects/:projectId/tasks", [validateObjectId("projectId"), ...createTaskValidator, validate], ctrl.createTask);
router.post(
  "/projects/:projectId/tasks/upload",
  [validateObjectId("projectId"), validate],
  excelUpload.single("file"),
  ctrl.uploadTasksExcel
);
router.get("/projects/:projectId/tasks", [validateObjectId("projectId"), validate], ctrl.getTasksByProject);
router.get("/tasks/:id", [validateObjectId("id"), validate], ctrl.getTaskById);
router.patch("/tasks/:id", [validateObjectId("id"), ...updateTaskValidator, validate], ctrl.updateTask);
router.delete("/tasks/:id", [validateObjectId("id"), validate], ctrl.deleteTask);

// ─── Admin view user submissions ─────────────────────────────────────────────
router.get("/tasks/:id/audio", [validateObjectId("id"), validate], ctrl.streamTaskAudio);
router.get("/tasks/:id/submissions", [validateObjectId("id"), validate], ctrl.getTaskSubmissions);
router.get("/submissions/:id/audio", [validateObjectId("id"), validate], ctrl.streamSubmissionAudio);
router.delete("/submissions/:id", [validateObjectId("id"), validate], ctrl.deleteSubmission);
router.patch("/submissions/:id/flag-comment", [validateObjectId("id"), validate], ctrl.addAdminCommentToFlag);

module.exports = router;
