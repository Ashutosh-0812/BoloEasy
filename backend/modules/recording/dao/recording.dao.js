const TaskSubmission = require("../../admin/models/taskSubmission.model");

// ─── Get all recordings ────────────────────────────────────────────────────
const getAllRecordings = async () => {
  return TaskSubmission.find()
    .populate({
      path: "userId",
      model: "User",
      select: "name email role",
    })
    .populate({
      path: "taskId",
      model: "Task",
      select: "taskId type text prompt languageVariants",
    })
    .populate({
      path: "projectId",
      model: "Project",
      select: "name description",
    })
    .sort({ createdAt: -1 })
    .lean();
};

// ─── Get recordings by project ─────────────────────────────────────────────
const getRecordingsByProject = async (projectId) => {
  return TaskSubmission.find({ projectId })
    .populate({
      path: "userId",
      model: "User",
      select: "name email role",
    })
    .populate({
      path: "taskId",
      model: "Task",
      select: "taskId type text prompt languageVariants",
    })
    .populate({
      path: "projectId",
      model: "Project",
      select: "name description",
    })
    .sort({ createdAt: -1 })
    .lean();
};

// ─── Get recordings by user ────────────────────────────────────────────────
const getRecordingsByUser = async (userId) => {
  return TaskSubmission.find({ userId })
    .populate({
      path: "userId",
      model: "User",
      select: "name email role",
    })
    .populate({
      path: "taskId",
      model: "Task",
      select: "taskId type text prompt languageVariants",
    })
    .populate({
      path: "projectId",
      model: "Project",
      select: "name description",
    })
    .sort({ createdAt: -1 })
    .lean();
};

// ─── Get recordings by task ────────────────────────────────────────────────
const getRecordingsByTask = async (taskId) => {
  return TaskSubmission.find({ taskId })
    .populate({
      path: "userId",
      model: "User",
      select: "name email role",
    })
    .populate({
      path: "taskId",
      model: "Task",
      select: "taskId type text prompt languageVariants",
    })
    .populate({
      path: "projectId",
      model: "Project",
      select: "name description",
    })
    .sort({ createdAt: -1 })
    .lean();
};

// ─── Get recording by ID ───────────────────────────────────────────────────
const getRecordingById = async (id) => {
  return TaskSubmission.findById(id)
    .populate({
      path: "userId",
      model: "User",
      select: "name email role",
    })
    .populate({
      path: "taskId",
      model: "Task",
      select: "taskId type text prompt languageVariants",
    })
    .populate({
      path: "projectId",
      model: "Project",
      select: "name description",
    })
    .lean();
};

// ─── Get recordings with audio only ────────────────────────────────────────
const getRecordingsWithAudio = async () => {
  return TaskSubmission.find({ "audio.url": { $exists: true, $ne: null } })
    .populate({
      path: "userId",
      model: "User",
      select: "name email role",
    })
    .populate({
      path: "taskId",
      model: "Task",
      select: "taskId type text prompt languageVariants",
    })
    .populate({
      path: "projectId",
      model: "Project",
      select: "name description",
    })
    .sort({ "audio.uploadedAt": -1 })
    .lean();
};

module.exports = {
  getAllRecordings,
  getRecordingsByProject,
  getRecordingsByUser,
  getRecordingsByTask,
  getRecordingById,
  getRecordingsWithAudio,
};
