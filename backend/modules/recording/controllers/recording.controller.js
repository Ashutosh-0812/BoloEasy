const svc = require("../services/recording.service");
const { successResponse, errorResponse, notFoundResponse } = require("../../../responses/apiResponse");
const logger = require("../../../logging/logger");

const shapeRecording = (rec) => {
  const audio = rec?.audio
    ? { url: rec.audio.url || null, uploadedAt: rec.audio.uploadedAt || null }
    : null;
  const user = rec?.userId
    ? { _id: rec.userId._id, name: rec.userId.name, email: rec.userId.email, role: rec.userId.role }
    : null;

  const task = rec?.taskId || null;
  const text = task?.text || null;

  // languageVariants may be a Map or an object; collect its keys as tags
  let tag = [];
  const lv = task?.languageVariants;
  if (lv) {
    if (Array.isArray(lv)) tag = lv;
    else if (typeof lv === "object") tag = Object.keys(lv);
  }

  const project = rec?.projectId ? { _id: rec.projectId._id, name: rec.projectId.name } : null;

  return { _id: rec._id, audio, user, text, tag, project, status: rec.status };
};

// ─── Get all recordings ────────────────────────────────────────────────────
const getAllRecordings = async (req, res, next) => {
  try {
    const recordings = await svc.getAllRecordings();
    const shaped = (recordings || []).map(shapeRecording);
    return successResponse(res, "Recordings retrieved successfully.", shaped);
  } catch (err) {
    next(err);
  }
};

// ─── Get recordings by project ─────────────────────────────────────────────
const getRecordingsByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const recordings = await svc.getRecordingsByProject(projectId);
    const shaped = (recordings || []).map(shapeRecording);
    return successResponse(res, "Recordings retrieved successfully.", shaped);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

// ─── Get recordings by user ────────────────────────────────────────────────
const getRecordingsByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const recordings = await svc.getRecordingsByUser(userId);
    const shaped = (recordings || []).map(shapeRecording);
    return successResponse(res, "Recordings retrieved successfully.", shaped);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

// ─── Get recordings by task ────────────────────────────────────────────────
const getRecordingsByTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const recordings = await svc.getRecordingsByTask(taskId);
    const shaped = (recordings || []).map(shapeRecording);
    return successResponse(res, "Recordings retrieved successfully.", shaped);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

// ─── Get recording by ID ───────────────────────────────────────────────────
const getRecordingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const recording = await svc.getRecordingById(id);
    if (!recording) {
      return notFoundResponse(res, "Recording not found");
    }
    return successResponse(res, "Recording retrieved successfully.", shapeRecording(recording));
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

// ─── Get recordings with audio only ────────────────────────────────────────
const getRecordingsWithAudio = async (req, res, next) => {
  try {
    const recordings = await svc.getRecordingsWithAudio();
    const shaped = (recordings || []).map(shapeRecording);
    return successResponse(res, "Recordings with audio retrieved successfully.", shaped);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllRecordings,
  getRecordingsByProject,
  getRecordingsByUser,
  getRecordingsByTask,
  getRecordingById,
  getRecordingsWithAudio,
};
