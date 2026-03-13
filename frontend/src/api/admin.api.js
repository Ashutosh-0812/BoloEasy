import api from "./axios";

// Dashboard
export const getDashboard = () => api.get("/admin/dashboard");

// Users
export const getAllUsers = () => api.get("/admin/users");
export const getPendingUsers = () => api.get("/admin/users/pending");
export const verifyUser = (id) => api.patch(`/admin/users/${id}/verify`);

// Projects
export const createProject = (data) => api.post("/admin/projects", data);
export const getAllProjects = () => api.get("/admin/projects");
export const getProjectById = (id) => api.get(`/admin/projects/${id}`);
export const updateProject = (id, data) => api.patch(`/admin/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/admin/projects/${id}`);

// Tasks
export const createTask = (projectId, data) => api.post(`/admin/projects/${projectId}/tasks`, data);
export const getTasksByProject = (projectId) => api.get(`/admin/projects/${projectId}/tasks`);
export const getTaskById = (id) => api.get(`/admin/tasks/${id}`);
export const updateTask = (id, data) => api.patch(`/admin/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/admin/tasks/${id}`);

// Admin view user submissions
export const streamTaskAudio = (id) => api.get(`/admin/tasks/${id}/audio`, { responseType: 'blob' });
