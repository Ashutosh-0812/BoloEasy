import api from "./axios";

export const getMyTasks = () => api.get("/user/tasks");
export const getMyProjects = () => api.get("/user/projects");
export const getProjectTasks = (id) => api.get(`/user/projects/${id}/tasks`);
export const getTaskDetail = (id) => api.get(`/user/tasks/${id}`);
export const uploadAudio = (id, file) => {
  const form = new FormData();
  form.append("audio", file);
  return api.post(`/user/tasks/${id}/audio`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// Stream uploaded audio through the backend proxy
export const streamAudio = (id) => api.get(`/user/tasks/${id}/audio`, { 
  responseType: 'blob' 
});

export const skipTask = (id) => api.post(`/user/tasks/${id}/skip`);
export const flagTaskIssue = (id, payload = {}) => api.post(`/user/tasks/${id}/flag`, payload);
