import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Mic2 } from "lucide-react";
import toast from "react-hot-toast";
import UserLayout from "../../components/layout/UserLayout";
import { getProjectTasks } from "../../api/user.api";
import { PageSpinner } from "../../components/ui/Spinner";

const statusBadge = (s) => {
  if (s === "completed") return <span className="badge-done">Completed</span>;
  if (s === "in-progress") return <span className="badge-progress">In Progress</span>;
  return <span className="badge-pending">Pending</span>;
};

export default function ProjectTasks() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    getProjectTasks(id)
      .then((r) => {
        setProject(r.data.data.project);
        setTasks(r.data.data.tasks || []);
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Failed to load project tasks");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <UserLayout><PageSpinner /></UserLayout>;
  }

  return (
    <UserLayout>
      <Link to="/user" className="flex items-center gap-1.5 text-sm text-black/70 hover:text-black mb-6 transition">
        <ChevronLeft size={16} /> Back to Projects
      </Link>

      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-primary-900 mb-1">{project?.name || "Project"}</h1>
        <p className="text-primary-500 text-sm">{project?.description || "Complete your assigned tasks in this project."}</p>
      </div>

      {tasks.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <Mic2 size={40} className="text-primary-300 mb-4" />
          <p className="text-primary-500 font-medium">No tasks assigned in this project.</p>
          <p className="text-primary-300 text-sm mt-1">Contact your admin if you expected tasks here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasks.map((t) => (
            <div
              key={t._id}
              onClick={() => navigate(`/user/tasks/${t._id}`)}
              className="bg-[#e3e7e3] rounded-2xl p-4 shadow-sm border border-[#b9c1b8] cursor-pointer hover:bg-[#dce1dc] transition group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className="font-mono text-xs text-black/70 bg-black/5 px-2 py-0.5 rounded">
                  {t.taskId}
                </span>
                {statusBadge(t.status)}
              </div>

              <p className="text-base font-semibold text-black mb-1 line-clamp-1">{t.type}</p>
              <p className="text-sm text-black/80 mb-3 line-clamp-2">{t.text}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-black/75">
                  {(t.audio?.publicId || t.audio?.url)
                    ? <span className="text-black font-medium flex items-center gap-1"><Mic2 size={11} /> Audio recorded</span>
                    : <span>Audio pending</span>}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/user/tasks/${t._id}`);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-primary-700 hover:bg-primary-800 !text-white text-xs font-semibold transition"
                >
                  Continue
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </UserLayout>
  );
}