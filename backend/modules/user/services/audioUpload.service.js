const multer = require("multer");
const config = require("../../../properties/config");

// Store in memory — we'll persist raw buffer to MongoDB
const storage = multer.memoryStorage();

const audioUpload = multer({
  storage,
  limits: { fileSize: config.audio.maxSizeMB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "audio/wav" || file.mimetype === "audio/x-wav" || file.mimetype === "audio/wave") {
      cb(null, true);
    } else {
      cb(new Error("Only PCM WAV audio files are accepted."), false);
    }
  },
});

module.exports = audioUpload;
