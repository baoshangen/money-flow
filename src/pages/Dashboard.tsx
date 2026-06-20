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
import { useAccounts, useHoldings, useTransactions, useCategories } from "../lib/queries";
import { summarize, financialHealth } from "../lib/insights";
import { formatMoney, formatDate } from "../lib/format";
import { PageHeader, Card } from "../components/ui";
import ReceiptUpload from "../features/receipt-upload/ReceiptUpload";

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

function monthKey(iso: string) {
  return iso.slice(0, 7); // YYYY-MM
}

export default function Dashboard() {
  const { data: accounts = [] } = useAccounts();
  const { data: holdings = [] } = useHoldings();
  const { data: txs = [] } = useTransactions();
  const { data: categories = [] } = useCategories();

  const cashTotal = accounts.reduce((s, a) => s + Number(a.current_balance), 0);
  // Giá vốn tạm thay cho giá thị trường (Phase 5 sẽ nối giá realtime).
  const investTotal = holdings.reduce((s, h) => s + Number(h.quantity) * Number(h.avg_cost), 0);
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
      return { month: m.slice(5), "Thu": s.income, "Chi": s.expense };
    });
  }, [txs]);

  const recent = txs.slice(0, 6);
  const healthColor =
    health.tone === "good" ? "text-emerald-600" : health.tone === "ok" ? "text-amber-500" : "text-red-500";

  return (
    <>
      <PageHeader title="Tổng quan" action={<ReceiptUpload />} />

      {/* Hàng thẻ tổng */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="text-sm text-slate-500">Tài sản ròng</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{formatMoney(netWorth)}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Tiền mặt</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">{formatMoney(cashTotal)}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Đầu tư</div>
          <div className="mt-1 text-2xl font-bold text-blue-600">{formatMoney(investTotal, "USD")}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Sức khỏe tài chính (tháng)</div>
          <div className={`mt-1 text-2xl font-bold ${healthColor}`}>{health.label}</div>
          <div className="text-xs text-slate-400">
            Tiết kiệm {Math.round(health.savingsRate * 100)}%
          </div>
        </Card>
      </div>

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
            <p className="py-10 text-center text-sm text-slate-400">Chưa có chi tiêu tháng này.</p>
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
              <Bar dataKey="Thu" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Chi" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Giao dịch gần đây */}
      <Card>
        <div className="mb-3 font-semibold text-slate-700">Giao dịch gần đây</div>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có giao dịch nào.</p>
        ) : (
          <div className="divide-y divide-slate-100">
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
                  <span
                    className={t.direction === "in" ? "text-emerald-600" : "text-red-500"}
                  >
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
