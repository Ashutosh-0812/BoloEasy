const svc = require("../services/admin.service");
const { successResponse, errorResponse, notFoundResponse } = require("../../../responses/apiResponse");
const logger = require("../../../logging/logger");

// ─── Dashboard ────────────────────────────────────────────────────────────────
const getDashboard = async (req, res, next) => {
  try {
    const stats = await svc.getDashboard();
    return successResponse(res, "Dashboard stats retrieved.", stats);
  } catch (err) { next(err); }
};

// ─── Users ────────────────────────────────────────────────────────────────────
const getAllUsers = async (req, res, next) => {
  try {
    const users = await svc.getAllUsers();
    return successResponse(res, "Users retrieved.", users);
  } catch (err) { next(err); }
};

const getPendingUsers = async (req, res, next) => {
  try {
    const users = await svc.getPendingUsers();
    return successResponse(res, "Pending users retrieved.", users);
  } catch (err) { next(err); }
};

const verifyUser = async (req, res, next) => {
  try {
    logger.info(`Admin ${req.user.id} verifying user ${req.params.id}`);
    const user = await svc.verifyUser(req.params.id);
    return successResponse(res, "User verified successfully.", user);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

// ─── Projects ─────────────────────────────────────────────────────────────────
const createProject = async (req, res, next) => {
  try {
    const project = await svc.createProject({ ...req.body, adminId: req.user.id });
    return successResponse(res, "Project created.", project, 201);
  } catch (err) { next(err); }
};

const getAllProjects = async (req, res, next) => {
  try {
    const projects = await svc.getAllProjects();
    return successResponse(res, "Projects retrieved.", projects);
  } catch (err) { next(err); }
};

const getProjectById = async (req, res, next) => {
  try {
    const project = await svc.getProjectById(req.params.id);
    return successResponse(res, "Project retrieved.", project);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const project = await svc.updateProject(req.params.id, req.body);
    return successResponse(res, "Project updated.", project);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    await svc.deleteProject(req.params.id);
    return successResponse(res, "Project deleted successfully.", null);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

// ─── Tasks ────────────────────────────────────────────────────────────────────
const createTask = async (req, res, next) => {
  try {
    const task = await svc.createTask({ projectId: req.params.projectId, ...req.body });
    return successResponse(res, "Task created.", task, 201);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const getTasksByProject = async (req, res, next) => {
  try {
    const tasks = await svc.getTasksByProject(req.params.projectId);
    return successResponse(res, "Tasks retrieved.", tasks);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const getTaskById = async (req, res, next) => {
  try {
    const task = await svc.getTaskById(req.params.id);
    return successResponse(res, "Task retrieved.", task);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const task = await svc.updateTask(req.params.id, req.body);
    return successResponse(res, "Task updated.", task);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    await svc.deleteTask(req.params.id);
    return successResponse(res, "Task deleted successfully.", null);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

const streamTaskAudio = async (req, res, next) => {
  try {
    const task = await svc.getTaskById(req.params.id);
    if (!task.audio || !task.audio.url) {
      return errorResponse(res, "No audio found for this task.", 404);
    }

    const { getAudioStream } = require("../../../services/cloudinary.service");
    const stream = await getAudioStream(task.audio.url);
    
    res.setHeader("Content-Type", task.audio.contentType || "audio/wav");
    res.setHeader("Content-Disposition", `attachment; filename="${task.taskId}.wav"`);
    stream.pipe(res);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

module.exports = {
  getDashboard,
  getAllUsers, getPendingUsers, verifyUser,
  createProject, getAllProjects, getProjectById, updateProject, deleteProject,
  createTask, getTasksByProject, getTaskById, updateTask, deleteTask,
  streamTaskAudio,
};
