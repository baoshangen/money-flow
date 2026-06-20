import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { session, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const fn = mode === "signin" ? signIn : signUp;
    const { error } = await fn(email, password);
    setBusy(false);
    if (error) {
      setError(error);
    } else if (mode === "signup") {
      setInfo("Đăng ký thành công! Kiểm tra email để xác nhận (nếu được bật), rồi đăng nhập.");
      setMode("signin");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
        <h1 className="mb-1 text-2xl font-bold text-emerald-600">💰 Money Flow</h1>
        <p className="mb-6 text-sm text-slate-500">
          {mode === "signin" ? "Đăng nhập để quản lý tài chính" : "Tạo tài khoản mới"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Mật khẩu (tối thiểu 6 ký tự)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}
          {info && <p className="text-sm text-emerald-600">{info}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? "Đang xử lý…" : mode === "signin" ? "Đăng nhập" : "Đăng ký"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setInfo(null);
          }}
          className="mt-4 w-full text-center text-sm text-slate-500 hover:text-emerald-600"
        >
          {mode === "signin" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
        </button>
      </div>
    </div>
  );
}
