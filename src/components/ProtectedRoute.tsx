import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";

// Chặn truy cập các trang nội bộ khi chưa đăng nhập.
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
