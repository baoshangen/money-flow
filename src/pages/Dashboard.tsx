import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  useAccounts,
  useHoldings,
  useTransactions,
  useCategories,
  useBudgets,
  useStockPrices,
} from "../lib/queries";
import { summarize, financialHealth } from "../lib/insights";
import { formatMoney, formatDate } from "../lib/format";
import { Card } from "../components/ui";
import { Mascot, SpeedLines, Sparkles, Sticker } from "../components/Decor";
import { useAuth } from "../contexts/AuthContext";
import ReceiptUpload from "../features/receipt-upload/ReceiptUpload";

// Dải màu cam/amber theo gu peach của app.
const PIE_COLORS = ["#f97316", "#fb923c", "#fbbf24", "#f59e0b", "#fdba74", "#fcd34d", "#fb7185"];

function monthKey(iso: string) {
  return iso.slice(0, 7); // YYYY-MM
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: accounts = [] } = useAccounts();
  const { data: holdings = [] } = useHoldings();
  const { data: txs = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { data: budgets = [] } = useBudgets();
  const { data: prices = {} } = useStockPrices(holdings.map((h) => h.ticker));

  const cashTotal = accounts.reduce((s, a) => s + Number(a.current_balance), 0);
  // Giá thị trường thật (fallback giá vốn khi chưa có giá).
  const investTotal = holdings.reduce((s, h) => {
    const px = prices[h.ticker.toUpperCase()]?.price ?? Number(h.avg_cost);
    return s + Number(h.quantity) * px;
  }, 0);
  const netWorth = cashTotal + investTotal;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTxs = txs.filter((t) => monthKey(t.occurred_at) === thisMonth);
  const summary = summarize(monthTxs);
  const health = financialHealth(summary);

  // Chi tiêu tháng này theo danh mục (cho biểu đồ tròn).
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthTxs) {
      if (t.direction !== "out") continue;
      const name = categories.find((c) => c.id === t.category_id)?.name ?? "Khác";
      map.set(name, (map.get(name) ?? 0) + Number(t.amount));
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [monthTxs, categories]);

  // Thu/chi 6 tháng gần nhất (cho biểu đồ cột).
  const trend = useMemo(() => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }
    return months.map((m) => {
      const s = summarize(txs.filter((t) => monthKey(t.occurred_at) === m));
      return { month: m.slice(5), Thu: s.income, Chi: s.expense };
    });
  }, [txs]);

  // Cảnh báo ngân sách: danh mục đã vượt hoặc sắp vượt (>=80%) tháng này.
  const budgetAlerts = useMemo(() => {
    const spent = new Map<string, number>();
    for (const t of monthTxs) {
      if (t.direction !== "out" || !t.category_id) continue;
      spent.set(t.category_id, (spent.get(t.category_id) ?? 0) + Number(t.amount));
    }
    return budgets
      .map((b) => {
        const used = spent.get(b.category_id) ?? 0;
        const cat = categories.find((c) => c.id === b.category_id);
        const ratio = Number(b.monthly_limit) > 0 ? used / Number(b.monthly_limit) : 0;
        return { name: cat?.name ?? "—", icon: cat?.icon ?? "", used, limit: Number(b.monthly_limit), ratio };
      })
      .filter((x) => x.ratio >= 0.8)
      .sort((a, b) => b.ratio - a.ratio);
  }, [budgets, monthTxs, categories]);

  const recent = txs.slice(0, 6);
  const healthColor =
    health.tone === "good" ? "text-emerald-600" : health.tone === "ok" ? "text-amber-500" : "text-red-500";

  return (
    <>
      {/* Banner hero gradient cam — điểm nhấn đầu trang như ảnh tham khảo */}
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 p-6 text-white shadow-lg shadow-brand-500/25">
        {/* Lớp vân chấm mờ trang trí */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-white/80">
              Xin chào, {user?.email?.split("@")[0] ?? "bạn"} 👋
            </div>
            <div className="mt-1 text-xs uppercase tracking-wide text-white/70">Tài sản ròng</div>
            <div className="font-display text-3xl font-bold sm:text-4xl">{formatMoney(netWorth)}</div>
            <div className="mt-2">
              <Sticker>💰 Tiết kiệm {Math.round(health.savingsRate * 100)}%</Sticker>
            </div>
            <div className="mt-3">
              <ReceiptUpload label="📷 Up ảnh hóa đơn" variant="white" />
            </div>
          </div>

          {/* Mascot + tia tốc độ — chỗ "nhân vật" như ảnh mẫu */}
          <div className="relative hidden h-32 w-32 shrink-0 sm:block">
            <SpeedLines className="inset-0 h-full w-full" />
            <Mascot name="hero" className="relative z-10 mx-auto h-32 w-32 drop-shadow-lg" />
          </div>
        </div>
        <Sparkles className="absolute inset-0" />
      </div>

      {/* Hàng thẻ tổng */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-sm text-slate-500">Tiền mặt</div>
          <div className="mt-1 text-2xl font-bold text-brand-500">{formatMoney(cashTotal)}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Đầu tư</div>
          <div className="mt-1 text-2xl font-bold text-amber-500">{formatMoney(investTotal, "USD")}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Sức khỏe tài chính (tháng)</div>
          <div className={`mt-1 text-2xl font-bold ${healthColor}`}>{health.label}</div>
        </Card>
      </div>

      {/* Cảnh báo ngân sách */}
      {budgetAlerts.length > 0 && (
        <Card className="mb-5">
          <div className="mb-2 font-semibold text-slate-700">⚠️ Cảnh báo ngân sách tháng này</div>
          <div className="space-y-2">
            {budgetAlerts.map((a) => {
              const over = a.ratio > 1;
              return (
                <div key={a.name} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    {a.icon} {a.name}
                  </span>
                  <span className={over ? "font-semibold text-red-500" : "text-amber-500"}>
                    {formatMoney(a.used)} / {formatMoney(a.limit)}{" "}
                    {over ? "— Vượt chi 🔴" : `— ${Math.round(a.ratio * 100)}%`}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Thu/chi tháng này */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-sm text-slate-500">Thu tháng này</div>
          <div className="mt-1 text-xl font-bold text-emerald-600">+{formatMoney(summary.income)}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Chi tháng này</div>
          <div className="mt-1 text-xl font-bold text-red-500">−{formatMoney(summary.expense)}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Còn lại (net)</div>
          <div className="mt-1 text-xl font-bold text-slate-800">{formatMoney(summary.net)}</div>
        </Card>
      </div>

      {/* Biểu đồ */}
      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 font-semibold text-slate-700">Chi tiêu theo danh mục (tháng này)</div>
          {byCategory.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Mascot name="empty" className="h-20 w-20 opacity-90" />
              <p className="mt-2 text-sm text-slate-400">Chưa có chi tiêu tháng này — thêm giao dịch nhé! ✨</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={90} label>
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatMoney(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <div className="mb-3 font-semibold text-slate-700">Thu / Chi 6 tháng gần đây</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trend}>
              <XAxis dataKey="month" fontSize={12} />
              <YAxis hide />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Legend />
              <Bar dataKey="Thu" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Chi" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Giao dịch gần đây */}
      <Card>
        <div className="mb-3 font-semibold text-slate-700">Giao dịch gần đây</div>
        {recent.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <Mascot name="happy" className="h-20 w-20" />
            <p className="mt-2 text-sm text-slate-400">
              Chưa có giao dịch nào. Bấm 📷 hoặc “+ Nhập tay” để bắt đầu!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {recent.map((t) => {
              const c = categories.find((x) => x.id === t.category_id);
              return (
                <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <span className="font-medium text-slate-700">
                      {c ? `${c.icon ?? ""} ${c.name}` : t.note || "Giao dịch"}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">{formatDate(t.occurred_at)}</span>
                  </div>
                  <span className={t.direction === "in" ? "text-emerald-600" : "text-red-500"}>
                    {t.direction === "in" ? "+" : "−"}
                    {formatMoney(Number(t.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}
