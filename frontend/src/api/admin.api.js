import api from "./axios";

// Dashboard
export const getDashboard = () => api.get("/admin/dashboard");

// Users
export const getAllUsers = () => api.get("/admin/users");
export const getPendingUsers = () => api.get("/admin/users/pending");
export const verifyUser = (id) => api.patch(`/admin/users/${id}/verify`);
export const updateUser = (id, data) => api.patch(`/admin/users/${id}`, data);
export const getAssignedProjectIdsByUser = (userId) => api.get(`/admin/users/${userId}/assigned-projects`);
export const assignProjectToUser = (projectId, userId) =>
	api.patch(`/admin/projects/${projectId}/assign/${userId}`);
export const unassignProjectFromUser = (projectId, userId) =>
	api.delete(`/admin/projects/${projectId}/assign/${userId}`);

// Projects
export const createProject = (data) => api.post("/admin/projects", data);
export const getAllProjects = () => api.get("/admin/projects");
export const getProjectById = (id) => api.get(`/admin/projects/${id}`);
export const updateProject = (id, data) => api.patch(`/admin/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/admin/projects/${id}`);

// Tasks
export const createTask = (projectId, data) => api.post(`/admin/projects/${projectId}/tasks`, data);
export const uploadTasksExcel = (projectId, file) => {
	const formData = new FormData();
	formData.append("file", file);
	return api.post(`/admin/projects/${projectId}/tasks/upload`, formData, {
		headers: { "Content-Type": "multipart/form-data" },
	});
};
export const downloadTaskTemplate = () => {
	return api.get("/public/Template.xlsx", { responseType: "blob" });
};
export const getTasksByProject = (projectId) => api.get(`/admin/projects/${projectId}/tasks`);
export const getTaskById = (id) => api.get(`/admin/tasks/${id}`);
export const updateTask = (id, data) => api.patch(`/admin/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/admin/tasks/${id}`);

// Admin view user submissions
export const streamTaskAudio = (id) => api.get(`/admin/tasks/${id}/audio`, { responseType: 'blob' });
export const getTaskSubmissions = (id) => api.get(`/admin/tasks/${id}/submissions`);
export const streamSubmissionAudio = (id) => api.get(`/admin/submissions/${id}/audio`, { responseType: 'blob' });
export const deleteSubmission = (id) => api.delete(`/admin/submissions/${id}`);
export const addAdminCommentToFlag = (submissionId, data) => api.patch(`/admin/submissions/${submissionId}/flag-comment`, data);
