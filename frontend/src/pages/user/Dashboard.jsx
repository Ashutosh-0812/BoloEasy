import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "../../components/layout/UserLayout";
import { getMyTasks } from "../../api/user.api";
import { ClipboardList, ChevronRight, Mic2 } from "lucide-react";
import { PageSpinner } from "../../components/ui/Spinner";
import toast from "react-hot-toast";

const statusBadge = (s) => {
  if (s === "completed") return <span className="badge-done">Completed</span>;
  if (s === "in-progress") return <span className="badge-progress">In Progress</span>;
  return <span className="badge-pending">Pending</span>;
};

export default function UserDashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getMyTasks()
      .then((r) => setTasks(r.data.data))
      .catch(() => toast.error("Failed to load tasks"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <UserLayout>
      <h1 className="text-xl sm:text-2xl font-bold text-primary-900 mb-1">My Tasks</h1>
      <p className="text-primary-400 text-sm mb-6 sm:mb-8">Complete your assigned recording tasks</p>

      {loading ? <PageSpinner /> : (
        <>
          {tasks.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-20 text-center">
              <Mic2 size={40} className="text-primary-300 mb-4" />
              <p className="text-primary-500 font-medium">No tasks assigned yet.</p>
              <p className="text-primary-300 text-sm mt-1">Check back later or contact your admin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {tasks.map((t) => (
                <div key={t._id}
                  onClick={() => navigate(`/user/tasks/${t._id}`)}
                  className="bg-primary-600 rounded-xl p-6 shadow-md border border-primary-500 cursor-pointer hover:bg-primary-700 transition group">
                  <div className="flex items-start justify-between mb-3">
                    <span className="font-mono text-xs text-white/70 bg-white/15 px-2 py-0.5 rounded">
                      {t.taskId}
                    </span>
                    {statusBadge(t.status)}
                  </div>
                  <p className="text-xs text-white/50 uppercase tracking-wide font-semibold mb-2">{t.type}</p>
                  <p className="text-sm text-white/80 mb-3 line-clamp-3">{t.text}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/50">
                      {(t.audio?.publicId || t.audio?.url)
                        ? <span className="text-emerald-300 font-medium flex items-center gap-1">
                            <Mic2 size={11} /> Audio recorded
                          </span>
                        : <span>No audio yet</span>}
                    </div>
                    <span className="text-white/60 group-hover:text-white transition">
                      <ChevronRight size={16} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </UserLayout>
  );
}
