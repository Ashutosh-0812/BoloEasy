const dao = require("../dao/admin.dao");
const logger = require("../../../logging/logger");
const xlsx = require("xlsx");

const normalizeHeader = (value = "") => String(value).trim().toLowerCase().replace(/[_\s-]+/g, "");

const getCellValue = (row, aliases) => {
  const rowKeys = Object.keys(row || {});
  const matchedKey = rowKeys.find((key) => aliases.includes(normalizeHeader(key)));
  return matchedKey ? row[matchedKey] : undefined;
};

const DEFAULT_PROMPT = "Read the text clearly";

const NON_LANGUAGE_HEADERS = new Set([
  "sno",
  "s.no",
  "serialno",
  "serialnumber",
  "type",
  "tasktype",
  "taskname",
  "task",
  "text",
  "tasktext",
  "content",
  "prompt",
  "instruction",
  "instructions",
  "assignedto",
  "assignedtoid",
  "assignedtoemail",
  "assignee",
  "assigneeemail",
]);

const getLanguageVariantsFromRow = (row = {}) => {
  const variants = {};

  Object.keys(row).forEach((key) => {
    const normalized = normalizeHeader(key);
    if (!normalized || NON_LANGUAGE_HEADERS.has(normalized)) return;

    const value = toText(row[key]);
    if (!value) return;

    variants[String(key).trim()] = value;
  });

  return variants;
};

const toText = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const getTaskSequence = (taskId = "") => {
  const match = String(taskId).match(/^TASK-(\d+)$/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
};

const sortTasksByTaskId = (tasks = []) => {
  return [...tasks].sort((a, b) => {
    const aSeq = getTaskSequence(a.taskId);
    const bSeq = getTaskSequence(b.taskId);
    if (aSeq !== bSeq) return aSeq - bSeq;
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });
};

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

const updateUser = async (userId, payload) => {
  const user = await dao.getUserById(userId);
  if (!user) {
    const err = new Error("User not found.");
    err.statusCode = 404;
    throw err;
  }

  const updateData = {};
  if (payload.name !== undefined) updateData.name = String(payload.name).trim();
  if (payload.email !== undefined) updateData.email = String(payload.email).trim().toLowerCase();
  if (payload.role !== undefined) updateData.role = payload.role;
  if (payload.isVerified !== undefined) updateData.isVerified = payload.isVerified;

  if (Object.keys(updateData).length === 0) {
    const err = new Error("At least one field is required to update user.");
    err.statusCode = 400;
    throw err;
  }

  if (updateData.email && updateData.email !== user.email) {
    const userWithEmail = await dao.getUserByEmail(updateData.email);
    if (userWithEmail && String(userWithEmail._id) !== String(userId)) {
      const err = new Error("Email is already in use.");
      err.statusCode = 409;
      throw err;
    }
  }

  const updatedUser = await dao.updateUser(userId, updateData);
  logger.info(`Admin updated user: ${updatedUser.email}`);
  return updatedUser;
};

const assignProjectToUser = async (projectId, userId, adminId) => {
  const [project, user] = await Promise.all([
    dao.getProjectById(projectId),
    dao.getUserById(userId),
  ]);

  if (!project) {
    const err = new Error("Project not found.");
    err.statusCode = 404;
    throw err;
  }

  if (!user) {
    const err = new Error("User not found.");
    err.statusCode = 404;
    throw err;
  }

  if (user.role !== "user") {
    const err = new Error("Project can only be assigned to users with role 'user'.");
    err.statusCode = 400;
    throw err;
  }

  if (!user.isVerified) {
    const err = new Error("User must be verified before project assignment.");
    err.statusCode = 400;
    throw err;
  }

  await dao.assignProjectToUser(projectId, userId, adminId);
  logger.info(`Project ${projectId} assigned to user ${userId} by admin ${adminId}.`);

  return {
    projectId,
    userId,
    assignment: "created-or-updated",
  };
};

const unassignProjectFromUser = async (projectId, userId, adminId) => {
  const [project, user] = await Promise.all([
    dao.getProjectById(projectId),
    dao.getUserById(userId),
  ]);

  if (!project) {
    const err = new Error("Project not found.");
    err.statusCode = 404;
    throw err;
  }

  if (!user) {
    const err = new Error("User not found.");
    err.statusCode = 404;
    throw err;
  }

  const removed = await dao.unassignProjectFromUser(projectId, userId);
  if (!removed) {
    const err = new Error("Project is not assigned to this user.");
    err.statusCode = 404;
    throw err;
  }

  logger.info(`Project ${projectId} unassigned from user ${userId} by admin ${adminId}.`);

  return {
    projectId,
    userId,
    assignment: "removed",
  };
};

const getAssignedProjectIdsByUser = async (userId) => {
  const user = await dao.getUserById(userId);
  if (!user) {
    const err = new Error("User not found.");
    err.statusCode = 404;
    throw err;
  }

  return dao.getAssignedProjectIdsByUser(userId);
};

const getTaskSubmissions = async (taskId) => {
  const task = await dao.getTaskById(taskId);
  if (!task) {
    const err = new Error("Task not found.");
    err.statusCode = 404;
    throw err;
  }

  return dao.getTaskSubmissions(taskId);
};

const getTaskSubmissionById = async (submissionId) => {
  const submission = await dao.getTaskSubmissionById(submissionId);
  if (!submission) {
    const err = new Error("Submission not found.");
    err.statusCode = 404;
    throw err;
  }

  return submission;
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
  if (Array.isArray(project.tasks)) {
    project.tasks = sortTasksByTaskId(project.tasks);
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
const createTask = async ({ projectId, type, text, prompt, languageVariants, assignedTo }) => {
  // Ensure project exists
  const project = await dao.getProjectById(projectId);
  if (!project) {
    const err = new Error("Project not found.");
    err.statusCode = 404;
    throw err;
  }

  // Build task data
  const taskData = { projectId, type, text, prompt };
  if (languageVariants && Object.keys(languageVariants).length) {
    taskData.languageVariants = languageVariants;
  }
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

const createTasksFromExcel = async (projectId, fileBuffer) => {
  const project = await dao.getProjectById(projectId);
  if (!project) {
    const err = new Error("Project not found.");
    err.statusCode = 404;
    throw err;
  }

  let workbook;
  try {
    workbook = xlsx.read(fileBuffer, { type: "buffer" });
  } catch {
    const err = new Error("Invalid Excel file. Please upload a valid .xlsx or .xls file.");
    err.statusCode = 400;
    throw err;
  }

  const firstSheetName = workbook.SheetNames?.[0];
  if (!firstSheetName) {
    const err = new Error("Excel file is empty.");
    err.statusCode = 400;
    throw err;
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "", raw: false });

  if (!rows.length) {
    const err = new Error("No rows found in the uploaded file.");
    err.statusCode = 400;
    throw err;
  }

  if (rows.length > 500) {
    const err = new Error("Maximum 500 tasks can be uploaded at once.");
    err.statusCode = 400;
    throw err;
  }

  const rowErrors = [];
  const createdTasks = [];
  const createdTaskIds = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const excelRowNumber = index + 2;

    const type = toText(getCellValue(row, ["taskname"]));
    const text = toText(getCellValue(row, ["text", "tasktext", "content", "english"]));
    const prompt = toText(getCellValue(row, ["prompt", "instruction", "instructions"])) || DEFAULT_PROMPT;
    const assignedToRaw = toText(getCellValue(row, ["assignedto", "assignedtoid", "assignedtoemail", "assignee", "assigneeemail"]));
    const languageVariants = getLanguageVariantsFromRow(row);

    if (!languageVariants.English && text) {
      languageVariants.English = text;
    }

    if (!type || !text) {
      rowErrors.push({ row: excelRowNumber, message: "Task Name and Text are required." });
      continue;
    }

    if (text.length > 5000) {
      rowErrors.push({ row: excelRowNumber, message: "Text must be at most 5000 characters." });
      continue;
    }

    if (prompt.length > 1000) {
      rowErrors.push({ row: excelRowNumber, message: "Prompt must be at most 1000 characters." });
      continue;
    }

    let assignedTo;
    if (assignedToRaw) {
      let user = null;
      if (/^[a-f\d]{24}$/i.test(assignedToRaw)) {
        user = await dao.getUserById(assignedToRaw);
      } else if (assignedToRaw.includes("@")) {
        user = await dao.getUserByEmail(assignedToRaw);
      }

      if (!user) {
        rowErrors.push({ row: excelRowNumber, message: "assignedTo user not found (use valid user ID or email)." });
        continue;
      }

      if (user.role !== "user") {
        rowErrors.push({ row: excelRowNumber, message: "assignedTo must be a user account." });
        continue;
      }

      if (!user.isVerified) {
        rowErrors.push({ row: excelRowNumber, message: "assignedTo user must be verified." });
        continue;
      }

      assignedTo = user._id;
    }

    try {
      const task = await dao.createTask({ projectId, type, text, prompt, languageVariants, assignedTo });
      createdTasks.push(task);
      createdTaskIds.push(task._id);
    } catch (err) {
      rowErrors.push({ row: excelRowNumber, message: err.message || "Failed to create task." });
    }
  }

  if (createdTaskIds.length) {
    await dao.addTasksToProject(projectId, createdTaskIds);
  }

  logger.info(
    `Bulk task upload completed | project: ${projectId} | created: ${createdTasks.length} | failed: ${rowErrors.length}`
  );

  return {
    createdCount: createdTasks.length,
    failedCount: rowErrors.length,
    totalRows: rows.length,
    errors: rowErrors,
    tasks: createdTasks,
  };
};

module.exports = {
  getDashboard,
  getAllUsers, getPendingUsers, verifyUser, updateUser,
  assignProjectToUser,
  unassignProjectFromUser,
  getAssignedProjectIdsByUser,
  getTaskSubmissions,
  getTaskSubmissionById,
  createProject, getAllProjects, getProjectById, updateProject, deleteProject,
  createTask, createTasksFromExcel, getTasksByProject, getTaskById, updateTask, deleteTask,
};
