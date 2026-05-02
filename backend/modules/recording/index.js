const express = require("express");
const router = express.Router();
const ctrl = require("./controllers/recording.controller");
const { authenticate } = require("../../middlewares/auth");
const { validateObjectId } = require("../../validators/common.validator");

// ─── Public Routes ────────────────────────────────────────────────────────

// GET /recording
// Get all recordings with audio, user, text, tag, and project data
router.get("/", ctrl.getAllRecordings);

// GET /recording/audio-only
// Get only recordings that have audio files
router.get("/audio-only", authenticate, ctrl.getRecordingsWithAudio);

// ─── Protected Routes ─────────────────────────────────────────────────────

// GET /recording/:id
// Get a specific recording by ID
router.get("/:id", authenticate, [validateObjectId("id")], ctrl.getRecordingById);

// GET /recording/project/:projectId
// Get recordings for a specific project
router.get("/project/:projectId", authenticate, [validateObjectId("projectId")], ctrl.getRecordingsByProject);

// GET /recording/user/:userId
// Get recordings for a specific user
router.get("/user/:userId", authenticate, [validateObjectId("userId")], ctrl.getRecordingsByUser);

// GET /recording/task/:taskId
// Get recordings for a specific task
router.get("/task/:taskId", authenticate, [validateObjectId("taskId")], ctrl.getRecordingsByTask);

module.exports = router;
