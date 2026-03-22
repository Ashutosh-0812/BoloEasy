import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import StatCard from "../../components/ui/StatCard";
import { getDashboard } from "../../api/admin.api";
import { Users, FolderOpen, ClipboardList, ShieldCheck } from "lucide-react";
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
      <h1 className="text-xl sm:text-2xl font-bold text-primary-900 mb-1">Dashboard</h1>
      <p className="text-primary-400 text-sm mb-6 sm:mb-8">Overview of your Bolo platform</p>

      {loading ? <PageSpinner /> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
            <StatCard label="Total Users" value={stats?.users?.total} icon={Users} color="primary"
              sub={`${stats?.users?.pending} pending verification`} />
            <StatCard label="Projects" value={stats?.projects?.total} icon={FolderOpen} color="blue" />
            <StatCard label="Total Tasks" value={stats?.tasks?.total} icon={ClipboardList} color="amber" />
            <StatCard label="Verified Users" value={stats?.users?.verified} icon={ShieldCheck} color="emerald" />
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* User breakdown */}
            <div className="card">
              <h2 className="text-sm font-semibold text-primary-500 uppercase tracking-wide mb-4">Users</h2>
              <div className="space-y-3">
                {[
                  { label: "Verified", value: stats?.users?.verified, color: "text-emerald-500" },
                  { label: "Pending", value: stats?.users?.pending, color: "text-amber-500" },
                  { label: "Total", value: stats?.users?.total, color: "text-primary-900" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-primary-100 last:border-0">
                    <span className="text-sm text-primary-500">{label}</span>
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
