const dao = require("../dao/user.dao");
const { uploadAudio, deleteAudio } = require("../../../services/cloudinary.service");
const logger = require("../../../logging/logger");

const getMyTasks = async (userId) => {
  return dao.getTasksForUser(userId);
};

const getTaskDetail = async (taskId, userId) => {
  const task = await dao.getTaskByIdForUser(taskId);
  if (!task) {
    const err = new Error("Task not found.");
    err.statusCode = 404;
    throw err;
  }
  if (task.assignedTo && task.assignedTo.toString() !== userId.toString()) {
    const err = new Error("Access denied. This task is not assigned to you.");
    err.statusCode = 403;
    throw err;
  }
  return task;
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

  const status = existing.transcript?.trim() ? "completed" : "in-progress";
  const task = await dao.saveAudio(taskId, { publicId, url, fileSizeBytes, status });
  logger.info(`Audio saved to Cloudinary for task ${taskId} | user: ${userId} | publicId: ${publicId}`);
  return task;
};

const submitTranscript = async (taskId, transcript, userId) => {
  const existing = await getTaskDetail(taskId, userId);
  const status = existing.audio?.publicId ? "completed" : "in-progress";
  const task = await dao.saveTranscript(taskId, transcript, status);
  logger.info(`Transcript submitted for task ${taskId} by user ${userId}`);
  return task;
};

module.exports = { getMyTasks, getTaskDetail, uploadAudio: uploadTaskAudio, submitTranscript };
