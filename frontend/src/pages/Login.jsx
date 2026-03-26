import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login } from "../api/auth.api";
import { Mic2, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { Spinner } from "../components/ui/Spinner";

export default function Login() {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(form);
      loginUser(res.data.data);
      toast.success(`Welcome back, ${res.data.data.user.name}!`);
      navigate(res.data.data.user.role === "admin" ? "/admin" : "/user");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 mb-4">
            <Mic2 size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-primary-900">Bolo</h1>
          <p className="text-primary-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                className="input" placeholder="admin@bolo.com" required />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input name="password" type={showPass ? "text" : "password"}
                  value={form.password} onChange={handleChange}
                  className="input pr-10" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2">
              {loading ? <Spinner size="sm" /> : null}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-4">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
