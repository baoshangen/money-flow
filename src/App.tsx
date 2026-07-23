import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { isSupabaseConfigured } from "./lib/supabase";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Accounts from "./pages/Accounts";
import Portfolio from "./pages/Portfolio";
import Compare from "./pages/Compare";
import Budgets from "./pages/Budgets";
import SetupNeeded from "./pages/SetupNeeded";

export default function App() {
  const { loading } = useAuth();

  // Chưa cấu hình Supabase → hướng dẫn thay vì crash.
  if (!isSupabaseConfigured) return <SetupNeeded />;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Đang tải…
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/compare" element={<Compare />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
