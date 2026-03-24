const Task = require("../../admin/models/task.model");
const Project = require("../../admin/models/project.model");
const ProjectAssignment = require("../../admin/models/projectAssignment.model");
const TaskSubmission = require("../../admin/models/taskSubmission.model");

const getAssignedProjectIds = async (userId) => {
  const assignments = await ProjectAssignment.find({ userId }).select("projectId").lean();
  return assignments.map((a) => a.projectId);
};

const getTasksForUser = async (userId) => {
  const projectIds = await getAssignedProjectIds(userId);
  if (!projectIds.length) return [];

  const [tasks, submissions] = await Promise.all([
    Task.find({ projectId: { $in: projectIds } }).sort({ createdAt: -1 }).lean(),
    TaskSubmission.find({ userId, projectId: { $in: projectIds } }).lean(),
  ]);

  const byTaskId = new Map(submissions.map((s) => [s.taskId.toString(), s]));
  return tasks.map((task) => {
    const submission = byTaskId.get(task._id.toString());
    return {
      ...task,
      status: submission?.status || "pending",
      audio: submission?.audio || null,
    };
  });
};

const getProjectsForUser = async (userId) => {
  const projectIds = await getAssignedProjectIds(userId);
  if (!projectIds.length) return [];

  const [projects, projectTasks, submissions] = await Promise.all([
    Project.find({ _id: { $in: projectIds } }).sort({ createdAt: -1 }).lean(),
    Task.find({ projectId: { $in: projectIds } }).select("_id projectId").lean(),
    TaskSubmission.find({ userId, projectId: { $in: projectIds } }).select("projectId taskId status").lean(),
  ]);

  const taskIdsByProject = new Map();
  projectTasks.forEach((task) => {
    const key = task.projectId.toString();
    if (!taskIdsByProject.has(key)) taskIdsByProject.set(key, new Set());
    taskIdsByProject.get(key).add(task._id.toString());
  });

  const statsByProject = new Map();
  projectIds.forEach((pid) => {
    const key = pid.toString();
    const total = taskIdsByProject.get(key)?.size || 0;
    statsByProject.set(key, { total, completed: 0, inProgress: 0, pending: total });
  });

  submissions.forEach((s) => {
    const key = s.projectId.toString();
    if (!statsByProject.has(key)) {
      statsByProject.set(key, { total: 0, completed: 0, inProgress: 0, pending: 0 });
    }
    const stats = statsByProject.get(key);
    if (s.status === "completed") stats.completed += 1;
    else if (s.status === "in-progress") stats.inProgress += 1;
  });

  statsByProject.forEach((stats) => {
    const done = stats.completed + stats.inProgress;
    stats.pending = Math.max(0, stats.total - done);
  });

  return projects.map((project) => ({
    ...project,
    stats: statsByProject.get(project._id.toString()) || {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
    },
  }));
};

const userHasProject = async (userId, projectId) => {
  return ProjectAssignment.exists({ userId, projectId });
};

const getProjectById = async (projectId) => {
  return Project.findById(projectId);
};

const getTasksForUserByProject = async (userId, projectId) => {
  const [tasks, submissions] = await Promise.all([
    Task.find({ projectId }).sort({ createdAt: -1 }).lean(),
    TaskSubmission.find({ userId, projectId }).lean(),
  ]);

  const byTaskId = new Map(submissions.map((s) => [s.taskId.toString(), s]));

  return tasks.map((task) => {
    const submission = byTaskId.get(task._id.toString());
    return {
      ...task,
      status: submission?.status || "pending",
      audio: submission?.audio || task.audio,
    };
  });
};

const getTaskByIdForUser = async (taskId) => {
  return Task.findById(taskId).lean();
};

const getTaskSubmissionForUser = async (taskId, userId) => {
  return TaskSubmission.findOne({ taskId, userId });
};

const saveAudio = async (taskId, projectId, userId, { publicId, url, fileSizeBytes, status }) => {
  return TaskSubmission.findOneAndUpdate(
    { taskId, userId },
    {
      $set: {
        taskId,
        projectId,
        userId,
        status,
        "audio.provider": "cloudinary",
        "audio.publicId": publicId,
        "audio.url": url,
        "audio.contentType": "audio/wav",
        "audio.sampleRate": 16000,
        "audio.bitDepth": 16,
        "audio.channels": 1,
        "audio.uploadedAt": new Date(),
        "audio.fileSizeBytes": fileSizeBytes,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

module.exports = {
  getTasksForUser,
  getProjectsForUser,
  userHasProject,
  getProjectById,
  getTasksForUserByProject,
  getTaskByIdForUser,
  getTaskSubmissionForUser,
  saveAudio,
};
