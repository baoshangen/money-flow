import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Mascot, Sparkles } from "../components/Decor";

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

  const inputCls =
    "w-full rounded-xl border border-white/70 bg-white/70 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white/70 p-8 shadow-[0_8px_40px_rgba(120,80,50,0.12)] ring-1 ring-white/60 backdrop-blur-xl">
        <Sparkles className="absolute inset-0" />
        <div className="relative mb-2 flex justify-center">
          <div className="rounded-full bg-gradient-to-br from-brand-100 to-brand-200 p-2 ring-4 ring-white/70">
            <Mascot name="happy" className="h-24 w-24" alt="Mascot Money Flow" />
          </div>
        </div>
        <div className="mb-1 flex items-center justify-center gap-2 font-display text-2xl font-bold">
          <span>💰</span>
          <span className="text-slate-800">Money</span>
          <span className="text-brand-500">Flow</span>
        </div>
        <p className="relative mb-6 text-center text-sm text-slate-500">
          {mode === "signin" ? "Đăng nhập để quản lý tài chính" : "Tạo tài khoản mới"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Mật khẩu (tối thiểu 6 ký tự)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />

          {error && <p className="text-sm text-red-500">{error}</p>}
          {info && <p className="text-sm text-brand-600">{info}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-gradient-to-r from-brand-400 to-brand-500 px-3 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/20 transition hover:from-brand-500 hover:to-brand-600 disabled:opacity-60"
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
          className="mt-4 w-full text-center text-sm text-slate-500 hover:text-brand-500"
        >
          {mode === "signin" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
        </button>
      </div>
    </div>
  );
}
