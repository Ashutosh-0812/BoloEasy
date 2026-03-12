import api from "./axios";

export const getMyTasks = () => api.get("/user/tasks");
export const getTaskDetail = (id) => api.get(`/user/tasks/${id}`);
export const submitTranscript = (id, transcript) =>
  api.post(`/user/tasks/${id}/transcript`, { transcript });
export const uploadAudio = (id, file) => {
  const form = new FormData();
  form.append("audio", file);
  return api.post(`/user/tasks/${id}/audio`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// Stream audio from S3
export const streamAudio = (id) => api.get(`/user/tasks/${id}/audio`, { 
  responseType: 'blob' 
});
