const dao = require("../dao/admin.dao");
const logger = require("../../../logging/logger");

// ─── Dashboard ────────────────────────────────────────────────────────────────
const getDashboard = async () => dao.getDashboardStats();

// ─── Users ────────────────────────────────────────────────────────────────────
const getAllUsers = async () => dao.getAllUsers();
const getPendingUsers = async () => dao.getPendingUsers();

const verifyUser = async (userId) => {
  const user = await dao.verifyUser(userId);
  if (!user) {
    const err = new Error("User not found.");
    err.statusCode = 404;
    throw err;
  }
  logger.info(`Admin verified user: ${user.email}`);
  return user;
};

// ─── Projects ─────────────────────────────────────────────────────────────────
const createProject = async ({ name, description, adminId }) => {
  const project = await dao.createProject({ name, description, createdBy: adminId });
  logger.info(`Project created: ${project.name} (by admin ${adminId})`);
  return project;
};

const getAllProjects = async () => dao.getAllProjects();
const getProjectById = async (id) => {
  const project = await dao.getProjectById(id);
  if (!project) {
    const err = new Error("Project not found.");
    err.statusCode = 404;
    throw err;
  }
  return project;
};

const updateProject = async (id, data) => {
  const project = await dao.updateProject(id, data);
  if (!project) {
    const err = new Error("Project not found.");
    err.statusCode = 404;
    throw err;
  }
  logger.info(`Project updated: ${id}`);
  return project;
};

const deleteProject = async (id) => {
  const project = await dao.deleteProject(id);
  if (!project) {
    const err = new Error("Project not found.");
    err.statusCode = 404;
    throw err;
  }
  logger.info(`Project deleted: ${id}`);
  return project;
};

// ─── Tasks ────────────────────────────────────────────────────────────────────
const createTask = async ({ projectId, type, text, prompt, assignedTo }) => {
  // Ensure project exists
  const project = await dao.getProjectById(projectId);
  if (!project) {
    const err = new Error("Project not found.");
    err.statusCode = 404;
    throw err;
  }

  // Build task data
  const taskData = { projectId, type, text, prompt };
  if (assignedTo) {
    taskData.assignedTo = assignedTo;
  }

  const task = await dao.createTask(taskData);
  await dao.addTaskToProject(projectId, task._id);
  logger.info(`Task created: ${task.taskId} under project ${projectId}`);
  return task;
};

const getTasksByProject = async (projectId) => {
  await getProjectById(projectId); // validates project exists
  return dao.getTasksByProject(projectId);
};

const getTaskById = async (id) => {
  const task = await dao.getTaskById(id);
  if (!task) {
    const err = new Error("Task not found.");
    err.statusCode = 404;
    throw err;
  }
  return task;
};

const updateTask = async (id, data) => {
  const task = await dao.updateTask(id, data);
  if (!task) {
    const err = new Error("Task not found.");
    err.statusCode = 404;
    throw err;
  }
  logger.info(`Task updated: ${id}`);
  return task;
};

const deleteTask = async (id) => {
  const task = await dao.getTaskById(id);
  if (!task) {
    const err = new Error("Task not found.");
    err.statusCode = 404;
    throw err;
  }
  await dao.removeTaskFromProject(task.projectId, id);
  await dao.deleteTask(id);
  logger.info(`Task deleted: ${id}`);
  return task;
};

module.exports = {
  getDashboard,
  getAllUsers, getPendingUsers, verifyUser,
  createProject, getAllProjects, getProjectById, updateProject, deleteProject,
  createTask, getTasksByProject, getTaskById, updateTask, deleteTask,
};
