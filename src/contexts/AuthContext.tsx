import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  // Nhớ user hiện tại để phát hiện ĐỔI user (không phải chỉ refresh token).
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    // Lấy session hiện có (nếu đã đăng nhập trước đó), rồi lắng nghe thay đổi.
    supabase.auth.getSession().then(({ data }) => {
      prevUserId.current = data.session?.user?.id ?? null;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      const newUserId = s?.user?.id ?? null;
      // BẢO MẬT: user đổi (đăng xuất hoặc đăng nhập tài khoản khác cùng trình
      // duyệt) → xoá SẠCH cache React Query, tránh hiển thị dữ liệu người trước.
      // Token refresh (cùng user) thì KHÔNG xoá để không refetch thừa.
      if (newUserId !== prevUserId.current) {
        queryClient.clear();
        prevUserId.current = newUserId;
      }
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const signIn: AuthState["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp: AuthState["signUp"] = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải dùng bên trong <AuthProvider>");
  return ctx;
}
