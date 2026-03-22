import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/ui/Modal";
import {
  getAllUsers,
  verifyUser,
  getAllProjects,
  assignProjectToUser,
} from "../../api/admin.api";
import { CheckCircle, Clock, ShieldCheck, FolderUp } from "lucide-react";
import { PageSpinner } from "../../components/ui/Spinner";
import toast from "react-hot-toast";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [verifying, setVerifying] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [assignModalUser, setAssignModalUser] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const fetchUsers = () => {
    setLoading(true);
    getAllUsers()
      .then((r) => setUsers(r.data.data))
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await getAllProjects();
      setProjects(res.data.data || []);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleVerify = async (id) => {
    setVerifying(id);
    try {
      await verifyUser(id);
      toast.success("User verified!");
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed");
    } finally {
      setVerifying(null);
    }
  };

  const openAssignModal = async (user) => {
    setAssignModalUser(user);
    setSelectedProjectId("");
    if (!projects.length) {
      await fetchProjects();
    }
  };

  const closeAssignModal = () => {
    setAssignModalUser(null);
    setSelectedProjectId("");
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignModalUser?._id || !selectedProjectId) {
      toast.error("Please select a project");
      return;
    }

    setAssigning(true);
    try {
      await assignProjectToUser(selectedProjectId, assignModalUser._id);
      toast.success(`Project assigned to ${assignModalUser.name}`);
      closeAssignModal();
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Project assignment failed");
    } finally {
      setAssigning(false);
    }
  };

  const renderActionButton = (u) => {
    if (u.role !== "user") return null;

    if (!u.isVerified) {
      return (
        <button onClick={() => handleVerify(u._id)} disabled={verifying === u._id}
          className="btn-primary flex items-center gap-1.5 py-1.5 px-3 text-xs">
          <ShieldCheck size={13} />
          {verifying === u._id ? "Verifying…" : "Verify"}
        </button>
      );
    }

    return (
      <button
        onClick={() => openAssignModal(u)}
        className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs"
      >
        <FolderUp size={13} /> Assign
      </button>
    );
  };

  return (
    <AdminLayout>
      <h1 className="text-xl sm:text-2xl font-bold text-primary-900 mb-1">Users</h1>
      <p className="text-primary-400 text-sm mb-6 sm:mb-8">Manage and verify registered users</p>

      {loading ? <PageSpinner /> : (
        <div className="card p-0 overflow-hidden">
          {/* Mobile card list */}
          <div className="sm:hidden divide-y divide-surface-border">
            {users.map((u) => (
              <div key={u._id} className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-primary-900 truncate">{u.name}</p>
                    <p className="text-xs text-primary-400 truncate">{u.email}</p>
                  </div>
                  <span className={u.role === "admin" ? "badge-admin shrink-0" : "badge-user shrink-0"}>{u.role}</span>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {u.isVerified
                      ? <span className="badge-done flex items-center gap-1"><CheckCircle size={12} /> Verified</span>
                      : <span className="badge-pending flex items-center gap-1"><Clock size={12} /> Pending</span>}
                    <span className="text-xs text-primary-400">{new Date(u.createdAt).toLocaleDateString()}</span>
                  </div>
                  {renderActionButton(u)}
                </div>
              </div>
            ))}
            {!users.length && (
              <div className="px-5 py-10 text-center text-slate-500">No users found.</div>
            )}
          </div>

          {/* Desktop table */}
          <table className="hidden sm:table w-full text-sm">
            <thead>
              <tr className="border-b border-primary-100 bg-primary-50/30">
                {["Name", "Email", "Role", "Status", "Joined", "Action"].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-primary-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b border-primary-100 hover:bg-primary-50/40 transition">
                  <td className="px-5 py-4 font-medium text-primary-900">{u.name}</td>
                  <td className="px-5 py-4 text-primary-500">{u.email}</td>
                  <td className="px-5 py-4">
                    <span className={u.role === "admin" ? "badge-admin" : "badge-user"}>{u.role}</span>
                  </td>
                  <td className="px-5 py-4">
                    {u.isVerified
                      ? <span className="badge-done flex items-center gap-1 w-fit"><CheckCircle size={12} /> Verified</span>
                      : <span className="badge-pending flex items-center gap-1 w-fit"><Clock size={12} /> Pending</span>}
                  </td>
                  <td className="px-5 py-4 text-primary-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4">
                    {renderActionButton(u)}
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {assignModalUser && (
        <Modal title="Assign Project" onClose={closeAssignModal} size="sm">
          <form onSubmit={handleAssign} className="space-y-4">
            <div>
              <p className="text-sm text-primary-500 mb-2">
                Assign a project to <span className="font-semibold text-primary-900">{assignModalUser.name}</span>
              </p>
              <label className="label">Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="input"
                disabled={loadingProjects || assigning}
                required
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
              {!loadingProjects && projects.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No projects found. Create a project first.</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeAssignModal} className="btn-secondary" disabled={assigning}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={assigning || loadingProjects || projects.length === 0}
              >
                {assigning ? "Assigning..." : "Assign"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </AdminLayout>
  );
}
