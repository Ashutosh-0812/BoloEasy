import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/ui/Modal";
import {
  getProjectById, createTask, updateTask, deleteTask, getAllUsers
} from "../../api/admin.api";
import { Plus, Trash2, Pencil, ChevronLeft, Mic2 } from "lucide-react";
import { PageSpinner } from "../../components/ui/Spinner";
import toast from "react-hot-toast";

const TASK_TYPES = ["name entity-read", "name entity-variable", "name entity-sentence"];
const EMPTY_TASK = { type: TASK_TYPES[0], text: "", prompt: "", assignedTo: "" };

const statusBadge = (s) => {
  if (s === "completed") return <span className="badge-done">Completed</span>;
  if (s === "in-progress") return <span className="badge-progress">In Progress</span>;
  return <span className="badge-pending">Pending</span>;
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

  const openCreate = () => { setForm(EMPTY_TASK); setEditing(null); setModal("form"); };
  const openEdit = (t) => {
    setForm({ type: t.type, text: t.text, prompt: t.prompt, assignedTo: t.assignedTo?._id || "" });
    setEditing(t); setModal("form");
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) { await updateTask(editing._id, form); toast.success("Task updated!"); }
      else { await createTask(id, form); toast.success("Task created!"); }
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
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{project?.name}</h1>
              <p className="text-slate-500 text-sm">{project?.description || "No description"}</p>
            </div>
            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Add Task
            </button>
          </div>

          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-white/5">
                  {["Task ID", "Type", "Text", "Prompt", "Assigned To", "Status", "Action"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t._id} className="border-b border-surface-border hover:bg-white/5 transition">
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded">{t.taskId}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-slate-300 bg-white/5 border border-surface-border px-2 py-0.5 rounded">{t.type}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300 max-w-xs truncate">{t.text}</td>
                    <td className="px-4 py-3.5 text-slate-400 max-w-xs truncate">{t.prompt}</td>
                    <td className="px-4 py-3.5 text-slate-400">{t.assignedTo?.name || <span className="text-slate-600">Unassigned</span>}</td>
                    <td className="px-4 py-3.5">{statusBadge(t.status)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(t)} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(t._id)} className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition">
                          <Trash2 size={14} />
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
    </AdminLayout>
  );
}
