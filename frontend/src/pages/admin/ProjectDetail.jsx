import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/ui/Modal";
import {
  getProjectById, createTask, updateTask, deleteTask, getAllUsers, getTaskById, streamTaskAudio
} from "../../api/admin.api";
import { Plus, Trash2, Pencil, ChevronLeft, Mic2, FileAudio, FileText, User2, CalendarClock } from "lucide-react";
import { PageSpinner, Spinner } from "../../components/ui/Spinner";
import toast from "react-hot-toast";

const TASK_TYPES = ["name entity-read", "name entity-variable", "name entity-sentence"];
const EMPTY_TASK = { type: TASK_TYPES[0], text: "", prompt: "", assignedTo: "" };

const statusBadge = (s) => {
  if (s === "completed") return <span className="badge-done">Completed</span>;
  if (s === "in-progress") return <span className="badge-progress">In Progress</span>;
  return <span className="badge-pending">Pending</span>;
};

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
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submissionAudioUrl, setSubmissionAudioUrl] = useState(null);

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

  const openCreate = () => { setForm(EMPTY_TASK); setEditing(null); setModal("form"); };
  const openEdit = (t) => {
    setForm({ type: t.type, text: t.text, prompt: t.prompt, assignedTo: t.assignedTo?._id || "" });
    setEditing(t); setModal("form");
  };

  const closeSubmissionModal = () => {
    setModal(null);
    setSelectedTask(null);
    if (submissionAudioUrl) {
      URL.revokeObjectURL(submissionAudioUrl);
      setSubmissionAudioUrl(null);
    }
  };

  const openSubmission = async (taskId) => {
    setModal("submission");
    setSubmissionLoading(true);
    setSelectedTask(null);

    if (submissionAudioUrl) {
      URL.revokeObjectURL(submissionAudioUrl);
      setSubmissionAudioUrl(null);
    }

    try {
      const taskResponse = await getTaskById(taskId);
      const taskData = taskResponse.data.data;
      setSelectedTask(taskData);

      if (taskData.audio?.publicId || taskData.audio?.url) {
        try {
          const audioResponse = await streamTaskAudio(taskId);
          const audioBlobUrl = URL.createObjectURL(audioResponse.data);
          setSubmissionAudioUrl(audioBlobUrl);
        } catch {
          toast.error("Task details loaded, but audio could not be played.");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load task submission");
      closeSubmissionModal();
    } finally {
      setSubmissionLoading(false);
    }
  };

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

  return (
    <AdminLayout>
      <Link to="/admin/projects" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition">
        <ChevronLeft size={16} /> Back to Projects
      </Link>

      {loading ? <PageSpinner /> : (
        <>
          <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{project?.name}</h1>
              <p className="text-slate-500 text-sm">{project?.description || "No description"}</p>
            </div>
            <button onClick={openCreate} className="btn-primary flex items-center gap-2 shrink-0">
              <Plus size={16} /> Add Task
            </button>
          </div>

          <div className="card p-0 overflow-hidden">
            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-surface-border">
              {tasks.map((t) => (
                <div
                  key={t._id}
                  className="p-4 space-y-2 cursor-pointer hover:bg-white/5 transition"
                  onClick={() => openSubmission(t._id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded truncate">{t.taskId}</span>
                    {statusBadge(t.status)}
                  </div>
                  <p className="text-xs text-slate-300 bg-white/5 border border-surface-border px-2 py-0.5 rounded w-fit">{t.type}</p>
                  <p className="text-xs text-slate-300 line-clamp-2">{t.text}</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500 truncate">{t.prompt}</p>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                        className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(t._id); }}
                        className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {!tasks.length && (
                <div className="px-4 py-12 text-center text-slate-500">
                  <Mic2 size={32} className="mx-auto mb-2 opacity-30" />
                  No tasks yet. Add your first task.
                </div>
              )}
            </div>

            {/* Desktop table */}
            <table className="hidden sm:table w-full text-sm table-fixed">
              <thead>
                <tr className="border-b border-surface-border bg-white/5">
                  <th className="text-left px-2 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-[12%]">Task ID</th>
                  <th className="text-left px-2 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-[15%]">Type</th>
                  <th className="text-left px-2 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-[25%]">Text</th>
                  <th className="text-left px-2 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-[20%]">Prompt</th>
                  <th className="text-left px-2 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-[10%]">Status</th>
                  <th className="text-left px-2 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-[6%]">Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr
                    key={t._id}
                    className="border-b border-surface-border hover:bg-white/5 transition cursor-pointer"
                    onClick={() => openSubmission(t._id)}
                    title="View task submission"
                  >
                    <td className="px-2 py-3.5 w-[12%]">
                      <span className="font-mono text-xs text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded block truncate">{t.taskId}</span>
                    </td>
                    <td className="px-2 py-3.5 w-[15%]">
                      <span className="text-xs text-slate-300 bg-white/5 border border-surface-border px-1.5 py-0.5 rounded block truncate">{t.type}</span>
                    </td>
                    <td className="px-2 py-3.5 w-[25%]">
                      <div className="text-slate-300 text-xs truncate" title={t.text}>{t.text}</div>
                    </td>
                    <td className="px-2 py-3.5 w-[20%]">
                      <div className="text-slate-400 text-xs truncate" title={t.prompt}>{t.prompt}</div>
                    </td>
                    <td className="px-2 py-3.5 w-[10%]">
                      {statusBadge(t.status)}
                    </td>
                    <td className="px-1 py-3.5 w-[6%]">
                      <div className="flex gap-0.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition"
                          title="Edit"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(t._id); }}
                          className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!tasks.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
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
            <div>
              <label className="label">Assign To <span className="normal-case text-slate-500">(optional)</span></label>
              <select value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))} className="input">
                <option value="">— Unassigned —</option>
                {users.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
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
                <div className="rounded-2xl border border-surface-border bg-white/5 p-4">
                  <p className="label mb-3">Project Details</p>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wide">Project Name</p>
                      <p className="text-white mt-1">{project?.name || "Not available"}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wide">Description</p>
                      <p className="text-slate-300 mt-1 whitespace-pre-wrap">{project?.description || "No description"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-surface-border bg-white/5 p-4">
                  <p className="label mb-3">Task Details</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wide">Task ID</p>
                      <p className="text-white mt-1 font-mono">{selectedTask.taskId}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wide">Status</p>
                      <div className="mt-1">{statusBadge(selectedTask.status)}</div>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wide">Type</p>
                      <p className="text-slate-300 mt-1">{selectedTask.type}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wide">Assigned User</p>
                      <p className="text-slate-300 mt-1">{selectedTask.assignedTo?.name || "Unassigned"}</p>
                      {selectedTask.assignedTo?.email && <p className="text-slate-500 text-xs mt-0.5">{selectedTask.assignedTo.email}</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-surface-border bg-white/5 p-4">
                  <div className="flex items-center gap-2 mb-3 text-slate-200">
                    <FileText size={16} className="text-primary-400" />
                    <p className="label m-0">Prompt</p>
                  </div>
                  <p className="text-slate-300 whitespace-pre-wrap break-all text-sm leading-relaxed">{selectedTask.prompt || "No prompt provided."}</p>
                </div>

                <div className="rounded-2xl border border-surface-border bg-gradient-to-br from-primary-900/30 to-surface-card p-4 border-primary-500/20 min-w-0">
                  <div className="flex items-center gap-2 mb-3 text-slate-200">
                    <FileText size={16} className="text-primary-400" />
                    <p className="label m-0">Text To Read</p>
                  </div>
                  <p className="text-white whitespace-pre-wrap break-all text-sm leading-relaxed">{selectedTask.text || "No text provided."}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-surface-border bg-white/5 p-4">
                  <div className="flex items-center gap-2 mb-3 text-slate-200">
                    <FileAudio size={16} className="text-emerald-400" />
                    <p className="label m-0">Audio Submission</p>
                  </div>

                  {submissionAudioUrl ? (
                    <div className="space-y-4">
                      <audio controls src={submissionAudioUrl} className="w-full" />
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-slate-500 text-xs uppercase tracking-wide">Uploaded At</p>
                          <p className="text-slate-300 mt-1">{formatDateTime(selectedTask.audio?.uploadedAt)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs uppercase tracking-wide">File Size</p>
                          <p className="text-slate-300 mt-1">{formatFileSize(selectedTask.audio?.fileSizeBytes)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs uppercase tracking-wide">Format</p>
                          <p className="text-slate-300 mt-1">{selectedTask.audio?.contentType || "audio/wav"}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs uppercase tracking-wide">Audio Spec</p>
                          <p className="text-slate-300 mt-1">
                            {selectedTask.audio?.sampleRate || 16000} Hz · {selectedTask.audio?.bitDepth || 16}-bit · {selectedTask.audio?.channels || 1} ch
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-surface-border bg-black/10 px-4 py-8 text-center">
                      <Mic2 size={24} className="mx-auto mb-2 text-slate-600" />
                      <p className="text-slate-400 text-sm">No audio submission available for this task yet.</p>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-surface-border bg-white/5 p-4">
                  <div className="flex items-center gap-2 mb-3 text-slate-200">
                    <FileText size={16} className="text-amber-400" />
                    <p className="label m-0">Transcript</p>
                  </div>
                  <div className="rounded-xl bg-black/20 border border-surface-border p-4 min-h-[220px]">
                    <p className="text-slate-300 whitespace-pre-wrap break-all text-sm leading-relaxed">
                      {selectedTask.transcript || "No transcript submitted yet."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-surface-border bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-slate-200 mb-2">
                    <User2 size={15} className="text-sky-400" />
                    <p className="label m-0">Assigned User</p>
                  </div>
                  <p className="text-white text-sm">{selectedTask.assignedTo?.name || "Unassigned"}</p>
                  <p className="text-slate-500 text-xs mt-1">{selectedTask.assignedTo?.email || "No user email available"}</p>
                </div>

                <div className="rounded-2xl border border-surface-border bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-slate-200 mb-2">
                    <CalendarClock size={15} className="text-primary-400" />
                    <p className="label m-0">Created</p>
                  </div>
                  <p className="text-white text-sm">{formatDateTime(selectedTask.createdAt)}</p>
                </div>

                <div className="rounded-2xl border border-surface-border bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-slate-200 mb-2">
                    <CalendarClock size={15} className="text-emerald-400" />
                    <p className="label m-0">Last Updated</p>
                  </div>
                  <p className="text-white text-sm">{formatDateTime(selectedTask.updatedAt)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-sm">Task submission details are not available.</div>
          )}
        </Modal>
      )}
    </AdminLayout>
  );
}
