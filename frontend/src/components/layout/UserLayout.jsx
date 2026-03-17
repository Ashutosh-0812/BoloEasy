import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LayoutDashboard, LogOut, Mic2, Menu } from "lucide-react";

const NAV = [
  { to: "/user", label: "My Tasks", icon: LayoutDashboard, end: true },
];

function SidebarContent({ user, onLogout, onNavClick }) {
  return (
    <>
      <div className="p-6 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <Mic2 className="text-primary-500" size={22} />
          <span className="font-bold text-lg text-white tracking-tight">Bolo</span>
        </div>
        <span className="text-xs text-emerald-400 font-semibold uppercase tracking-widest mt-0.5 block">User Panel</span>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            onClick={onNavClick}
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
            <Icon size={17} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-surface-border">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={onLogout} className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut size={17} /> Logout
        </button>
      </div>
    </>
  );
}

export default function UserLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-surface-card border-r border-surface-border flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0 md:flex
      `}>
        <SidebarContent user={user} onLogout={handleLogout} onNavClick={() => setSidebarOpen(false)} />
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-surface scrollbar-hidden flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border bg-surface-card md:hidden shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white transition">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <Mic2 className="text-primary-500" size={18} />
            <span className="font-bold text-white tracking-tight">Bolo</span>
          </div>
          <span className="text-xs text-emerald-400 font-semibold uppercase tracking-widest ml-1">User</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
