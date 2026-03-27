const dao = require("../dao/user.dao");
const { uploadAudio, deleteAudio } = require("../../../services/cloudinary.service");
const logger = require("../../../logging/logger");

const getMyTasks = async (userId) => {
  return dao.getTasksForUser(userId);
};

const getMyProjects = async (userId) => {
  return dao.getProjectsForUser(userId);
};

const getProjectTasks = async (projectId, userId) => {
  const project = await dao.getProjectById(projectId);
  if (!project) {
    const err = new Error("Project not found.");
    err.statusCode = 404;
    throw err;
  }

  const hasAccess = await dao.userHasProject(userId, projectId);
  if (!hasAccess) {
    const err = new Error("Access denied. This project is not assigned to you.");
    err.statusCode = 403;
    throw err;
  }

  const tasks = await dao.getTasksForUserByProject(userId, projectId);
  return { project, tasks };
};

const getTaskDetail = async (taskId, userId) => {
  const task = await dao.getTaskByIdForUser(taskId);
  if (!task) {
    const err = new Error("Task not found.");
    err.statusCode = 404;
    throw err;
  }
  const hasAccess = await dao.userHasProject(userId, task.projectId);
  if (!hasAccess) {
    const err = new Error("Access denied. This project is not assigned to you.");
    err.statusCode = 403;
    throw err;
  }

  const submission = await dao.getTaskSubmissionForUser(taskId, userId);
  return {
    ...task,
    status: submission?.status || "pending",
    audio: submission?.audio || null,
  };
};

const uploadTaskAudio = async (taskId, audioBuffer, userId, fileSize) => {
  // Validate task ownership
  const existing = await getTaskDetail(taskId, userId);

  if (existing.audio && existing.audio.publicId) {
    try {
      await deleteAudio(existing.audio.publicId);
    } catch (delErr) {
      logger.warn(`Could not delete old Cloudinary audio for task ${taskId}: ${delErr.message}`);
    }
  }

  const { publicId, url, fileSizeBytes } = await uploadAudio(audioBuffer, taskId, userId);

  const status = "completed";
  await dao.saveAudio(taskId, existing.projectId, userId, { publicId, url, fileSizeBytes, status });
  logger.info(`Audio saved to Cloudinary for task ${taskId} | user: ${userId} | publicId: ${publicId}`);
  return getTaskDetail(taskId, userId);
};

const skipTask = async (taskId, userId) => {
  const existing = await getTaskDetail(taskId, userId);
  await dao.markTaskSkipped(taskId, existing.projectId, userId);
  return getTaskDetail(taskId, userId);
};

const flagTaskIssue = async (taskId, userId, note = "") => {
  const existing = await getTaskDetail(taskId, userId);
  await dao.reportTaskIssue(taskId, existing.projectId, userId, note);
  return getTaskDetail(taskId, userId);
};

module.exports = {
  getMyTasks,
  getMyProjects,
  getProjectTasks,
  getTaskDetail,
  uploadAudio: uploadTaskAudio,
  skipTask,
  flagTaskIssue,
};
