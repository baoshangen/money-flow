import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const nav = [
  { to: "/", label: "Tổng quan", icon: "📊", end: true },
  { to: "/transactions", label: "Giao dịch", icon: "🧾", end: false },
  { to: "/budgets", label: "Ngân sách", icon: "🎯", end: false },
  { to: "/accounts", label: "Thẻ", icon: "💳", end: false },
  { to: "/portfolio", label: "Cổ phiếu", icon: "📈", end: false },
];

function Brand() {
  return (
    <div className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
      <span>💰</span>
      <span className="text-slate-800">Money</span>
      <span className="text-brand-500">Flow</span>
    </div>
  );
}

export default function Layout() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen">
      {/* Đốm gradient mềm trang trí nền (teen, không cản thao tác) */}
      <div className="pointer-events-none fixed -left-20 -top-20 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-24 right-0 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl" />

      {/* Sidebar — chỉ hiện trên desktop */}
      <aside className="hidden w-60 flex-col border-r border-white/50 bg-white/40 backdrop-blur-md lg:flex">
        <div className="px-5 py-5">
          <Brand />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-gradient-to-r from-brand-400 to-brand-500 text-white shadow"
                    : "text-slate-600 hover:bg-white/60"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/50 p-3 text-xs text-slate-500">
          <div className="mb-2 truncate" title={user?.email ?? ""}>
            {user?.email}
          </div>
          <button
            onClick={signOut}
            className="w-full rounded-full border border-white/70 bg-white/50 px-3 py-2 text-slate-600 hover:bg-white/80"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Header mobile */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/50 bg-white/40 px-4 py-3 backdrop-blur-md lg:hidden">
          <Brand />
          <button
            onClick={signOut}
            className="rounded-full border border-white/70 bg-white/50 px-3 py-1.5 text-xs text-slate-600"
          >
            Đăng xuất
          </button>
        </header>

        {/* Nội dung — chừa khoảng dưới cho bottom nav trên mobile */}
        <main className="flex-1 overflow-y-auto px-4 py-5 pb-24 lg:px-10 lg:py-6 lg:pb-6">
          <Outlet />
        </main>

        {/* Bottom nav — chỉ hiện trên mobile */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-white/50 bg-white/80 backdrop-blur-xl lg:hidden">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
                  isActive ? "text-brand-500" : "text-slate-400"
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
