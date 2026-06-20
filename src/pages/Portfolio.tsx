import { useState } from "react";
import { useHoldings, useUpsertHolding, useDeleteHolding } from "../lib/queries";
import type { Holding } from "../types";
import { formatMoney } from "../lib/format";
import { PageHeader, Card, Button, Modal, Field, inputClass } from "../components/ui";

export default function Portfolio() {
  const { data: holdings = [], isLoading } = useHoldings();
  const upsert = useUpsertHolding();
  const del = useDeleteHolding();
  const [editing, setEditing] = useState<Partial<Holding> | null>(null);

  // Giá thị trường thời gian thực sẽ nối ở Phase 5 (Edge Function lấy giá).
  // Tạm dùng giá vốn để ước tính giá trị danh mục.
  const totalCost = holdings.reduce((s, h) => s + Number(h.quantity) * Number(h.avg_cost), 0);

  function openNew() {
    setEditing({ ticker: "", quantity: 0, avg_cost: 0, currency: "USD" });
  }

  async function save() {
    if (!editing?.ticker) return;
    await upsert.mutateAsync({ ...editing, ticker: editing.ticker.toUpperCase() });
    setEditing(null);
  }

  return (
    <>
      <PageHeader
        title="Danh mục cổ phiếu"
        action={<Button onClick={openNew}>+ Thêm mã</Button>}
      />

      <Card className="mb-5">
        <div className="text-sm text-slate-500">Tổng vốn đầu tư (theo giá vốn)</div>
        <div className="text-3xl font-bold text-emerald-600">{formatMoney(totalCost, "USD")}</div>
        <div className="mt-1 text-xs text-slate-400">
          * Giá thị trường thời gian thực sẽ được bổ sung ở giai đoạn sau.
        </div>
      </Card>

      {isLoading ? (
        <p className="text-slate-500">Đang tải…</p>
      ) : holdings.length === 0 ? (
        <p className="text-slate-500">Chưa có mã cổ phiếu nào.</p>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="pb-2">Mã</th>
                <th className="pb-2 text-right">SL</th>
                <th className="pb-2 text-right">Giá vốn</th>
                <th className="pb-2 text-right">Giá trị</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.id} className="border-t border-slate-100">
                  <td className="py-2 font-semibold text-slate-800">{h.ticker}</td>
                  <td className="py-2 text-right">{h.quantity}</td>
                  <td className="py-2 text-right">{formatMoney(Number(h.avg_cost), h.currency)}</td>
                  <td className="py-2 text-right font-medium">
                    {formatMoney(Number(h.quantity) * Number(h.avg_cost), h.currency)}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      className="mr-2 text-slate-500 hover:text-emerald-600"
                      onClick={() => setEditing(h)}
                    >
                      Sửa
                    </button>
                    <button
                      className="text-red-400 hover:text-red-600"
                      onClick={() => del.mutate(h.id)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Sửa mã" : "Thêm mã cổ phiếu"}
      >
        {editing && (
          <div className="space-y-3">
            <Field label="Mã cổ phiếu (ticker)">
              <input
                className={inputClass}
                value={editing.ticker ?? ""}
                onChange={(e) => setEditing({ ...editing, ticker: e.target.value })}
                placeholder="VD: AAPL, NVDA…"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Số lượng">
                <input
                  type="number"
                  className={inputClass}
                  value={editing.quantity ?? 0}
                  onChange={(e) => setEditing({ ...editing, quantity: Number(e.target.value) })}
                />
              </Field>
              <Field label="Giá vốn TB">
                <input
                  type="number"
                  className={inputClass}
                  value={editing.avg_cost ?? 0}
                  onChange={(e) => setEditing({ ...editing, avg_cost: Number(e.target.value) })}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Hủy
              </Button>
              <Button onClick={save} disabled={upsert.isPending}>
                Lưu
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
