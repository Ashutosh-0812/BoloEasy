import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminProjects from "./pages/admin/Projects";
import ProjectDetail from "./pages/admin/ProjectDetail";
import UserDashboard from "./pages/user/Dashboard";
import TaskDetail from "./pages/user/TaskDetail";

// ─── Protected Route Guards ───────────────────────────────────────────────────
function RequireAuth({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/user"} replace />;
  }
  return children;
}

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "admin" ? "/admin" : "/user"} replace />;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "#12340c", color: "#f3f8f1", border: "1px solid #2f7a22" },
            success: { iconTheme: { primary: "#2f7a22", secondary: "#f3f8f1" } },
            error: { iconTheme: { primary: "#ef4444", secondary: "#f1f5f9" } },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Admin */}
          <Route path="/admin" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
          <Route path="/admin/users" element={<RequireAuth role="admin"><AdminUsers /></RequireAuth>} />
          <Route path="/admin/projects" element={<RequireAuth role="admin"><AdminProjects /></RequireAuth>} />
          <Route path="/admin/projects/:id" element={<RequireAuth role="admin"><ProjectDetail /></RequireAuth>} />

          {/* User */}
          <Route path="/user" element={<RequireAuth role="user"><UserDashboard /></RequireAuth>} />
          <Route path="/user/tasks/:id" element={<RequireAuth role="user"><TaskDetail /></RequireAuth>} />

          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
