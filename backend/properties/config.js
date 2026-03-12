require("dotenv").config();

const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/boloeasy",
  jwtSecret: process.env.JWT_SECRET || "default_secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  nodeEnv: process.env.NODE_ENV || "development",

  audio: {
    sampleRate: 16000,
    bitDepth: 16,
    channels: 1,
    format: "audio/wav",
    maxSizeMB: 50,
  },

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || "ap-south-1",
    s3Bucket: process.env.AWS_S3_BUCKET,
  },
};

module.exports = config;
