const https = require("https");
const { PassThrough } = require("stream");
const { v2: cloudinary } = require("cloudinary");
const config = require("../properties/config");
const logger = require("../logging/logger");

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

const assertConfigured = () => {
  if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
    const err = new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
    err.statusCode = 500;
    throw err;
  }
};

const uploadAudio = async (buffer, taskId, userId) => {
  assertConfigured();

  const publicId = `boloeasy/audio/${userId}/${taskId}_${Date.now()}`;
  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        public_id: publicId,
        format: "wav",
        overwrite: true,
      },
      (error, uploaded) => {
        if (error) return reject(error);
        resolve(uploaded);
      }
    );

    const inputStream = new PassThrough();
    inputStream.end(buffer);
    inputStream.pipe(uploadStream);
  });

  logger.info(`Audio uploaded to Cloudinary | publicId: ${result.public_id} | size: ${buffer.length} bytes`);
  return {
    publicId: result.public_id,
    url: result.secure_url,
    fileSizeBytes: buffer.length,
  };
};

const deleteAudio = async (publicId) => {
  if (!publicId) return;
  assertConfigured();

  await cloudinary.uploader.destroy(publicId, {
    resource_type: "video",
    invalidate: true,
  });

  logger.info(`Audio deleted from Cloudinary | publicId: ${publicId}`);
};

const getAudioStream = async (audioUrl) => {
  if (!audioUrl) {
    const err = new Error("Audio URL is required.");
    err.statusCode = 400;
    throw err;
  }

  return new Promise((resolve, reject) => {
    const request = https.get(audioUrl, (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        response.resume();
        return reject(new Error(`Cloudinary audio fetch failed with status ${response.statusCode}`));
      }

      resolve(response);
    });

    request.on("error", reject);
  });
};

module.exports = { uploadAudio, deleteAudio, getAudioStream };