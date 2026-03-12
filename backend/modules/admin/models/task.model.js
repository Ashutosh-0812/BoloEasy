const mongoose = require("mongoose");

const TASK_TYPES = [
  "name entity-read",
  "name entity-variable",
  "name entity-sentence",
];

const taskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      unique: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project ID is required"],
    },
    type: {
      type: String,
      enum: {
        values: TASK_TYPES,
        message: `Type must be one of: ${TASK_TYPES.join(", ")}`,
      },
      required: [true, "Task type is required"],
    },
    text: {
      type: String,
      required: [true, "Text is required"],
      trim: true,
      maxlength: [5000, "Text must be at most 5000 characters"],
    },
    prompt: {
      type: String,
      required: [true, "Prompt is required"],
      trim: true,
      maxlength: [1000, "Prompt must be at most 1000 characters"],
    },
    audio: {
      s3Key: { type: String, default: null },       // S3 object key
      s3Url: { type: String, default: null },       // Public/direct S3 URL
      contentType: { type: String, default: "audio/wav" },
      sampleRate: { type: Number, default: 16000 },
      bitDepth: { type: Number, default: 16 },
      channels: { type: Number, default: 1 },
      uploadedAt: { type: Date, default: null },
      fileSizeBytes: { type: Number, default: 0 },
    },
    transcript: {
      type: String,
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Auto-generate taskId before save
taskSchema.pre("save", async function (next) {
  if (!this.taskId) {
    const count = await mongoose.model("Task").countDocuments();
    this.taskId = `TASK-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Task", taskSchema);
