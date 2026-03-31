const mongoose = require("mongoose");

const taskSubmissionSchema = new mongoose.Schema(
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
    reportedIssue: {
      flagged: { type: Boolean, default: false },
      note: { type: String, default: "" },
      reportedAt: { type: Date, default: null },
      adminComment: { type: String, default: "" },
      adminCommentedAt: { type: Date, default: null },
      adminCommentedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
  },
  { timestamps: true }
);

taskSubmissionSchema.index({ taskId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("TaskSubmission", taskSubmissionSchema);
