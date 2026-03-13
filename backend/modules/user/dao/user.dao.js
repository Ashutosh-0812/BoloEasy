const Task = require("../../admin/models/task.model");

const getTasksForUser = async (userId) => {
  return Task.find({ assignedTo: userId }).sort({ createdAt: -1 });
};

const getTaskByIdForUser = async (taskId) => {
  return Task.findById(taskId);
};

const saveAudio = async (taskId, { s3Key, s3Url, fileSizeBytes, status }) => {
  return Task.findByIdAndUpdate(
    taskId,
    {
      "audio.s3Key": s3Key,
      "audio.s3Url": s3Url,
      "audio.contentType": "audio/wav",
      "audio.sampleRate": 16000,
      "audio.bitDepth": 16,
      "audio.channels": 1,
      "audio.uploadedAt": new Date(),
      "audio.fileSizeBytes": fileSizeBytes,
      status,
    },
    { new: true }
  );
};

const saveTranscript = async (taskId, transcript, status) => {
  return Task.findByIdAndUpdate(
    taskId,
    { transcript, status },
    { new: true }
  );
};

module.exports = { getTasksForUser, getTaskByIdForUser, saveAudio, saveTranscript };
