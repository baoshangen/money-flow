import { createClient } from "@supabase/supabase-js";

// URL + anon key đọc từ biến môi trường (file .env, không commit).
// Anon key AN TOÀN để lộ ở frontend: mọi truy cập đều bị Row Level
// Security trên Postgres chặn theo auth.uid().
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Báo lỗi rõ ràng khi quên cấu hình .env, tránh lỗi mơ hồ lúc runtime.
  throw new Error(
    "Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY. " +
      "Hãy sao chép .env.example thành .env và điền giá trị từ Supabase Dashboard.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
