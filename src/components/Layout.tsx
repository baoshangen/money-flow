import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const nav = [
  { to: "/", label: "Tổng quan", icon: "📊", end: true },
  { to: "/transactions", label: "Giao dịch", icon: "🧾", end: false },
  { to: "/accounts", label: "Tài khoản & Thẻ", icon: "💳", end: false },
  { to: "/portfolio", label: "Cổ phiếu", icon: "📈", end: false },
];

export default function Layout() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="px-5 py-5 text-xl font-bold text-emerald-600">💰 Money Flow</div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3 text-xs text-slate-500">
          <div className="mb-2 truncate" title={user?.email ?? ""}>
            {user?.email}
          </div>
          <button
            onClick={signOut}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-600 hover:bg-slate-50"
          >
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-10">
        <Outlet />
      </main>
    </div>
  );
}
