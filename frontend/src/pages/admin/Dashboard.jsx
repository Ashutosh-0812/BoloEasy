import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import StatCard from "../../components/ui/StatCard";
import { getDashboard } from "../../api/admin.api";
import { Users, FolderOpen, ClipboardList, CheckCircle, Clock, Loader } from "lucide-react";
import { PageSpinner } from "../../components/ui/Spinner";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then((r) => setStats(r.data.data))
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">Dashboard</h1>
      <p className="text-slate-500 text-sm mb-6 sm:mb-8">Overview of your Bolo platform</p>

      {loading ? <PageSpinner /> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
            <StatCard label="Total Users" value={stats?.users?.total} icon={Users} color="primary"
              sub={`${stats?.users?.pending} pending verification`} />
            <StatCard label="Projects" value={stats?.projects?.total} icon={FolderOpen} color="blue" />
            <StatCard label="Total Tasks" value={stats?.tasks?.total} icon={ClipboardList} color="amber" />
            <StatCard label="Completed" value={stats?.tasks?.completed} icon={CheckCircle} color="emerald" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Task breakdown */}
            <div className="card">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Task Status</h2>
              {[
                { label: "Pending", val: stats?.tasks?.pending, color: "bg-amber-500" },
                { label: "In Progress", val: stats?.tasks?.inProgress, color: "bg-blue-500" },
                { label: "Completed", val: stats?.tasks?.completed, color: "bg-emerald-500" },
              ].map(({ label, val, color }) => {
                const pct = stats?.tasks?.total ? Math.round((val / stats.tasks.total) * 100) : 0;
                return (
                  <div key={label} className="mb-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{label}</span><span>{val} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-surface rounded-full">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* User breakdown */}
            <div className="card">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Users</h2>
              <div className="space-y-3">
                {[
                  { label: "Verified", value: stats?.users?.verified, color: "text-emerald-400" },
                  { label: "Pending", value: stats?.users?.pending, color: "text-amber-400" },
                  { label: "Total", value: stats?.users?.total, color: "text-white" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
                    <span className="text-sm text-slate-400">{label}</span>
                    <span className={`font-bold text-lg ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
