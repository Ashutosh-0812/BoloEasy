import { useEffect, useRef, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/ui/Modal";
import DataTable from "datatables.net-dt";
import "datatables.net-dt/css/dataTables.dataTables.css";
import {
  getAllUsers,
  verifyUser,
  updateUser,
  getAllProjects,
  getAssignedProjectIdsByUser,
  assignProjectToUser,
  unassignProjectFromUser,
} from "../../api/admin.api";
import { CheckCircle, Clock, ShieldCheck, FolderUp, Pencil } from "lucide-react";
import { PageSpinner } from "../../components/ui/Spinner";
import toast from "react-hot-toast";

export default function AdminUsers() {
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== "undefined" ? window.innerWidth >= 640 : false));
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [verifying, setVerifying] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [unassigningProjectId, setUnassigningProjectId] = useState(null);
  const [assignModalUser, setAssignModalUser] = useState(null);
  const [editModalUser, setEditModalUser] = useState(null);
  const [savingUserEdit, setSavingUserEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "user", isVerified: false });
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [pendingProjectId, setPendingProjectId] = useState("");
  const [assignedProjectIds, setAssignedProjectIds] = useState([]);
  const [loadingAssignedProjects, setLoadingAssignedProjects] = useState(false);
  const desktopTableRef = useRef(null);
  const dataTableInstanceRef = useRef(null);

  const fetchUsers = () => {
    setLoading(true);
    getAllUsers()
      .then((r) => setUsers(r.data.data))
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const tableElement = desktopTableRef.current;

    if (!isDesktop) {
      if (dataTableInstanceRef.current) {
        dataTableInstanceRef.current.destroy();
        dataTableInstanceRef.current = null;
      }
      return undefined;
    }

    if (loading || !tableElement) return undefined;

    if (dataTableInstanceRef.current) {
      dataTableInstanceRef.current.destroy();
      dataTableInstanceRef.current = null;
    }

    dataTableInstanceRef.current = new DataTable(tableElement, {
      pageLength: 10,
      lengthMenu: [10, 25, 50, 100],
      order: [[0, "asc"]],
      autoWidth: false,
      responsive: false,
      language: {
        search: "Search:",
        lengthMenu: "_MENU_ entries per page",
        paginate: {
          previous: "Prev",
          next: "Next",
        },
        emptyTable: "No users available",
      },
      columnDefs: [
        { targets: -1, orderable: false, searchable: false },
      ],
      dom: '<"dt-toolbar"lf>rt<"dt-footer"ip>',
    });

    return () => {
      if (dataTableInstanceRef.current) {
        dataTableInstanceRef.current.destroy();
        dataTableInstanceRef.current = null;
      }
    };
  }, [isDesktop, loading, users, verifying, savingUserEdit]);

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

  const openEditModal = (user) => {
    setEditModalUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "user",
      isVerified: Boolean(user.isVerified),
    });
  };

  const closeEditModal = () => {
    setEditModalUser(null);
    setSavingUserEdit(false);
    setEditForm({ name: "", email: "", role: "user", isVerified: false });
  };

  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    if (!editModalUser?._id) return;

    const payload = {
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      role: editForm.role,
      isVerified: Boolean(editForm.isVerified),
    };

    if (!payload.name || !payload.email) {
      toast.error("Name and email are required");
      return;
    }

    setSavingUserEdit(true);
    try {
      await updateUser(editModalUser._id, payload);
      toast.success("User updated successfully");
      closeEditModal();
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update user");
    } finally {
      setSavingUserEdit(false);
    }
  };

  const openAssignModal = async (user) => {
    setAssignModalUser(user);
    setSelectedProjectIds([]);
    setPendingProjectId("");
    setAssignedProjectIds([]);

    const requests = [];
    if (!projects.length) {
      requests.push(fetchProjects());
    }

    setLoadingAssignedProjects(true);
    requests.push(
      getAssignedProjectIdsByUser(user._id)
        .then((res) => setAssignedProjectIds(res.data.data || []))
        .catch(() => toast.error("Failed to load assigned projects"))
        .finally(() => setLoadingAssignedProjects(false))
    );

    await Promise.all(requests);
  };

  const closeAssignModal = () => {
    setAssignModalUser(null);
    setSelectedProjectIds([]);
    setPendingProjectId("");
    setAssignedProjectIds([]);
    setLoadingAssignedProjects(false);
    setUnassigningProjectId(null);
  };

  const selectableProjects = projects.filter(
    (p) => !assignedProjectIds.includes(p._id) && !selectedProjectIds.includes(p._id)
  );

  const assignedProjects = projects.filter((p) => assignedProjectIds.includes(p._id));

  const addPendingProject = () => {
    if (!pendingProjectId) return;
    setSelectedProjectIds((prev) => (prev.includes(pendingProjectId) ? prev : [...prev, pendingProjectId]));
    setPendingProjectId("");
  };

  const removeSelectedProject = (projectId) => {
    setSelectedProjectIds((prev) => prev.filter((id) => id !== projectId));
  };

  const handleUnassignProject = async (projectId) => {
    if (!assignModalUser?._id) return;

    setUnassigningProjectId(projectId);
    try {
      await unassignProjectFromUser(projectId, assignModalUser._id);
      setAssignedProjectIds((prev) => prev.filter((id) => id !== projectId));

      const project = projects.find((p) => p._id === projectId);
      toast.success(`${project?.name || "Project"} unassigned`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to unassign project");
    } finally {
      setUnassigningProjectId(null);
    }
  };

  const handleProjectPickerKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPendingProject();
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignModalUser?._id || selectedProjectIds.length === 0) {
      toast.error("Please select at least one project");
      return;
    }

    setAssigning(true);
    try {
      const results = await Promise.allSettled(
        selectedProjectIds.map((projectId) => assignProjectToUser(projectId, assignModalUser._id))
      );

      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failureCount = results.length - successCount;

      if (successCount > 0 && failureCount === 0) {
        toast.success(`${successCount} project(s) assigned to ${assignModalUser.name}`);
      } else if (successCount > 0 && failureCount > 0) {
        toast.success(`${successCount} project(s) assigned`);
        toast.error(`${failureCount} project(s) failed to assign`);
      } else {
        const firstError = results.find((r) => r.status === "rejected");
        const message = firstError?.reason?.response?.data?.message || "Project assignment failed";
        toast.error(message);
        return;
      }

      closeAssignModal();
      fetchUsers();
    } finally {
      setAssigning(false);
    }
  };

  const renderActionButton = (u) => {
    const canVerify = u.role === "user" && !u.isVerified;
    const canAssign = u.role === "user" && u.isVerified;

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => openEditModal(u)}
          className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs"
        >
          <Pencil size={13} /> Edit
        </button>

        {canVerify ? (
          <button
            onClick={() => handleVerify(u._id)}
            disabled={verifying === u._id}
            className="btn-primary flex items-center gap-1.5 py-1.5 px-3 text-xs"
          >
            <ShieldCheck size={13} />
            {verifying === u._id ? "Verifying..." : "Verify"}
          </button>
        ) : null}

        {canAssign ? (
          <button
            onClick={() => openAssignModal(u)}
            className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs"
          >
            <FolderUp size={13} /> Assign
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <AdminLayout>
      <h1 className="text-xl sm:text-2xl font-bold text-primary-900 mb-1">Users</h1>
      <p className="text-primary-400 text-sm mb-6 sm:mb-8">Manage and verify registered users</p>

      {loading ? <PageSpinner /> : (
        <div className="admin-datatable card p-0 overflow-hidden">
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

          <div className="hidden sm:block">
            <table ref={desktopTableRef} className="w-full text-sm display">
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
                    <td className="px-5 py-4">{renderActionButton(u)}</td>
                  </tr>
                ))}
                {!users.length && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editModalUser && (
        <Modal title="Edit User" onClose={closeEditModal} size="sm">
          <form onSubmit={handleSaveUserEdit} className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                className="input"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">Role</label>
              <select
                className="input"
                value={editForm.role}
                onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={editForm.isVerified ? "verified" : "pending"}
                onChange={(e) => setEditForm((prev) => ({ ...prev, isVerified: e.target.value === "verified" }))}
              >
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeEditModal} className="btn-secondary" disabled={savingUserEdit}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={savingUserEdit}>
                {savingUserEdit ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {assignModalUser && (
        <Modal title="Assign Project" onClose={closeAssignModal} size="sm">
          <form onSubmit={handleAssign} className="space-y-4">
            <div>
              <p className="text-sm text-primary-500 mb-2">
                Assign a project to <span className="font-semibold text-primary-900">{assignModalUser.name}</span>
              </p>
              <label className="label">Projects</label>
              <div className="flex gap-2">
                <select
                  value={pendingProjectId}
                  onChange={(e) => setPendingProjectId(e.target.value)}
                  onKeyDown={handleProjectPickerKeyDown}
                  className="input"
                  disabled={loadingProjects || loadingAssignedProjects || assigning || selectableProjects.length === 0}
                >
                  <option value="">Select project</option>
                  {projects.map((p) => {
                    const isAssigned = assignedProjectIds.includes(p._id);
                    const isSelected = selectedProjectIds.includes(p._id);
                    const isDisabled = isAssigned || isSelected;

                    return (
                      <option key={p._id} value={p._id} disabled={isDisabled}>
                        {p.name}
                        {isAssigned ? " (Already assigned)" : ""}
                        {isSelected ? " (Selected)" : ""}
                      </option>
                    );
                  })}
                </select>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={addPendingProject}
                  disabled={!pendingProjectId || loadingProjects || loadingAssignedProjects || assigning}
                >
                  Add
                </button>
              </div>
              <p className="text-xs text-primary-400 mt-1">Select a project and press Enter to add it as a tag.</p>

              {!loadingProjects && !loadingAssignedProjects && projects.length > 0 && selectableProjects.length === 0 && (
                <p className="text-xs text-primary-400 mt-1">All projects are already assigned to this user.</p>
              )}

              <div className="mt-2 flex flex-wrap gap-2">
                {selectedProjectIds.map((projectId) => {
                  const project = projects.find((p) => p._id === projectId);
                  if (!project) return null;
                  return (
                    <span
                      key={projectId}
                      className="inline-flex items-center gap-1 rounded-full bg-primary-100 text-primary-700 px-2.5 py-1 text-xs"
                    >
                      {project.name}
                      <button
                        type="button"
                        className="font-semibold"
                        onClick={() => removeSelectedProject(projectId)}
                        disabled={assigning}
                        aria-label={`Remove ${project.name}`}
                      >
                        x
                      </button>
                    </span>
                  );
                })}

                {assignedProjects.map((project) => (
                  <span
                    key={project._id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary-100 text-primary-700 px-2.5 py-1 text-xs"
                    title="Already assigned project"
                  >
                    {project.name}
                    <button
                      type="button"
                      className="font-semibold"
                      onClick={() => handleUnassignProject(project._id)}
                      disabled={assigning || unassigningProjectId === project._id}
                      aria-label={`Remove ${project.name}`}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>

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
                disabled={assigning || loadingProjects || loadingAssignedProjects || projects.length === 0}
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
