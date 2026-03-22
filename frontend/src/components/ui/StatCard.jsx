export default function StatCard({ label, value, icon: Icon, color = "primary", sub }) {
  const colors = {
    primary: "bg-primary-100 text-primary-900",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-lime-100 text-lime-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <div className="bg-[#e3e7e3] rounded-2xl p-4 shadow-sm border border-[#b9c1b8] flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs text-black/70 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-black mt-0.5">{value ?? "—"}</p>
        {sub && <p className="text-xs text-black/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
