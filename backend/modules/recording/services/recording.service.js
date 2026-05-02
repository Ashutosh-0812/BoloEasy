const dao = require("../dao/recording.dao");
const logger = require("../../../logging/logger");

// ─── Get all recordings ────────────────────────────────────────────────────
const getAllRecordings = async () => {
  try {
    const recordings = await dao.getAllRecordings();
    logger.info(`Retrieved ${recordings.length} recordings`);
    return recordings;
  } catch (err) {
    logger.error(`Error fetching recordings: ${err.message}`);
    throw err;
  }
};

// ─── Get recordings by project ─────────────────────────────────────────────
const getRecordingsByProject = async (projectId) => {
  try {
    const recordings = await dao.getRecordingsByProject(projectId);
    logger.info(`Retrieved ${recordings.length} recordings for project ${projectId}`);
    return recordings;
  } catch (err) {
    logger.error(`Error fetching recordings for project ${projectId}: ${err.message}`);
    throw err;
  }
};

// ─── Get recordings by user ────────────────────────────────────────────────
const getRecordingsByUser = async (userId) => {
  try {
    const recordings = await dao.getRecordingsByUser(userId);
    logger.info(`Retrieved ${recordings.length} recordings for user ${userId}`);
    return recordings;
  } catch (err) {
    logger.error(`Error fetching recordings for user ${userId}: ${err.message}`);
    throw err;
  }
};

// ─── Get recordings by task ────────────────────────────────────────────────
const getRecordingsByTask = async (taskId) => {
  try {
    const recordings = await dao.getRecordingsByTask(taskId);
    logger.info(`Retrieved ${recordings.length} recordings for task ${taskId}`);
    return recordings;
  } catch (err) {
    logger.error(`Error fetching recordings for task ${taskId}: ${err.message}`);
    throw err;
  }
};

// ─── Get recording by ID ───────────────────────────────────────────────────
const getRecordingById = async (id) => {
  try {
    const recording = await dao.getRecordingById(id);
    if (!recording) {
      const err = new Error("Recording not found");
      err.statusCode = 404;
      throw err;
    }
    logger.info(`Retrieved recording ${id}`);
    return recording;
  } catch (err) {
    logger.error(`Error fetching recording ${id}: ${err.message}`);
    throw err;
  }
};

// ─── Get recordings with audio only ────────────────────────────────────────
const getRecordingsWithAudio = async () => {
  try {
    const recordings = await dao.getRecordingsWithAudio();
    logger.info(`Retrieved ${recordings.length} recordings with audio`);
    return recordings;
  } catch (err) {
    logger.error(`Error fetching recordings with audio: ${err.message}`);
    throw err;
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
