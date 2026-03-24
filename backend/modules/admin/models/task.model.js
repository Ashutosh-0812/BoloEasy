const mongoose = require("mongoose");
const Counter = require("./counter.model");

let counterSeeded = false;

const getCurrentMaxTaskSequence = async () => {
  const result = await mongoose.model("Task").aggregate([
    { $match: { taskId: { $type: "string", $regex: "^TASK-\\d+$" } } },
    {
      $project: {
        seq: {
          $toInt: {
            $substrBytes: ["$taskId", 5, -1],
          },
        },
      },
    },
    { $sort: { seq: -1 } },
    { $limit: 1 },
  ]);

  return result[0]?.seq || 0;
};

const ensureTaskCounterSeeded = async () => {
  if (counterSeeded) return;

  const maxSeq = await getCurrentMaxTaskSequence();
  await Counter.findOneAndUpdate(
    { _id: "taskId" },
    { $max: { seq: maxSeq } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  counterSeeded = true;
};

const getNextTaskSequence = async () => {
  await ensureTaskCounterSeeded();

  const counter = await Counter.findOneAndUpdate(
    { _id: "taskId" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return counter.seq;
};

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
      required: [true, "Task type is required"],
      trim: true,
      maxlength: [200, "Task type must be at most 200 characters"],
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
    languageVariants: {
      type: Map,
      of: String,
      default: {},
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
    const nextSeq = await getNextTaskSequence();
    this.taskId = `TASK-${String(nextSeq).padStart(4, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Task", taskSchema);
