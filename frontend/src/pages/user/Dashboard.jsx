import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "../../components/layout/UserLayout";
import { getMyProjects } from "../../api/user.api";
import { FolderOpen, Mic2 } from "lucide-react";
import { PageSpinner } from "../../components/ui/Spinner";
import toast from "react-hot-toast";

export default function UserDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getMyProjects()
      .then((r) => setProjects(r.data.data))
      .catch(() => toast.error("Failed to load projects"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <UserLayout>
      <h1 className="text-xl sm:text-2xl font-bold text-primary-900 mb-1">My Projects</h1>
      <p className="text-primary-400 text-sm mb-6 sm:mb-8">Open a project to view and complete your assigned tasks</p>

      {loading ? <PageSpinner /> : (
        <>
          {projects.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-20 text-center">
              <FolderOpen size={40} className="text-primary-300 mb-4" />
              <p className="text-primary-500 font-medium">No projects assigned yet.</p>
              <p className="text-primary-300 text-sm mt-1">Check back later or contact your admin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {projects.map((p) => {
                const total = p.stats?.total || 0;
                const completed = p.stats?.completed || 0;
                const pct = total ? Math.round((completed / total) * 100) : 0;

                return (
                  <div key={p._id}
                    onClick={() => navigate(`/user/projects/${p._id}`)}
                    className="bg-[#e3e7e3] rounded-2xl p-4 shadow-sm border border-[#b9c1b8] cursor-pointer hover:bg-[#dce1dc] transition group">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-black/5 flex items-center justify-center">
                        <FolderOpen size={16} className="text-black/80" />
                      </div>
                      <p className="text-base font-semibold text-black line-clamp-1">{p.name}</p>
                    </div>
                    <p className="text-sm text-black/75 mb-3 line-clamp-2">{p.description || "No description"}</p>
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-black/70 mb-1">
                        <span>{completed}/{total} completed</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-black/10 overflow-hidden">
                        <div className="h-full bg-primary-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-black/75">
                        <Mic2 size={11} />
                        <span>{total} task{total === 1 ? "" : "s"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/user/projects/${p._id}`);
                        }}
                        className="px-4 py-1.5 rounded-xl bg-primary-700 hover:bg-primary-800 !text-white text-xs font-semibold transition"
                      >
                        Start Recording
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </UserLayout>
  );
}
