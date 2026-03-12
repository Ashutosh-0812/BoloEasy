const userSvc = require("../services/user.service");
const { getAudioStream } = require("../../../services/s3.service");
const { successResponse, errorResponse } = require("../../../responses/apiResponse");
const logger = require("../../../logging/logger");

const getMyTasks = async (req, res, next) => {
  try {
    const tasks = await userSvc.getMyTasks(req.user.id);
    return successResponse(res, "Tasks retrieved.", tasks);
  } catch (err) { next(err); }
};

const getTaskDetail = async (req, res, next) => {
  try {
    const task = await userSvc.getTaskDetail(req.params.id, req.user.id);
    return successResponse(res, "Task retrieved.", task);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const uploadAudio = async (req, res, next) => {
  try {
    if (!req.file) {
      return errorResponse(res, "Audio file is required. Upload a PCM WAV file.", 400);
    }

    logger.info(
      `Audio upload | task: ${req.params.id} | user: ${req.user.id} | size: ${req.file.size} bytes | mimetype: ${req.file.mimetype}`
    );

    const task = await userSvc.uploadAudio(req.params.id, req.file.buffer, req.user.id, req.file.size);

    return successResponse(res, "Audio uploaded successfully to S3.", {
      taskId: task.taskId,
      status: task.status,
      audio: {
        s3Url: task.audio.s3Url,
        s3Key: task.audio.s3Key,
        contentType: task.audio.contentType,
        sampleRate: task.audio.sampleRate,
        bitDepth: task.audio.bitDepth,
        channels: task.audio.channels,
        uploadedAt: task.audio.uploadedAt,
        fileSizeBytes: task.audio.fileSizeBytes,
      },
    });
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const submitTranscript = async (req, res, next) => {
  try {
    const task = await userSvc.submitTranscript(req.params.id, req.body.transcript, req.user.id);
    return successResponse(res, "Transcript submitted successfully.", task);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

/**
 * Stream audio directly from S3 back to the client.
 * The S3 key is fetched from the task doc — users can only stream their own tasks.
 */
const streamAudio = async (req, res, next) => {
  try {
    const task = await userSvc.getTaskDetail(req.params.id, req.user.id);

    if (!task.audio || !task.audio.s3Key) {
      return errorResponse(res, "No audio recorded for this task yet.", 404);
    }

    logger.info(`Audio stream | task: ${req.params.id} | user: ${req.user.id} | key: ${task.audio.s3Key}`);

    const stream = await getAudioStream(task.audio.s3Key);
    res.setHeader("Content-Type", task.audio.contentType || "audio/wav");
    res.setHeader("Content-Disposition", `attachment; filename="${task.taskId}.wav"`);
    stream.pipe(res);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

module.exports = { getMyTasks, getTaskDetail, uploadAudio, submitTranscript, streamAudio };
