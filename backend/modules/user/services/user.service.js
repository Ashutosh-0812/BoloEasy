const dao = require("../dao/user.dao");
const { uploadAudioToS3, deleteAudioFromS3 } = require("../../../services/s3.service");
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

const uploadAudio = async (taskId, audioBuffer, userId, fileSize) => {
  // Validate task ownership
  const existing = await getTaskDetail(taskId, userId);

  // If there's an old S3 file, delete it first
  if (existing.audio && existing.audio.s3Key) {
    try {
      await deleteAudioFromS3(existing.audio.s3Key);
    } catch (delErr) {
      logger.warn(`Could not delete old S3 audio for task ${taskId}: ${delErr.message}`);
    }
  }

  // Upload to S3
  const { s3Key, s3Url, fileSizeBytes } = await uploadAudioToS3(audioBuffer, taskId, userId);

  // Persist S3 metadata to MongoDB
  const task = await dao.saveAudio(taskId, { s3Key, s3Url, fileSizeBytes });
  logger.info(`Audio saved to S3 for task ${taskId} | user: ${userId} | key: ${s3Key}`);
  return task;
};

const submitTranscript = async (taskId, transcript, userId) => {
  await getTaskDetail(taskId, userId);
  const task = await dao.saveTranscript(taskId, transcript);
  logger.info(`Transcript submitted for task ${taskId} by user ${userId}`);
  return task;
};

module.exports = { getMyTasks, getTaskDetail, uploadAudio, submitTranscript };
