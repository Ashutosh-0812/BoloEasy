import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LayoutDashboard, LogOut, Mic2 } from "lucide-react";

const NAV = [
  { to: "/user", label: "My Tasks", icon: LayoutDashboard, end: true },
];

export default function UserLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-surface-card border-r border-surface-border flex flex-col">
        <div className="p-6 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Mic2 className="text-primary-500" size={22} />
            <span className="font-bold text-lg text-white tracking-tight">BoloEasy</span>
          </div>
          <span className="text-xs text-emerald-400 font-semibold uppercase tracking-widest mt-0.5 block">User Panel</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
              <Icon size={17} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-surface-border">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <LogOut size={17} /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-surface scrollbar-hidden">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
