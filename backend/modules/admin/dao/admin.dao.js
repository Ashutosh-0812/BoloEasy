const User = require("../../register/models/user.model");
const Project = require("../models/project.model");
const Task = require("../models/task.model");
const ProjectAssignment = require("../models/projectAssignment.model");
const TaskSubmission = require("../models/taskSubmission.model");

// ─── Users ──────────────────────────────────────────────────────────────────

const getAllUsers = async () => {
  return User.find().select("-password").sort({ createdAt: -1 });
};

const getPendingUsers = async () => {
  return User.find({ isVerified: false }).select("-password").sort({ createdAt: -1 });
};

const verifyUser = async (userId) => {
  return User.findByIdAndUpdate(userId, { isVerified: true }, { new: true }).select("-password");
};

const getUserById = async (userId) => {
  return User.findById(userId).select("-password");
};

const getUserByEmail = async (email) => {
  return User.findOne({ email: String(email).trim().toLowerCase() }).select("-password");
};

// ─── Projects ────────────────────────────────────────────────────────────────

const createProject = async (data) => {
  const project = new Project(data);
  return project.save();
};

const getAllProjects = async () => {
  return Project.find().populate("createdBy", "name email").sort({ createdAt: -1 });
};

const getProjectById = async (id) => {
  return Project.findById(id).populate("createdBy", "name email").populate("tasks");
};

const updateProject = async (id, data) => {
  return Project.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

const deleteProject = async (id) => {
  return Project.findByIdAndDelete(id);
};

// ─── Tasks ───────────────────────────────────────────────────────────────────

const createTask = async (data) => {
  const task = new Task(data);
  const savedTask = await task.save();
  return Task.findById(savedTask._id).populate("assignedTo", "name email");
};

const addTaskToProject = async (projectId, taskId) => {
  return Project.findByIdAndUpdate(projectId, { $push: { tasks: taskId } }, { new: true });
};

const addTasksToProject = async (projectId, taskIds) => {
  return Project.findByIdAndUpdate(projectId, { $push: { tasks: { $each: taskIds } } }, { new: true });
};

const getTasksByProject = async (projectId) => {
  return Task.find({ projectId })
    .select("-audio.data")
    .populate("assignedTo", "name email")
    .sort({ createdAt: -1 });
};

const getTaskById = async (id) => {
  return Task.findById(id).select("-audio.data").populate("assignedTo", "name email");
};

const updateTask = async (id, data) => {
  return Task.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .select("-audio.data")
    .populate("assignedTo", "name email");
};

const deleteTask = async (id) => {
  return Task.findByIdAndDelete(id);
};

const removeTaskFromProject = async (projectId, taskId) => {
  return Project.findByIdAndUpdate(projectId, { $pull: { tasks: taskId } }, { new: true });
};

const assignProjectToUser = async (projectId, userId, adminId) => {
  return ProjectAssignment.findOneAndUpdate(
    { projectId, userId },
    { $set: { assignedBy: adminId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const getAssignedProjectIdsByUser = async (userId) => {
  const assignments = await ProjectAssignment.find({ userId }).select("projectId").lean();
  return assignments.map((a) => a.projectId.toString());
};

const getTaskSubmissions = async (taskId) => {
  return TaskSubmission.find({ taskId })
    .populate("userId", "name email")
    .sort({ updatedAt: -1 });
};

const getTaskSubmissionById = async (submissionId) => {
  return TaskSubmission.findById(submissionId).populate("userId", "name email");
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

const getDashboardStats = async () => {
  const [totalUsers, pendingUsers, totalProjects, totalTasks, tasksByStatus] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isVerified: false }),
    Project.countDocuments(),
    Task.countDocuments(),
    Task.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const statusMap = {};
  tasksByStatus.forEach((s) => { statusMap[s._id] = s.count; });

  return {
    users: { total: totalUsers, pending: pendingUsers, verified: totalUsers - pendingUsers },
    projects: { total: totalProjects },
    tasks: {
      total: totalTasks,
      pending: statusMap["pending"] || 0,
      inProgress: statusMap["in-progress"] || 0,
      completed: statusMap["completed"] || 0,
    },
  };
};

module.exports = {
  getAllUsers, getPendingUsers, verifyUser,
  getUserById, getUserByEmail,
  createProject, getAllProjects, getProjectById, updateProject, deleteProject,
  createTask, addTaskToProject, addTasksToProject, getTasksByProject, getTaskById, updateTask, deleteTask, removeTaskFromProject,
  assignProjectToUser,
  getAssignedProjectIdsByUser,
  getTaskSubmissions,
  getTaskSubmissionById,
  getDashboardStats,
};
