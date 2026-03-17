const Task = require("../../admin/models/task.model");

const getTasksForUser = async (userId) => {
  return Task.find({ assignedTo: userId }).sort({ createdAt: -1 });
};

const getTaskByIdForUser = async (taskId) => {
  return Task.findById(taskId);
};

const saveAudio = async (taskId, { publicId, url, fileSizeBytes, status }) => {
  return Task.findByIdAndUpdate(
    taskId,
    {
      "audio.provider": "cloudinary",
      "audio.publicId": publicId,
      "audio.url": url,
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
