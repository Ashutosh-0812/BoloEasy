const mongoose = require("mongoose");

// This model represents a recording which is essentially a TaskSubmission with audio
// We use the TaskSubmission model from admin module, but this file documents the structure
// The actual model is in ../admin/models/taskSubmission.model.js

const recordingSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    audio: {
      provider: { type: String, default: null },
      publicId: { type: String, default: null },
      url: { type: String, default: null },
      contentType: { type: String, default: "audio/wav" },
      sampleRate: { type: Number, default: 16000 },
      bitDepth: { type: Number, default: 16 },
      channels: { type: Number, default: 1 },
      uploadedAt: { type: Date, default: null },
      fileSizeBytes: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "skipped"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

// Note: This is a reference schema. The actual model used is TaskSubmission from admin module
module.exports = mongoose.model("Recording", recordingSchema);
