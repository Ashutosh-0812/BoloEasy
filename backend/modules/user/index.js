const express = require("express");
const router = express.Router();
const ctrl = require("./controllers/user.controller");
const { authenticate, requireRole } = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const { validateObjectId } = require("../../validators/common.validator");
const { transcriptValidator } = require("./validators/user.validator");
const audioUpload = require("./services/audioUpload.service");

// All user routes require authentication + user role
router.use(authenticate, requireRole("user"));

// GET /api/user/tasks
router.get("/tasks", ctrl.getMyTasks);

// GET /api/user/tasks/:id
router.get("/tasks/:id", [validateObjectId("id"), validate], ctrl.getTaskDetail);

// POST /api/user/tasks/:id/audio  (multipart/form-data, field name: "audio")
router.post(
  "/tasks/:id/audio",
  [validateObjectId("id"), validate],
  audioUpload.single("audio"),
  ctrl.uploadAudio
);

// GET /api/user/tasks/:id/audio  — stream audio directly from S3
router.get("/tasks/:id/audio", [validateObjectId("id"), validate], ctrl.streamAudio);

// POST /api/user/tasks/:id/transcript
router.post(
  "/tasks/:id/transcript",
  [validateObjectId("id"), ...transcriptValidator, validate],
  ctrl.submitTranscript
);

module.exports = router;
