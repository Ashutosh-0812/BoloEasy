export default function StatCard({ label, value, icon: Icon, color = "primary", sub }) {
  const colors = {
    primary: "bg-white/15 text-white",
    emerald: "bg-white/15 text-emerald-300",
    amber: "bg-white/15 text-amber-300",
    blue: "bg-white/15 text-blue-300",
    red: "bg-white/15 text-red-300",
  };
  return (
    <div className="bg-primary-600 rounded-xl p-6 shadow-md border border-primary-500 flex items-center gap-5">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs text-white/60 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value ?? "—"}</p>
        {sub && <p className="text-xs text-white/50 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
