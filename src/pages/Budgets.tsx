import { useMemo, useState } from "react";
import {
  useBudgets,
  useCategories,
  useTransactions,
  useUpsertBudget,
  useDeleteBudget,
} from "../lib/queries";
import { formatMoney } from "../lib/format";
import { PageHeader, Card, Button, Modal, Field, inputClass } from "../components/ui";

export default function Budgets() {
  const { data: budgets = [] } = useBudgets();
  const { data: categories = [] } = useCategories();
  const { data: txs = [] } = useTransactions();
  const upsert = useUpsertBudget();
  const del = useDeleteBudget();
  const [editCat, setEditCat] = useState<string | null>(null);
  const [limit, setLimit] = useState(0);

  const expenseCats = categories.filter((c) => c.type === "expense");
  const thisMonth = new Date().toISOString().slice(0, 7);

  // Chi tiêu tháng này theo category_id.
  const spentByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txs) {
      if (t.direction !== "out" || !t.category_id) continue;
      if (t.occurred_at.slice(0, 7) !== thisMonth) continue;
      m.set(t.category_id, (m.get(t.category_id) ?? 0) + Number(t.amount));
    }
    return m;
  }, [txs, thisMonth]);

  const budgetByCat = new Map(budgets.map((b) => [b.category_id, b]));

  function openEdit(catId: string) {
    setEditCat(catId);
    setLimit(Number(budgetByCat.get(catId)?.monthly_limit ?? 0));
  }

  async function save() {
    if (!editCat) return;
    await upsert.mutateAsync({ category_id: editCat, monthly_limit: limit, currency: "USD" });
    setEditCat(null);
  }

  return (
    <>
      <PageHeader title="Ngân sách tháng" />
      <p className="mb-4 text-sm text-slate-500">
        Đặt hạn mức chi tiêu mỗi danh mục. App sẽ cảnh báo khi bạn sắp/đã vượt.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {expenseCats.map((c) => {
          const b = budgetByCat.get(c.id);
          const spent = spentByCat.get(c.id) ?? 0;
          const lim = Number(b?.monthly_limit ?? 0);
          const pct = lim > 0 ? Math.min(100, (spent / lim) * 100) : 0;
          const over = lim > 0 && spent > lim;
          const near = lim > 0 && !over && spent / lim >= 0.8;
          const barColor = over ? "bg-red-500" : near ? "bg-amber-400" : "bg-brand-500";

          return (
            <Card key={c.id}>
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-800">
                  {c.icon ? `${c.icon} ` : ""}
                  {c.name}
                </div>
                <button
                  className="text-xs text-slate-500 hover:text-brand-500"
                  onClick={() => openEdit(c.id)}
                >
                  {b ? "Sửa hạn mức" : "+ Đặt hạn mức"}
                </button>
              </div>

              {lim > 0 ? (
                <>
                  <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-black/5">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className={over ? "font-semibold text-red-500" : "text-slate-500"}>
                      {formatMoney(spent)} / {formatMoney(lim)}
                    </span>
                    {over ? (
                      <span className="font-semibold text-red-500">Vượt chi! 🔴</span>
                    ) : near ? (
                      <span className="text-amber-500">Sắp chạm hạn mức ⚠️</span>
                    ) : (
                      <span className="text-emerald-500">Còn {formatMoney(lim - spent)}</span>
                    )}
                  </div>
                  {b && (
                    <button
                      className="mt-2 text-xs text-red-400 hover:text-red-600"
                      onClick={() => del.mutate(b.id)}
                    >
                      Xóa hạn mức
                    </button>
                  )}
                </>
              ) : (
                <div className="mt-3 text-xs text-slate-400">
                  Đã chi {formatMoney(spent)} tháng này — chưa đặt hạn mức.
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Modal open={!!editCat} onClose={() => setEditCat(null)} title="Đặt hạn mức tháng">
        <div className="space-y-3">
          <Field label="Hạn mức chi (USD/tháng)">
            <input
              type="number"
              className={inputClass}
              value={limit || ""}
              onChange={(e) => setLimit(Number(e.target.value))}
              placeholder="VD: 500"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditCat(null)}>
              Hủy
            </Button>
            <Button onClick={save} disabled={upsert.isPending}>
              Lưu
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
