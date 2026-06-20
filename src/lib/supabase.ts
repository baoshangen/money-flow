import { createClient } from "@supabase/supabase-js";

// URL + anon key đọc từ biến môi trường (file .env, không commit).
// Anon key AN TOÀN để lộ ở frontend: mọi truy cập đều bị Row Level
// Security trên Postgres chặn theo auth.uid().
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Cờ kiểm tra đã cấu hình chưa. App sẽ hiện màn hình hướng dẫn (thay vì
// trắng/crash) khi thiếu — quan trọng cho người dùng chưa rành setup.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Dùng placeholder hợp lệ để createClient không ném lỗi lúc import khi chưa
// cấu hình; client này không bao giờ được gọi vì App đã chặn ở SetupNeeded.
export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
