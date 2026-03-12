const { S3Client, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const config = require("../properties/config");
const logger = require("../logging/logger");

const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

/**
 * Upload a PCM WAV buffer to S3.
 * @param {Buffer} buffer  - Raw audio bytes
 * @param {string} taskId  - Used to name the S3 key
 * @param {string} userId  - Used to namespace the key
 * @returns {object} { key, url, fileSizeBytes }
 */
const uploadAudioToS3 = async (buffer, taskId, userId) => {
  const key = `audio/${userId}/${taskId}_${Date.now()}.wav`;

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: config.aws.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: "audio/wav",
      Metadata: {
        userId,
        taskId,
        sampleRate: "16000",
        bitDepth: "16",
        channels: "1",
      },
    },
  });

  const result = await upload.done();
  const url = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;

  logger.info(`Audio uploaded to S3 | key: ${key} | size: ${buffer.length} bytes`);
  return { key, url, fileSizeBytes: buffer.length };
};

/**
 * Delete an audio file from S3 by its key.
 * @param {string} key
 */
const deleteAudioFromS3 = async (key) => {
  if (!key) return;
  await s3Client.send(new DeleteObjectCommand({ Bucket: config.aws.s3Bucket, Key: key }));
  logger.info(`Audio deleted from S3 | key: ${key}`);
};

/**
 * Get a readable stream for an S3 audio file (for playback/download proxy).
 * @param {string} key
 */
const getAudioStream = async (key) => {
  const response = await s3Client.send(
    new GetObjectCommand({ Bucket: config.aws.s3Bucket, Key: key })
  );
  return response.Body;
};

module.exports = { uploadAudioToS3, deleteAudioFromS3, getAudioStream };
