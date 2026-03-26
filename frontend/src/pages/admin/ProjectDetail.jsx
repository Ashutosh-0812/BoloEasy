import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/ui/Modal";
import {
  getProjectById, createTask, updateTask, deleteTask, getAllUsers, getTaskById, getTaskSubmissions, streamSubmissionAudio, uploadTasksExcel
} from "../../api/admin.api";
import { Plus, Trash2, Pencil, ChevronLeft, Mic2, FileAudio, FileText, User2, CalendarClock, Upload } from "lucide-react";
import { PageSpinner, Spinner } from "../../components/ui/Spinner";
import toast from "react-hot-toast";

const TASK_TYPES = ["NE Read", "NE Variance", "NE Sentence"];
const EMPTY_TASK = { type: TASK_TYPES[0], text: "", prompt: "", assignedTo: "" };

const formatDateTime = (value) => {
  if (!value) return "Not available";
  return new Date(value).toLocaleString();
};

const formatFileSize = (bytes) => {
  if (!bytes) return "0 KB";
  return `${(bytes / 1024).toFixed(1)} KB`;
};

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_TASK);
  const [saving, setSaving] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskSubmissions, setTaskSubmissions] = useState([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState("");
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submissionAudioUrl, setSubmissionAudioUrl] = useState(null);
  const [submissionsByTaskId, setSubmissionsByTaskId] = useState({});
  const [selectedSubmissionByTaskId, setSelectedSubmissionByTaskId] = useState({});
  const [audioUrlByTaskId, setAudioUrlByTaskId] = useState({});
  const [loadingRowSubmissions, setLoadingRowSubmissions] = useState({});
  const [bulkUploading, setBulkUploading] = useState(false);
  const excelInputRef = useRef(null);

  const fetchProject = () => {
    Promise.all([getProjectById(id), getAllUsers()])
      .then(([pr, ur]) => {
        setProject(pr.data.data);
        setTasks(pr.data.data.tasks || []);
        setUsers(ur.data.data.filter((u) => u.role === "user" && u.isVerified));
      })
      .catch(() => toast.error("Failed to load project"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchProject(); }, [id]);

  useEffect(() => () => {
    if (submissionAudioUrl) {
      URL.revokeObjectURL(submissionAudioUrl);
    }
  }, [submissionAudioUrl]);

  useEffect(() => {
    let ignore = false;

    const loadTaskSubmissions = async () => {
      if (!tasks.length) {
        setSubmissionsByTaskId({});
        setSelectedSubmissionByTaskId({});
        setAudioUrlByTaskId((prev) => {
          Object.values(prev).forEach((url) => {
            if (url) URL.revokeObjectURL(url);
          });
          return {};
        });
        return;
      }

      setLoadingRowSubmissions((prev) => {
        const next = { ...prev };
        tasks.forEach((task) => { next[task._id] = true; });
        return next;
      });

      setAudioUrlByTaskId((prev) => {
        Object.values(prev).forEach((url) => {
          if (url) URL.revokeObjectURL(url);
        });
        return {};
      });

      const entries = await Promise.all(
        tasks.map(async (task) => {
          try {
            const res = await getTaskSubmissions(task._id);
            return [task._id, res.data.data || []];
          } catch {
            return [task._id, []];
          }
        })
      );

      if (ignore) return;

      const nextSubmissions = {};
      const nextSelectedSubmission = {};
      entries.forEach(([taskId, submissions]) => {
        nextSubmissions[taskId] = submissions;
        if (submissions.length) {
          nextSelectedSubmission[taskId] = submissions[0]._id;
        }
      });

      setSubmissionsByTaskId(nextSubmissions);
      setSelectedSubmissionByTaskId(nextSelectedSubmission);

      await Promise.all(
        entries.map(async ([taskId, submissions]) => {
          const firstSubmission = submissions[0];
          if (!firstSubmission?.audio?.url && !firstSubmission?.audio?.publicId) return;

          try {
            const audioResponse = await streamSubmissionAudio(firstSubmission._id);
            if (ignore) return;

            const blobUrl = URL.createObjectURL(audioResponse.data);
            setAudioUrlByTaskId((prev) => ({ ...prev, [taskId]: blobUrl }));
          } catch {
            // Keep row visible even if audio cannot be streamed.
          }
        })
      );

      if (!ignore) {
        setLoadingRowSubmissions({});
      }
    };

    loadTaskSubmissions();

    return () => {
      ignore = true;
    };
  }, [tasks]);

  const handleRowSubmissionChange = async (taskId, submissionId) => {
    setSelectedSubmissionByTaskId((prev) => ({ ...prev, [taskId]: submissionId }));
    setLoadingRowSubmissions((prev) => ({ ...prev, [taskId]: true }));

    const selectedSubmission = (submissionsByTaskId[taskId] || []).find((s) => s._id === submissionId);
    if (!selectedSubmission?.audio?.url && !selectedSubmission?.audio?.publicId) {
      setAudioUrlByTaskId((prev) => {
        const next = { ...prev };
        if (next[taskId]) URL.revokeObjectURL(next[taskId]);
        delete next[taskId];
        return next;
      });
      setLoadingRowSubmissions((prev) => ({ ...prev, [taskId]: false }));
      return;
    }

    try {
      const audioResponse = await streamSubmissionAudio(submissionId);
      const blobUrl = URL.createObjectURL(audioResponse.data);

      setAudioUrlByTaskId((prev) => {
        const next = { ...prev };
        if (next[taskId]) URL.revokeObjectURL(next[taskId]);
        next[taskId] = blobUrl;
        return next;
      });
    } catch {
      toast.error("Submission selected, but audio could not be loaded.");
    } finally {
      setLoadingRowSubmissions((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const openCreate = () => { setForm(EMPTY_TASK); setEditing(null); setModal("form"); };
  const openEdit = (t) => {
    setForm({ type: t.type, text: t.text, prompt: t.prompt, assignedTo: t.assignedTo?._id || "" });
    setEditing(t); setModal("form");
  };

  const closeSubmissionModal = () => {
    setModal(null);
    setSelectedTask(null);
    setTaskSubmissions([]);
    setSelectedSubmissionId("");
    if (submissionAudioUrl) {
      URL.revokeObjectURL(submissionAudioUrl);
      setSubmissionAudioUrl(null);
    }
  };

  const loadSubmissionAudio = async (submissionId) => {
    if (submissionAudioUrl) {
      URL.revokeObjectURL(submissionAudioUrl);
      setSubmissionAudioUrl(null);
    }

    if (!submissionId) return;
    const selected = taskSubmissions.find((s) => s._id === submissionId);
    if (!selected?.audio?.url && !selected?.audio?.publicId) return;

    try {
      const audioResponse = await streamSubmissionAudio(submissionId);
      const audioBlobUrl = URL.createObjectURL(audioResponse.data);
      setSubmissionAudioUrl(audioBlobUrl);
    } catch {
      toast.error("Submission loaded, but audio could not be played.");
    }
  };

  const openSubmission = async (taskId) => {
    setModal("submission");
    setSubmissionLoading(true);
    setSelectedTask(null);
    setTaskSubmissions([]);
    setSelectedSubmissionId("");

    if (submissionAudioUrl) {
      URL.revokeObjectURL(submissionAudioUrl);
      setSubmissionAudioUrl(null);
    }

    try {
      const [taskResponse, submissionsResponse] = await Promise.all([
        getTaskById(taskId),
        getTaskSubmissions(taskId),
      ]);
      const taskData = taskResponse.data.data;
      const submissions = submissionsResponse.data.data || [];
      setSelectedTask(taskData);
      setTaskSubmissions(submissions);

      if (submissions.length) {
        const firstSubmissionId = submissions[0]._id;
        setSelectedSubmissionId(firstSubmissionId);
        const firstSubmission = submissions[0];
        if (firstSubmission.audio?.publicId || firstSubmission.audio?.url) {
          const audioResponse = await streamSubmissionAudio(firstSubmissionId);
          const audioBlobUrl = URL.createObjectURL(audioResponse.data);
          setSubmissionAudioUrl(audioBlobUrl);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load task submission");
      closeSubmissionModal();
    } finally {
      setSubmissionLoading(false);
    }
  };

  const selectedSubmission = taskSubmissions.find((s) => s._id === selectedSubmissionId) || null;

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      // Clean up form data - remove empty assignedTo
      const cleanForm = { ...form };
      if (!cleanForm.assignedTo || cleanForm.assignedTo === "") {
        delete cleanForm.assignedTo;
      }

      if (editing) { await updateTask(editing._id, cleanForm); toast.success("Task updated!"); }
      else { await createTask(id, cleanForm); toast.success("Task created!"); }
      setModal(null); fetchProject();
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (errs) errs.forEach((e) => toast.error(e.message));
      else toast.error(err.response?.data?.message || "Failed");
    } finally { setSaving(false); }
  };

  const handleDelete = async (tid) => {
    if (!confirm("Delete this task?")) return;
    try { await deleteTask(tid); toast.success("Task deleted"); fetchProject(); }
    catch { toast.error("Delete failed"); }
  };

  const handleExcelSelection = async (event) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";
    if (!selectedFile) return;

    setBulkUploading(true);
    try {
      const response = await uploadTasksExcel(id, selectedFile);
      const result = response.data?.data;
      const message = response.data?.message || "Tasks imported.";
      toast.success(message);

      if (result?.errors?.length) {
        const previewErrors = result.errors.slice(0, 5)
          .map((item) => `Row ${item.row}: ${item.message}`)
          .join("\n");
        toast.error(`Some rows were skipped:\n${previewErrors}`);
      }

      fetchProject();
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (errs?.length) {
        errs.forEach((e) => toast.error(e.message));
      } else {
        toast.error(err.response?.data?.message || "Excel upload failed");
      }
    } finally {
      setBulkUploading(false);
    }
  };

  return (
    <AdminLayout>
      <Link to="/admin/projects" className="flex items-center gap-1.5 text-sm text-black/70 hover:text-black mb-6 transition">
        <ChevronLeft size={16} /> Back to Projects
      </Link>

      {loading ? <PageSpinner /> : (
        <>
          <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-primary-900 mb-1">{project?.name}</h1>
              <p className="text-primary-500 text-sm">{project?.description || "No description"}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleExcelSelection}
              />
              <button
                onClick={() => excelInputRef.current?.click()}
                className="btn-secondary flex items-center gap-2"
                disabled={bulkUploading}
                title="Upload Excel with Task Name, Text, language columns (English/Telugu/Hindi...), prompt optional"
              >
                <Upload size={16} /> {bulkUploading ? "Uploading..." : "Upload Excel"}
              </button>
              <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                <Plus size={16} /> Add Task
              </button>
            </div>
          </div>

          <div className="card p-0 overflow-hidden border border-[#c3cdc0] shadow-sm">
            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-[#d2dad0]">
              {tasks.map((t) => (
                <div
                  key={t._id}
                  className="p-4 space-y-2 cursor-pointer hover:bg-primary-50/70 transition"
                  onClick={() => openSubmission(t._id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-primary-700 bg-primary-100 px-2 py-0.5 rounded truncate">{t.taskId}</span>
                  </div>
                  <p className="text-xs text-black/80 bg-white border border-[#d1d9ce] px-2 py-0.5 rounded w-fit">{t.type}</p>
                  <p className="text-xs text-black/80 line-clamp-2">{t.text}</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-black/65 truncate">{t.prompt}</p>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                        className="p-1.5 rounded hover:bg-primary-100 text-black/60 hover:text-black transition"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(t._id); }}
                        className="p-1.5 rounded hover:bg-red-100 text-black/60 hover:text-red-700 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {!tasks.length && (
                <div className="px-4 py-12 text-center text-black/60">
                  <Mic2 size={32} className="mx-auto mb-2 opacity-30" />
                  No tasks yet. Add your first task.
                </div>
              )}
            </div>

            {/* Desktop table */}
            <table className="hidden sm:table w-full text-sm table-fixed">
              <thead>
                <tr className="border-b border-[#d2dad0] bg-primary-50/70">
                  <th className="text-left px-2 py-3 text-xs font-semibold text-black/60 uppercase tracking-wide w-[12%]">Task ID</th>
                  <th className="text-left px-2 py-3 text-xs font-semibold text-black/60 uppercase tracking-wide w-[15%]">Type</th>
                  <th className="text-left px-2 py-3 text-xs font-semibold text-black/60 uppercase tracking-wide w-[25%]">Text / User</th>
                  <th className="text-left px-2 py-3 text-xs font-semibold text-black/60 uppercase tracking-wide w-[20%]">Prompt / Audio</th>
                  <th className="text-left px-2 py-3 text-xs font-semibold text-black/60 uppercase tracking-wide w-[8%]">Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const rowSubmissions = submissionsByTaskId[t._id] || [];
                  const rowSelectedId = selectedSubmissionByTaskId[t._id] || "";
                  const hasSubmissionView = rowSubmissions.length > 0;
                  const rowAudioUrl = audioUrlByTaskId[t._id];

                  return (
                    <tr
                      key={t._id}
                      className="border-b border-[#d8e0d5] hover:bg-primary-50/60 transition cursor-pointer"
                      onClick={() => openSubmission(t._id)}
                      title="View task submission"
                    >
                      <td className="px-2 py-3.5 w-[12%]">
                        <span className="font-mono text-xs text-primary-700 bg-primary-100 px-1.5 py-0.5 rounded block truncate">{t.taskId}</span>
                      </td>
                      <td className="px-2 py-3.5 w-[15%]">
                        <span className="text-xs text-black/80 bg-white border border-[#d1d9ce] px-1.5 py-0.5 rounded block truncate">{t.type}</span>
                      </td>
                      <td className="px-2 py-3.5 w-[25%]">
                        {hasSubmissionView ? (
                          <select
                            className="input !h-8 !py-1 !px-2 !text-xs"
                            value={rowSelectedId}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleRowSubmissionChange(t._id, e.target.value);
                            }}
                          >
                            {rowSubmissions.map((s) => (
                              <option key={s._id} value={s._id}>
                                {s.userId?.name || "Unknown user"} ({s.userId?.email || "no-email"})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="text-black/80 text-xs truncate" title={t.text}>{t.text}</div>
                        )}
                      </td>
                      <td className="px-2 py-3.5 w-[20%]">
                        {hasSubmissionView ? (
                          rowAudioUrl ? (
                            <audio
                              controls
                              src={rowAudioUrl}
                              className="w-full h-8"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <div className="text-black/60 text-xs">
                              {loadingRowSubmissions[t._id] ? "Loading audio..." : "No audio for selected user"}
                            </div>
                          )
                        ) : (
                          <div className="text-black/65 text-xs truncate" title={t.prompt}>{t.prompt}</div>
                        )}
                      </td>
                      <td className="px-1 py-3.5 w-[8%]">
                        <div className="flex gap-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                            className="p-1 rounded hover:bg-primary-100 text-black/60 hover:text-black transition"
                            title="Edit"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(t._id); }}
                            className="p-1 rounded hover:bg-red-100 text-black/60 hover:text-red-700 transition"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!tasks.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-black/60">
                      <Mic2 size={32} className="mx-auto mb-2 opacity-30" />
                      No tasks yet. Add your first task.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {modal === "form" && (
        <Modal title={editing ? "Edit Task" : "Create Task"} onClose={() => setModal(null)} size="lg">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="label">Type *</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="input">
                {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Text * <span className="normal-case text-slate-500">(what the user reads)</span></label>
              <textarea value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                className="input resize-none" rows={4} placeholder="Enter the text to be read…" required />
            </div>
            <div>
              <label className="label">Prompt * <span className="normal-case text-slate-500">(instruction for user)</span></label>
              <input value={form.prompt} onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                className="input" placeholder="e.g. Read the sentence below clearly" required />
            </div>
           {/* <div>
              <label className="label">Assign To <span className="normal-case text-slate-500">(optional)</span></label>
              <select value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))} className="input">
                <option value="">— Unassigned —</option>
                {users.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
              </select>
            </div>*/}
            <div className="flex gap-3 justify-end pt-2">
              <button type="submit" disabled={saving} className="btn-secondary">
                {saving ? "Saving…" : editing ? "Update Task" : "Create Task"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "submission" && (
        <Modal title={selectedTask?.taskId ? `Task Submission · ${selectedTask.taskId}` : "Task Submission"} onClose={closeSubmissionModal} size="xl">
          {submissionLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : selectedTask ? (
            <div className="max-h-[75vh] overflow-y-auto overflow-x-hidden scrollbar-hidden space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[#c7d1c3] bg-[#eef2ec] p-4">
                  <p className="label mb-3">Project Details</p>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-black/55 text-xs uppercase tracking-wide">Project Name</p>
                      <p className="text-black mt-1">{project?.name || "Not available"}</p>
                    </div>
                    <div>
                      <p className="text-black/55 text-xs uppercase tracking-wide">Description</p>
                      <p className="text-black/80 mt-1 whitespace-pre-wrap">{project?.description || "No description"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#c7d1c3] bg-[#eef2ec] p-4">
                  <p className="label mb-3">Task Details</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-black/55 text-xs uppercase tracking-wide">Task ID</p>
                      <p className="text-black mt-1 font-mono">{selectedTask.taskId}</p>
                    </div>
                    <div>
                      <p className="text-black/55 text-xs uppercase tracking-wide">Type</p>
                      <p className="text-black/80 mt-1">{selectedTask.type}</p>
                    </div>
                    <div>
                      <p className="text-black/55 text-xs uppercase tracking-wide">Submission User</p>
                      <p className="text-black/80 mt-1">{selectedSubmission?.userId?.name || "No submission selected"}</p>
                      {selectedSubmission?.userId?.email && <p className="text-black/55 text-xs mt-0.5">{selectedSubmission.userId.email}</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#c7d1c3] bg-[#eef2ec] p-4">
                <p className="label mb-2">Submissions</p>
                {taskSubmissions.length ? (
                  <select
                    className="input"
                    value={selectedSubmissionId}
                    onChange={async (e) => {
                      const nextId = e.target.value;
                      setSelectedSubmissionId(nextId);
                      await loadSubmissionAudio(nextId);
                    }}
                  >
                    {taskSubmissions.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.userId?.name || "Unknown user"} ({s.userId?.email || "no-email"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-black/60 text-sm">No submissions yet for this task.</p>
                )}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[#c7d1c3] bg-[#eef2ec] p-4">
                  <div className="flex items-center gap-2 mb-3 text-black/80">
                    <FileText size={16} className="text-primary-400" />
                    <p className="label m-0">Prompt</p>
                  </div>
                  <p className="text-black/80 whitespace-pre-wrap break-all text-sm leading-relaxed">{selectedTask.prompt || "No prompt provided."}</p>
                </div>

                <div className="rounded-2xl border border-[#c7d1c3] bg-[#e6eee2] p-4 min-w-0">
                  <div className="flex items-center gap-2 mb-3 text-black/80">
                    <FileText size={16} className="text-primary-400" />
                    <p className="label m-0">Text To Read</p>
                  </div>
                  <p className="text-black whitespace-pre-wrap break-all text-sm leading-relaxed">{selectedTask.text || "No text provided."}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="rounded-2xl border border-[#c7d1c3] bg-[#eef2ec] p-4">
                  <div className="flex items-center gap-2 mb-3 text-black/80">
                    <FileAudio size={16} className="text-emerald-400" />
                    <p className="label m-0">Audio Submission</p>
                  </div>

                  {submissionAudioUrl ? (
                    <div className="space-y-4">
                      <audio controls src={submissionAudioUrl} className="w-full" />
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-black/55 text-xs uppercase tracking-wide">Uploaded At</p>
                          <p className="text-black/80 mt-1">{formatDateTime(selectedSubmission?.audio?.uploadedAt)}</p>
                        </div>
                        <div>
                          <p className="text-black/55 text-xs uppercase tracking-wide">File Size</p>
                          <p className="text-black/80 mt-1">{formatFileSize(selectedSubmission?.audio?.fileSizeBytes)}</p>
                        </div>
                        <div>
                          <p className="text-black/55 text-xs uppercase tracking-wide">Format</p>
                          <p className="text-black/80 mt-1">{selectedSubmission?.audio?.contentType || "audio/wav"}</p>
                        </div>
                        <div>
                          <p className="text-black/55 text-xs uppercase tracking-wide">Audio Spec</p>
                          <p className="text-black/80 mt-1">
                            {selectedSubmission?.audio?.sampleRate || 16000} Hz · {selectedSubmission?.audio?.bitDepth || 16}-bit · {selectedSubmission?.audio?.channels || 1} ch
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#c5cec1] bg-white px-4 py-8 text-center">
                      <Mic2 size={24} className="mx-auto mb-2 text-black/55" />
                      <p className="text-black/60 text-sm">No audio submission available for this selection yet.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-[#c7d1c3] bg-[#eef2ec] p-4">
                  <div className="flex items-center gap-2 text-black/80 mb-2">
                    <User2 size={15} className="text-sky-400" />
                    <p className="label m-0">Submission User</p>
                  </div>
                  <p className="text-black text-sm">{selectedSubmission?.userId?.name || "No submission selected"}</p>
                  <p className="text-black/55 text-xs mt-1">{selectedSubmission?.userId?.email || "No user email available"}</p>
                </div>

                <div className="rounded-2xl border border-[#c7d1c3] bg-[#eef2ec] p-4">
                  <div className="flex items-center gap-2 text-black/80 mb-2">
                    <CalendarClock size={15} className="text-primary-400" />
                    <p className="label m-0">Created</p>
                  </div>
                  <p className="text-black text-sm">{formatDateTime(selectedTask.createdAt)}</p>
                </div>

                <div className="rounded-2xl border border-[#c7d1c3] bg-[#eef2ec] p-4">
                  <div className="flex items-center gap-2 text-black/80 mb-2">
                    <CalendarClock size={15} className="text-emerald-400" />
                    <p className="label m-0">Last Updated</p>
                  </div>
                  <p className="text-black text-sm">{formatDateTime(selectedTask.updatedAt)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-black/55 text-sm">Task submission details are not available.</div>
          )}
        </Modal>
      )}
    </AdminLayout>
  );
}
