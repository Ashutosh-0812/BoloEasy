import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/ui/Modal";
import { getAllProjects, createProject, updateProject, deleteProject } from "../../api/admin.api";
import { useAuth } from "../../context/AuthContext";
import { FolderOpen, Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import { PageSpinner } from "../../components/ui/Spinner";
import toast from "react-hot-toast";

const EMPTY = { name: "", description: "" };

export default function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit'
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const fetch = () => {
    getAllProjects()
      .then((r) => setProjects(r.data.data))
      .catch(() => toast.error("Failed to load projects"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setForm(EMPTY); setEditing(null); setModal("form"); };
  const openEdit = (p) => { setForm({ name: p.name, description: p.description }); setEditing(p); setModal("form"); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateProject(editing._id, form);
        toast.success("Project updated!");
      } else {
        await createProject(form);
        toast.success("Project created!");
      }
      setModal(null);
      fetch();
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (errs) errs.forEach((e) => toast.error(e.message));
      else toast.error(err.response?.data?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this project? All tasks will be removed.")) return;
    try {
      await deleteProject(id);
      toast.success("Project deleted");
      fetch();
    } catch { toast.error("Delete failed"); }
  };

  return (
    <AdminLayout>
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary-900 mb-1">Projects</h1>
          <p className="text-primary-400 text-sm">Create and manage annotation projects</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 shrink-0">
          <Plus size={16} /> New Project
        </button>
      </div>

      {loading ? <PageSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p._id} className="bg-[#e3e7e3] rounded-2xl p-4 shadow-sm hover:bg-[#dce1dc] transition group cursor-pointer border border-[#b9c1b8]"
              onClick={() => navigate(`/admin/projects/${p._id}`)}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-black/5 flex items-center justify-center">
                  <FolderOpen size={18} className="text-black/80" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button className="p-1.5 rounded-lg hover:bg-black/10 text-black/60 hover:text-black"
                    onClick={(e) => { e.stopPropagation(); openEdit(p); }}>
                    <Pencil size={14} />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-red-100 text-black/60 hover:text-red-700"
                    onClick={(e) => { e.stopPropagation(); handleDelete(p._id); }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-black mb-1">{p.name}</h3>
              <p className="text-sm text-black/70 mb-4 line-clamp-2">{p.description || "No description"}</p>
              <div className="flex items-center justify-between text-xs text-black/75">
                <span>{p.tasks?.length ?? 0} tasks</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/projects/${p._id}`);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-primary-700 hover:bg-primary-800 !text-white text-xs font-semibold transition inline-flex items-center gap-1"
                >
                  Open <ChevronRight size={13} />
                </button>
              </div>
            </div>
          ))}
          {!projects.length && (
            <div className="col-span-3 text-center py-20 text-primary-300">
              <FolderOpen size={36} className="mx-auto mb-3 opacity-40" />
              <p>No projects yet. Create one to get started.</p>
            </div>
          )}
        </div>
      )}

      {modal === "form" && (
        <Modal title={editing ? "Edit Project" : "Create Project"} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="label">Project Name *</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input" placeholder="My Annotation Project" required />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="input resize-none" rows={3} placeholder="Optional description…" />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="submit" disabled={saving} className="btn-secondary">
                {saving ? "Saving…" : editing ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </AdminLayout>
  );
}
